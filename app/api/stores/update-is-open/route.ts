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
 * is_openの値に基づいてvacancy_statusを決定
 */
function determineVacancyStatus(
  isOpen: boolean,
  currentVacancyStatus: string | null
): string {
  if (!isOpen) {
    return 'closed';
  }

  if (currentVacancyStatus === 'closed' || !currentVacancyStatus) {
    return 'vacant';
  }

  return currentVacancyStatus;
}

/**
 * 単一店舗のis_openを更新（キャッシュ考慮）
 */
async function updateSingleStore(
  store: { 
    id: string; 
    google_place_id: string; 
    vacancy_status: string | null;
    last_is_open_check_at: string | null;
    is_open: boolean | null;
  },
  forceUpdate: boolean = false
): Promise<{
  storeId: string;
  isOpen: boolean;
  vacancyStatus: string;
  fromCache: boolean;
} | null> {
  
  // キャッシュが有効かつ強制更新でない場合はスキップ
  if (!forceUpdate && isCacheValid(store.last_is_open_check_at)) {
    return {
      storeId: store.id,
      isOpen: store.is_open ?? false,
      vacancyStatus: store.vacancy_status ?? 'closed',
      fromCache: true,
    };
  }

  try {
    // Google Maps APIを呼び出し
    const isOpen = await checkIsOpenFromGooglePlaceId(store.google_place_id);

    if (isOpen === null) {
      console.warn(`Failed to get opening hours for store ${store.id}`);
      return null;
    }

    const newVacancyStatus = determineVacancyStatus(isOpen, store.vacancy_status);
    const now = new Date().toISOString();

    // DBを更新（キャッシュタイムスタンプも更新）
    const { error } = await supabase
      .from('stores')
      .update({
        is_open: isOpen,
        vacancy_status: newVacancyStatus,
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
      vacancyStatus: newVacancyStatus,
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
        .select('id, google_place_id, vacancy_status, last_is_open_check_at, is_open')
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

      const result = await updateSingleStore(store, forceUpdate);

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
      .select('id, google_place_id, vacancy_status, last_is_open_check_at, is_open')
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
        message: 'No stores with google_place_id found',
      });
    }

    // 各店舗を並列で更新
    const updatePromises = stores.map((store) => 
      updateSingleStore(store, forceUpdate)
    );

    const results = await Promise.all(updatePromises);
    const successful = results.filter((r) => r !== null);
    const fromCache = successful.filter((r) => r?.fromCache).length;
    const apiCalls = successful.filter((r) => !r?.fromCache).length;

    return NextResponse.json({
      success: true,
      total: stores.length,
      updated: apiCalls,
      fromCache: fromCache,
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
      .select('id, google_place_id, vacancy_status, last_is_open_check_at, is_open')
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

    const result = await updateSingleStore(store, forceUpdate);

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