/**
 * ============================================
 * ファイルパス: app/api/stores/update-is-open/route.ts
 * APIエンドポイント: /api/stores/update-is-open
 * * 機能: 営業状態更新API（Read-Through キャッシング）
 * * 【最適化】
 * - キャッシュ有効期間を60分に設定
 * - 優先度付き更新（近い店舗から順に）
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkIsOpenFromGooglePlaceId } from '@/lib/business-hours';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * キャッシュ有効期間（60分）
 * これが「100人中99人はAPIを叩かない」を実現する核となる定数
 */
const CACHE_TTL_MS = 60 * 60 * 1000;

const MANUAL_CLOSE_TTL_MS = 12 * 60 * 60 * 1000;
const DEFAULT_RADIUS_KM = 1.0;
const MAX_STORES_PER_REQUEST = 20;

function isCacheValid(lastCheckAt: string | null): boolean {
  if (!lastCheckAt) return false;
  const lastCheck = new Date(lastCheckAt).getTime();
  const now = Date.now();
  return (now - lastCheck) < CACHE_TTL_MS;
}

function isManualCloseExpired(manualClosedAt: string | null): boolean {
  if (!manualClosedAt) return true;
  const closedTime = new Date(manualClosedAt).getTime();
  const now = Date.now();
  return (now - closedTime) >= MANUAL_CLOSE_TTL_MS;
}

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function determineOpenStatusAndVacancy(
  googleIsOpen: boolean,
  manualClosed: boolean,
  currentVacancyStatus: string | null
): {
  isOpen: boolean;
  vacancyStatus: string;
  closedReason: 'manual' | 'business_hours' | null;
} {
  if (manualClosed) {
    return {
      isOpen: false,
      vacancyStatus: 'closed',
      closedReason: 'manual',
    };
  }

  if (!googleIsOpen) {
    return {
      isOpen: false,
      vacancyStatus: 'closed',
      closedReason: 'business_hours',
    };
  }

  const newVacancyStatus =
    currentVacancyStatus === 'closed' || !currentVacancyStatus
      ? 'open'
      : currentVacancyStatus;

  return {
    isOpen: true,
    vacancyStatus: newVacancyStatus,
    closedReason: null,
  };
}

interface StoreData {
  id: string;
  google_place_id: string;
  latitude: number | string | null;
  longitude: number | string | null;
  vacancy_status: string | null;
  last_is_open_check_at: string | null;
  is_open: boolean | null;
  manual_closed: boolean | null;
  closed_reason: string | null;
  manual_closed_at: string | null;
  updated_at: string | null;
}

interface StoreWithDistance extends StoreData {
  distance?: number;
}

async function clearManualClose(storeId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('stores')
    .update({
      manual_closed: false,
      closed_reason: null,
      manual_closed_at: null,
      last_is_open_check_at: null,
      updated_at: now,
    })
    .eq('id', storeId);

  if (error) {
    console.error(`Error clearing manual_close for store ${storeId}:`, error);
    return false;
  }
  console.log(`Manual close expired and cleared for store ${storeId}`);
  return true;
}

/**
 * 同一店舗に対して同時に複数リクエストが来た場合でも、Google Places API を叩くのは原則1回にするための
 * 楽観的ロック（Compare-And-Set）です。
 *
 * - キャッシュ切れのタイミングで大量同時アクセスが起きても、最初に「更新権」を獲得した1リクエストだけが
 *   last_is_open_check_at を now に進め、その後に Google API を叩きます。
 * - 他のリクエストは「更新中」とみなして Google API を叩かず、DB値を返します。
 */
async function tryClaimIsOpenRefresh(
  storeId: string,
  prevLastCheckAt: string | null,
  claimTimeIso: string
): Promise<boolean> {
  const q = supabase
    .from('stores')
    .update({
      // 先にタイムスタンプだけ進めて「更新権」を獲得する
      last_is_open_check_at: claimTimeIso,
      updated_at: claimTimeIso,
    })
    .eq('id', storeId);

  // null は eq できないので分岐
  const { data, error } = (prevLastCheckAt === null)
    ? await q.is('last_is_open_check_at', null).select('id')
    : await q.eq('last_is_open_check_at', prevLastCheckAt).select('id');

  if (error) {
    console.error(`Error claiming refresh lock for store ${storeId}:`, error);
    return false;
  }

  // 1行更新できた=ロック獲得。0行=他リクエストが先に獲得済み。
  return Array.isArray(data) && data.length > 0;
}


async function fetchLatestStore(storeId: string): Promise<StoreData | null> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .single();

  if (error || !data) return null;
  return data as StoreData;
}

/**
 * 方案A: forceUpdate=true のとき、他リクエストが更新権を獲得していた場合でも
 * ユーザー体験として「押したら最新化された結果」を返しやすくするために、短時間だけDB更新完了を待ちます。
 *
 * last_is_open_check_at は「更新権獲得時点」で先行更新されるため、
 * 実際の値（is_open / vacancy_status / closed_reason 等）の反映完了は updated_at の変化で検知します。
 */
