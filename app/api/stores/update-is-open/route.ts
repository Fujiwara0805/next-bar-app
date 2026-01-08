/**
 * ============================================
 * ファイルパス: app/api/stores/update-is-open/route.ts
 * APIエンドポイント: /api/stores/update-is-open
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
 * キャッシュ有効期間（30分）
 */
const CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * 臨時休業の自動解除時間（12時間）
 */
const MANUAL_CLOSE_TTL_MS = 12 * 60 * 60 * 1000;

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
  if (!manualClosedAt) return true; // タイムスタンプがなければ期限切れとみなす
  const closedTime = new Date(manualClosedAt).getTime();
  const now = Date.now();
  return (now - closedTime) >= MANUAL_CLOSE_TTL_MS;
}

/**
 * 営業状態とvacancy_statusを決定
 * * 【ルール】
 * 1. manual_closed=trueなら、API結果を無視して closed にする。
 * 2. manual_closed=falseなら、Google APIの結果に従う。
 * 3. 営業中(isOpen=true)の場合、closed_reasonは必ず null にする。
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
  // 現在が 'closed' または null の場合は 'open' に設定し、それ以外（'vacant'、'full'など）は維持する
  const newVacancyStatus = 
    (currentVacancyStatus === 'closed' || !currentVacancyStatus)
      ? 'open'
      : currentVacancyStatus;

  return {
    isOpen: true,
    vacancyStatus: newVacancyStatus,
    closedReason: null, // 営業中は理由は不要
  };
}

interface StoreData {
  id: string;
  google_place_id: string;
  vacancy_status: string | null;
  last_is_open_check_at: string | null;
  is_open: boolean | null;
  manual_closed: boolean | null;
  closed_reason: string | null;
  manual_closed_at: string | null;
}

/**
 * 臨時休業を解除する
 * closed_reason を null にすることが重要
 */
async function clearManualClose(storeId: string): Promise<boolean> {
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from('stores')
    .update({
      manual_closed: false,
      closed_reason: null, // 【重要】nullに設定
      manual_closed_at: null,
      // キャッシュをクリアして即座にAPI同期を促す
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
    
    // DB状態の整合性を取る（手動閉店中なのに is_open=true 等になっている場合）
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

  // キャッシュが有効ならスキップ
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { storeId, forceUpdate = false } = body;

    // 特定の店舗を更新
    if (storeId) {
      const { data: store, error: fetchError } = await supabase
        .from('stores')
        .select('id, google_place_id, vacancy_status, last_is_open_check_at, is_open, manual_closed, closed_reason, manual_closed_at')
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

    // 全店舗を更新
    const { data: stores, error: fetchError } = await supabase
      .from('stores')
      .select('id, google_place_id, vacancy_status, last_is_open_check_at, is_open, manual_closed, closed_reason, manual_closed_at')
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

    const updatePromises = stores.map((store) => 
      updateSingleStore(store as StoreData, forceUpdate)
    );

    const results = await Promise.all(updatePromises);
    const successful = results.filter((r) => r !== null);
    
    return NextResponse.json({
      success: true,
      total: stores.length,
      successful: successful.length,
      results: successful,
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
      .select('id, google_place_id, vacancy_status, last_is_open_check_at, is_open, manual_closed, closed_reason, manual_closed_at')
      .eq('id', storeId)
      .single();

    if (fetchError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const result = await updateSingleStore(store as StoreData, forceUpdate);

    if (!result) {
      return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error in GET update-is-open API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}