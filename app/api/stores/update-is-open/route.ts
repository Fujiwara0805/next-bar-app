/**
 * ============================================
 * ファイルパス: app/api/stores/update-is-open/route.ts
 * APIエンドポイント: /api/stores/update-is-open
 * 
 * 【最適化】
 * - キャッシュ有効期間を60分に延長
 * - 現在地からの距離ベースフィルタリング対応
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
 * キャッシュ有効期間（60分）- コスト削減のため30分から延長
 */
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * 臨時休業の自動解除時間（12時間）
 */
const MANUAL_CLOSE_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * デフォルトの検索半径（km）
 */
const DEFAULT_RADIUS_KM = 1.0;

/**
 * 最大同時更新店舗数（API呼び出し制限）
 */
const MAX_STORES_PER_REQUEST = 20;

/**
 * キャッシュが有効かどうかを判定
 */
function isCacheValid(lastCheckAt: string | null): boolean {
  if (!lastCheckAt) return false;
  const lastCheck = new Date(lastCheckAt).getTime();
  const now = Date.now();
  return (now - lastCheck) < CACHE_TTL_MS;
}

/**
 * 臨時休業が有効期限切れかどうかを判定
 */
function isManualCloseExpired(manualClosedAt: string | null): boolean {
  if (!manualClosedAt) return true;
  const closedTime = new Date(manualClosedAt).getTime();
  const now = Date.now();
  return (now - closedTime) >= MANUAL_CLOSE_TTL_MS;
}

/**
 * 2点間の距離を計算（Haversine公式）
 * @returns 距離（km）
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // 地球の半径（km）
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

/**
 * 営業状態とvacancy_statusを決定
 */
function determineOpenStatusAndVacancy(
  googleIsOpen: boolean,
  manualClosed: boolean,
  currentVacancyStatus: string | null
): {
  isOpen: boolean;
  vacancyStatus: string;
  closedReason: 'manual' | 'business_hours' | null;
} {
  // 1. 手動で臨時休業の場合
  if (manualClosed) {
    return {
      isOpen: false,
      vacancyStatus: 'closed',
      closedReason: 'manual',
    };
  }

  // 2. Google APIで「営業時間外」の場合
  if (!googleIsOpen) {
    return {
      isOpen: false,
      vacancyStatus: 'closed',
      closedReason: 'business_hours',
    };
  }

  // 3. 営業中の場合
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
}

interface StoreWithDistance extends StoreData {
  distance?: number;
}

/**
 * 臨時休業を解除する
 */
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
 * 単一店舗のis_openを更新
 */
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

  // 臨時休業が12時間経過していたら自動解除
  if (manualClosed && isManualCloseExpired(store.manual_closed_at)) {
    const cleared = await clearManualClose(store.id);
    if (cleared) {
      manualClosed = false;
    }
  }

  // 臨時休業中（12時間以内）の場合は、Google Maps APIを呼ばずに即座にclosedを返す
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

    if (error) {
      console.error(`Error updating manual_closed store ${store.id}:`, error);
      return null;
    }

    return {
      storeId: store.id,
      isOpen: false,
      vacancyStatus: 'closed',
      manualClosed: true,
      closedReason: 'manual',
      fromCache: false,
    };
  }

  // キャッシュが有効ならスキップ（API呼び出し削減）
  if (!forceUpdate && isCacheValid(store.last_is_open_check_at)) {
    return {
      storeId: store.id,
      isOpen: store.is_open ?? false,
      vacancyStatus: store.vacancy_status ?? 'closed',
      manualClosed: false,
      closedReason: store.closed_reason as 'manual' | 'business_hours' | null,
      fromCache: true,
    };
  }

  try {
    const googleIsOpen = await checkIsOpenFromGooglePlaceId(store.google_place_id);

    if (googleIsOpen === null) {
      console.warn(`Failed to get opening hours for store ${store.id}`);
      return null;
    }

    const { isOpen, vacancyStatus, closedReason } = determineOpenStatusAndVacancy(
      googleIsOpen,
      manualClosed,
      store.vacancy_status
    );

    const now = new Date().toISOString();

    const { error } = await supabase
      .from('stores')
      .update({
        is_open: isOpen,
        vacancy_status: vacancyStatus,
        closed_reason: closedReason,
        last_is_open_check_at: now,
        updated_at: now,
      })
      .eq('id', store.id);

    if (error) {
      console.error(`Error updating store ${store.id}:`, error);
      return null;
    }

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
    return null;
  }
}