async function waitForStoreUpdate(
  storeId: string,
  observedUpdatedAt: string | null,
  timeoutMs: number = 2500,
  intervalMs: number = 250
): Promise<StoreData | null> {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const latest = await fetchLatestStore(storeId);
    if (!latest) continue;

    if (latest.updated_at && latest.updated_at !== observedUpdatedAt) {
      return latest;
    }
  }

  return null;
}

async function updateSingleStore(
  store: StoreData,
  forceUpdate: boolean = false
): Promise<{
  storeId: string;
  isOpen: boolean;
  vacancyStatus: string;
  manualClosed: boolean;
  closedReason: 'manual' | 'business_hours' | null;
  fromCache: boolean;
  manualCloseExpired?: boolean;
} | null> {
  let manualClosed = store.manual_closed ?? false;

  if (manualClosed && isManualCloseExpired(store.manual_closed_at)) {
    const cleared = await clearManualClose(store.id);
    if (cleared) manualClosed = false;
  }

  if (manualClosed) {
    if (store.is_open === false && store.vacancy_status === 'closed') {
      return {
        storeId: store.id,
        isOpen: false,
        vacancyStatus: 'closed',
        manualClosed: true,
        closedReason: 'manual',
        fromCache: true,
      };
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('stores')
      .update({
        is_open: false,
        vacancy_status: 'closed',
        closed_reason: 'manual',
        updated_at: now,
      })
      .eq('id', store.id);

    if (error) return null;

    return {
      storeId: store.id,
      isOpen: false,
      vacancyStatus: 'closed',
      manualClosed: true,
      closedReason: 'manual',
      fromCache: false,
    };
  }

  // ★ここが核心部分: forceUpdateがなく、キャッシュが有効ならAPIを叩かずに即リターン
  if (!forceUpdate && isCacheValid(store.last_is_open_check_at)) {
    return {
      storeId: store.id,
      isOpen: store.is_open ?? false,
      vacancyStatus: store.vacancy_status ?? 'closed',
      manualClosed: false,
      closedReason: store.closed_reason as 'manual' | 'business_hours' | null,
      fromCache: true, // キャッシュ利用を明示
    };
  }

  // ★大量同時アクセス対策: キャッシュ切れ時でも Google API を叩くのは原則1回
  // 先に last_is_open_check_at を CAS 更新して「更新権」を獲得できたリクエストだけが Google API を叩く
  // （forceUpdate=true のときは常に更新権獲得を試みる）
  let claimTimeIso = new Date().toISOString();
  let claimed = await tryClaimIsOpenRefresh(store.id, store.last_is_open_check_at, claimTimeIso);

  // forceUpdate では「押したら必ず最新化」に寄せるため、
  // スナップショットが古くてCASに失敗した場合は、最新行を取り直してもう一度だけ獲得を試みる。
  if (!claimed && forceUpdate) {
    const latestForClaim = await fetchLatestStore(store.id);
    if (latestForClaim) {
      const retryClaimTimeIso = new Date().toISOString();
      const retryClaimed = await tryClaimIsOpenRefresh(
        store.id,
        latestForClaim.last_is_open_check_at,
        retryClaimTimeIso
      );

      if (retryClaimed) {
        claimTimeIso = retryClaimTimeIso;
        claimed = true;
      }
    }
  }

  if (!claimed) {
    // 他のリクエストが先に更新権を獲得している（または直前で更新された）
    // Google API は叩かず、最新のDB状態を返す。
    const latest = await fetchLatestStore(store.id);

    // 方案A: forceUpdate のときは短時間だけ更新完了を待ち、より新しい値を返す
    let waited: StoreData | null = null;
    if (forceUpdate) {
      const observed = latest?.updated_at ?? store.updated_at ?? null;
      waited = await waitForStoreUpdate(store.id, observed);
    }

    // 最新行が取れなければ、元の store から返す（最悪でも API は叩かない）
    const source = waited ?? latest ?? store;

    return {
      storeId: source.id,
      isOpen: source.is_open ?? false,
      vacancyStatus: source.vacancy_status ?? 'closed',
      manualClosed: source.manual_closed ?? false,
      closedReason: source.closed_reason as 'manual' | 'business_hours' | null,
      fromCache: true,
    };
  }

  try {
    // 更新権を獲得したリクエストのみ Google API を叩く
    const googleIsOpen = await checkIsOpenFromGooglePlaceId(store.google_place_id);

    if (googleIsOpen === null) {
      console.warn(`Failed to get opening hours for store ${store.id}`);

      // Google取得失敗時も claim を巻き戻し、次のforceUpdateで必ず再試行できるようにする
      try {
        const rollbackTime = new Date().toISOString();
        const { error: rollbackError } = await supabase
          .from('stores')
          .update({
            last_is_open_check_at: store.last_is_open_check_at,
            updated_at: rollbackTime,
          })
          .eq('id', store.id)
          .eq('last_is_open_check_at', claimTimeIso);

        if (rollbackError) {
          console.error(`Rollback failed for store ${store.id}:`, rollbackError);
        }
      } catch (e) {
        console.error(`Rollback exception for store ${store.id}:`, e);
      }

      return null;
    }

    const { isOpen, vacancyStatus, closedReason } = determineOpenStatusAndVacancy(
      googleIsOpen,
      manualClosed,
      store.vacancy_status
    );

    // claimTimeIso を last_is_open_check_at としてすでに書き込んでいるため、ここでは上書きしない。
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('stores')
      .update({
        is_open: isOpen,
        vacancy_status: vacancyStatus,
        closed_reason: closedReason,
        updated_at: now,
      })
      .eq('id', store.id);

    if (error) return null;

    return {
      storeId: store.id,
      isOpen,
      vacancyStatus,
      manualClosed: false,
      closedReason,
      fromCache: false,
    };
  } catch (error) {
    console.error(`Error processing store ${store.id}:`, error);

    // 失敗時はロック（last_is_open_check_at の先行更新）を巻き戻し、次のリクエストで再試行できるようにする
    try {
      const rollbackTime = new Date().toISOString();
      const { error: rollbackError } = await supabase
        .from('stores')
        .update({
          last_is_open_check_at: store.last_is_open_check_at,
          updated_at: rollbackTime,
        })
        .eq('id', store.id)
        // 自分が獲得した claim のみ戻す（他の更新を巻き込まない）
        .eq('last_is_open_check_at', claimTimeIso);

      if (rollbackError) {
        console.error(`Rollback failed for store ${store.id}:`, rollbackError);
      }
    } catch (e) {
      console.error(`Rollback exception for store ${store.id}:`, e);
    }

    return null;
  }
}

function filterAndSortByDistance(
  stores: StoreData[],
  userLat: number,
  userLng: number,
  radiusKm: number
): StoreWithDistance[] {
  const storesWithDistance: StoreWithDistance[] = stores
    .map((store) => {
      const lat = Number(store.latitude);
      const lng = Number(store.longitude);

      if (isNaN(lat) || isNaN(lng)) {
        return { ...store, distance: Infinity };
      }

      const distance = calculateDistance(userLat, userLng, lat, lng);
      return { ...store, distance };
    })
    .filter((store) => store.distance !== undefined && store.distance <= radiusKm)
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

  return storesWithDistance;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      storeId,
      forceUpdate = false,
      userLat,
      userLng,
      radiusKm = DEFAULT_RADIUS_KM,
    } = body;

    if (storeId) {
      const { data: store, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (error || !store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });
      if (!store.google_place_id) return NextResponse.json({ error: 'Google Place ID not found' }, { status: 400 });

      const result = await updateSingleStore(store as StoreData, forceUpdate);
      if (!result) return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });

      return NextResponse.json({ success: true, ...result, cacheTTL: CACHE_TTL_MS });
    }

    const { data: stores, error } = await supabase
      .from('stores')
      .select('*')
      .not('google_place_id', 'is', null);

    if (error) return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
    if (!stores || stores.length === 0) return NextResponse.json({ success: true, updated: 0, message: 'No stores found' });

    let targetStores: StoreWithDistance[] = stores as StoreWithDistance[];

    if (userLat !== undefined && userLng !== undefined) {
      targetStores = filterAndSortByDistance(stores as StoreData[], userLat, userLng, radiusKm);
      console.log(`Filtered stores by distance: ${targetStores.length} within ${radiusKm}km`);
    }

    const limitedStores = targetStores.slice(0, MAX_STORES_PER_REQUEST);

    // ★重要: キャッシュが有効な店舗をフィルタリングして除外する（APIコスト削減）
    // forceUpdateがfalseなら、キャッシュ切れの店舗だけが更新対象になる
    const storesToUpdate = forceUpdate
      ? limitedStores
      : limitedStores.filter((store) => !isCacheValid(store.last_is_open_check_at));

    console.log(`Stores to update: ${storesToUpdate.length} (skipped ${limitedStores.length - storesToUpdate.length} cached)`);

    const updatePromises = storesToUpdate.map((store) => updateSingleStore(store as StoreData, forceUpdate));
    const results = await Promise.all(updatePromises);
    const successful = results.filter((r) => r !== null);

    // キャッシュ済みの店舗情報もレスポンスには含めておく（クライアント側の整合性のため）
    const cachedStores = limitedStores
      .filter((store) => !forceUpdate && isCacheValid(store.last_is_open_check_at))
      .map((store) => ({
        storeId: store.id,
        isOpen: store.is_open ?? false,
        vacancyStatus: store.vacancy_status ?? 'closed',
        manualClosed: store.manual_closed ?? false,
        closedReason: store.closed_reason as 'manual' | 'business_hours' | null,
        fromCache: true,
        distance: store.distance,
      }));

    return NextResponse.json({
      success: true,
      total: stores.length,
      filtered: targetStores.length,
      updated: successful.length,
      cached: cachedStores.length,
      radiusKm: userLat !== undefined ? radiusKm : null,
      results: [...successful, ...cachedStores],
      cacheTTL: CACHE_TTL_MS,
    });
  } catch (error) {
    console.error('Error in update-is-open API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}