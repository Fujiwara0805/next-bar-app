/**
 * ============================================
 * ファイルパス: app/api/stores/update-is-open/route.ts
 * APIエンドポイント: /api/stores/update-is-open
 * 
 * 機能: Google Maps APIから営業時間を取得し、
 *       is_openとvacancy_statusを更新する
 * 
 * 【最適化】
 * - キャッシュ機構を導入し、一定期間内はAPI呼び出しをスキップ
 * - Place Details APIの消費量を大幅に削減
 * 
 * 【v2: 臨時休業対応】
 * - manual_closed フラグによる強制閉店機能を追加
 * - manual_closed が true の場合、Google Maps APIの結果に関わらず
 *   is_open: false, vacancy_status: 'closed' を維持
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
 * キャッシュ有効期間（ミリ秒）
 * 30分 = 1800000ms
 * 営業時間は頻繁に変わらないため、30分キャッシュで十分
 */
const CACHE_TTL_MS = 30 * 60 * 1000;

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
 * 営業状態とvacancy_statusを決定
 * 
 * 【優先順位】
 * 1. manual_closed === true → is_open: false, vacancy_status: 'closed'
 * 2. manual_closed === false → Google Maps APIの結果に従う
 * 
 * @param googleIsOpen - Google Maps APIから取得した営業状態
 * @param manualClosed - 店主が設定した臨時休業フラグ
 * @param currentVacancyStatus - 現在のvacancy_status
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
  // 【優先1】臨時休業フラグが有効な場合
  if (manualClosed) {
    return {
      isOpen: false,
      vacancyStatus: 'closed',
      closedReason: 'manual', // 臨時休業による閉店
    };
  }

  // 【優先2】Google Maps APIの営業状態に従う
  if (!googleIsOpen) {
    return {
      isOpen: false,
      vacancyStatus: 'closed',
      closedReason: 'business_hours', // 営業時間外による閉店
    };
  }

  // 営業中の場合
  // 現在のvacancy_statusが 'closed' または未設定なら 'vacant' に
  const newVacancyStatus = 
    (currentVacancyStatus === 'closed' || !currentVacancyStatus)
      ? 'vacant'
      : currentVacancyStatus;

  return {
    isOpen: true,
    vacancyStatus: newVacancyStatus,
    closedReason: null,
  };
}

/**
 * 店舗データの型定義
 */
interface StoreData {
  id: string;
  google_place_id: string;
  vacancy_status: string | null;
  last_is_open_check_at: string | null;
  is_open: boolean | null;
  manual_closed: boolean | null;
  closed_reason: string | null;
}

/**
 * 単一店舗のis_openを更新（キャッシュ考慮 + 臨時休業対応）
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
} | null> {
  
  const manualClosed = store.manual_closed ?? false;
  
  // 【重要】臨時休業中の場合は、Google Maps APIを呼ばずに即座にclosedを返す
  // これによりAPI消費を節約しつつ、手動設定が上書きされることを防ぐ
  if (manualClosed) {
    // DBの状態が既に正しければ更新不要
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
    
    // 状態が不整合なら修正
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

  // キャッシュが有効かつ強制更新でない場合はスキップ
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
    // Google Maps APIを呼び出し
    const googleIsOpen = await checkIsOpenFromGooglePlaceId(store.google_place_id);

    if (googleIsOpen === null) {
      console.warn(`Failed to get opening hours for store ${store.id}`);
      return null;
    }

    // 営業状態を決定
    const { isOpen, vacancyStatus, closedReason } = determineOpenStatusAndVacancy(
      googleIsOpen,
      manualClosed,
      store.vacancy_status
    );

    const now = new Date().toISOString();

    // DBを更新（キャッシュタイムスタンプも更新）
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
 * POST /api/stores/update-is-open
 * Body: { 
 *   storeId?: string,      // 特定店舗のみ更新
 *   forceUpdate?: boolean  // キャッシュを無視して強制更新
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { storeId, forceUpdate = false } = body;

    // 特定の店舗を更新する場合
    if (storeId) {
      const { data: store, error: fetchError } = await supabase
        .from('stores')
        .select('id, google_place_id, vacancy_status, last_is_open_check_at, is_open, manual_closed, closed_reason')
        .eq('id', storeId)
        .single();

      if (fetchError || !store) {
        return NextResponse.json(
          { error: 'Store not found' },
          { status: 404 }
        );
      }

      if (!store.google_place_id) {
        return NextResponse.json(
          { error: 'Google Place ID not found for this store' },
          { status: 400 }
        );
      }

      const result = await updateSingleStore(store as StoreData, forceUpdate);

      if (!result) {
        return NextResponse.json(
          { error: 'Failed to update store' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        ...result,
        cacheTTL: CACHE_TTL_MS,
      });
    }

    // 全店舗を更新する場合
    const { data: stores, error: fetchError } = await supabase
      .from('stores')
      .select('id, google_place_id, vacancy_status, last_is_open_check_at, is_open, manual_closed, closed_reason')
      .not('google_place_id', 'is', null);

    if (fetchError) {
      console.error('Error fetching stores:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch stores' },
        { status: 500 }
      );
    }

    if (!stores || stores.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        fromCache: 0,
        manualClosed: 0,
        message: 'No stores with google_place_id found',
      });
    }

    // 各店舗を並列で更新
    const updatePromises = stores.map((store) => 
      updateSingleStore(store as StoreData, forceUpdate)
    );

    const results = await Promise.all(updatePromises);
    const successful = results.filter((r) => r !== null);
    const fromCache = successful.filter((r) => r?.fromCache).length;
    const apiCalls = successful.filter((r) => !r?.fromCache && !r?.manualClosed).length;
    const manualClosedCount = successful.filter((r) => r?.manualClosed).length;

    return NextResponse.json({
      success: true,
      total: stores.length,
      updated: apiCalls,
      fromCache: fromCache,
      manualClosed: manualClosedCount,
      failed: stores.length - successful.length,
      cacheTTL: CACHE_TTL_MS,
      results: successful,
    });
  } catch (error) {
    console.error('Error in update-is-open API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stores/update-is-open?storeId=xxx&forceUpdate=true
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const forceUpdate = searchParams.get('forceUpdate') === 'true';

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId parameter is required' },
        { status: 400 }
      );
    }

    const { data: store, error: fetchError } = await supabase
      .from('stores')
      .select('id, google_place_id, vacancy_status, last_is_open_check_at, is_open, manual_closed, closed_reason')
      .eq('id', storeId)
      .single();

    if (fetchError || !store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    if (!store.google_place_id) {
      return NextResponse.json(
        { error: 'Google Place ID not found for this store' },
        { status: 400 }
      );
    }

    const result = await updateSingleStore(store as StoreData, forceUpdate);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to update store' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ...result,
      cacheTTL: CACHE_TTL_MS,
    });
  } catch (error) {
    console.error('Error in update-is-open API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}