/**
 * 店舗を距離でフィルタリングしてソート
 */
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

    // 特定の店舗を更新
    if (storeId) {
      const { data: store, error: fetchError } = await supabase
        .from('stores')
        .select(
          'id, google_place_id, latitude, longitude, vacancy_status, last_is_open_check_at, is_open, manual_closed, closed_reason, manual_closed_at'
        )
        .eq('id', storeId)
        .single();

      if (fetchError || !store) {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 });
      }

      if (!store.google_place_id) {
        return NextResponse.json({ error: 'Google Place ID not found' }, { status: 400 });
      }

      const result = await updateSingleStore(store as StoreData, forceUpdate);

      if (!result) {
        return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        ...result,
        cacheTTL: CACHE_TTL_MS,
      });
    }

    // 全店舗または距離ベースで更新
    const { data: stores, error: fetchError } = await supabase
      .from('stores')
      .select(
        'id, google_place_id, latitude, longitude, vacancy_status, last_is_open_check_at, is_open, manual_closed, closed_reason, manual_closed_at'
      )
      .not('google_place_id', 'is', null);

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
    }

    if (!stores || stores.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        message: 'No stores with google_place_id found',
      });
    }

    let targetStores: StoreWithDistance[] = stores as StoreWithDistance[];

    // 現在地が指定されている場合は距離でフィルタリング
    if (userLat !== undefined && userLng !== undefined) {
      targetStores = filterAndSortByDistance(
        stores as StoreData[],
        userLat,
        userLng,
        radiusKm
      );

      console.log(
        `Filtered stores by distance: ${targetStores.length} within ${radiusKm}km`
      );
    }

    // API呼び出し制限のため最大数を制限
    const limitedStores = targetStores.slice(0, MAX_STORES_PER_REQUEST);

    // キャッシュが有効な店舗をスキップしてAPI呼び出しを削減
    const storesToUpdate = forceUpdate
      ? limitedStores
      : limitedStores.filter((store) => !isCacheValid(store.last_is_open_check_at));

    console.log(
      `Stores to update: ${storesToUpdate.length} (skipped ${limitedStores.length - storesToUpdate.length} cached)`
    );

    const updatePromises = storesToUpdate.map((store) =>
      updateSingleStore(store as StoreData, forceUpdate)
    );

    const results = await Promise.all(updatePromises);
    const successful = results.filter((r) => r !== null);

    // キャッシュから返した店舗の情報も含める
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const forceUpdate = searchParams.get('forceUpdate') === 'true';

    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    const { data: store, error: fetchError } = await supabase
      .from('stores')
      .select(
        'id, google_place_id, latitude, longitude, vacancy_status, last_is_open_check_at, is_open, manual_closed, closed_reason, manual_closed_at'
      )
      .eq('id', storeId)
      .single();

    if (fetchError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // キャッシュが有効な場合はAPI呼び出しをスキップ
    if (!forceUpdate && isCacheValid(store.last_is_open_check_at)) {
      return NextResponse.json({
        success: true,
        storeId: store.id,
        isOpen: store.is_open ?? false,
        vacancyStatus: store.vacancy_status ?? 'closed',
        manualClosed: store.manual_closed ?? false,
        closedReason: store.closed_reason,
        fromCache: true,
        cacheTTL: CACHE_TTL_MS,
      });
    }

    const result = await updateSingleStore(store as StoreData, forceUpdate);

    if (!result) {
      return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ...result,
      cacheTTL: CACHE_TTL_MS,
    });
  } catch (error) {
    console.error('Error in GET update-is-open API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
