/**
 * ============================================
 * ファイルパス: app/api/stores/update-is-open/route.ts
 * APIエンドポイント: /api/stores/update-is-open
 * 
 * 機能: Google Maps APIから営業時間を取得し、
 *       is_openとvacancy_statusを更新する
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

// Anonymous Keyを使用してアクセス
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * is_openの値に基づいてvacancy_statusを決定
 * @param isOpen 営業中かどうか
 * @param currentVacancyStatus 現在のvacancy_status
 * @returns 新しいvacancy_status
 */
function determineVacancyStatus(
  isOpen: boolean,
  currentVacancyStatus: string | null
): string {
  if (!isOpen) {
    // 営業時間外の場合は必ずclosedに設定
    return 'closed';
  }

  // 営業中の場合
  if (currentVacancyStatus === 'closed' || !currentVacancyStatus) {
    // 現在closedまたは未設定の場合はvacantをデフォルトに設定
    return 'vacant';
  }

  // それ以外（vacant, moderate, full）はお店側の設定を維持
  return currentVacancyStatus;
}

/**
 * 全店舗または特定の店舗のis_openとvacancy_statusを更新
 * POST /api/stores/update-is-open
 * Body: { storeId?: string } (storeIdが指定されない場合は全店舗を更新)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { storeId } = body;

    // 特定の店舗を更新する場合
    if (storeId) {
      const { data: store, error: fetchError } = await supabase
        .from('stores')
        .select('id, google_place_id, vacancy_status')
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

      // Google Maps APIから営業時間を取得してis_openを判定
      const isOpen = await checkIsOpenFromGooglePlaceId(store.google_place_id);

      if (isOpen === null) {
        return NextResponse.json(
          { error: 'Failed to get opening hours from Google Maps API' },
          { status: 500 }
        );
      }

      // vacancy_statusを決定
      const newVacancyStatus = determineVacancyStatus(isOpen, store.vacancy_status);

      // is_openとvacancy_statusを更新
      const { error: updateError } = await supabase
        .from('stores')
        .update({
          is_open: isOpen,
          vacancy_status: newVacancyStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', storeId);

      if (updateError) {
        console.error('Error updating is_open:', updateError);
        return NextResponse.json(
          { error: 'Failed to update is_open' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        storeId: storeId,
        isOpen: isOpen,
        vacancyStatus: newVacancyStatus,
      });
    }

    // 全店舗を更新する場合
    const { data: stores, error: fetchError } = await supabase
      .from('stores')
      .select('id, google_place_id, vacancy_status')
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
        message: 'No stores with google_place_id found',
      });
    }

    // 各店舗のis_openとvacancy_statusを更新
    const updatePromises = stores.map(async (store) => {
      if (!store.google_place_id) {
        return null;
      }

      try {
        const isOpen = await checkIsOpenFromGooglePlaceId(store.google_place_id);

        if (isOpen === null) {
          console.warn(`Failed to get opening hours for store ${store.id}`);
          return null;
        }

        // vacancy_statusを決定
        const newVacancyStatus = determineVacancyStatus(isOpen, store.vacancy_status);

        const { error } = await supabase
          .from('stores')
          .update({
            is_open: isOpen,
            vacancy_status: newVacancyStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', store.id);

        if (error) {
          console.error(`Error updating store ${store.id}:`, error);
          return null;
        }

        return { storeId: store.id, isOpen, vacancyStatus: newVacancyStatus };
      } catch (error) {
        console.error(`Error processing store ${store.id}:`, error);
        return null;
      }
    });

    const results = await Promise.all(updatePromises);
    const successful = results.filter((r) => r !== null);

    return NextResponse.json({
      success: true,
      updated: successful.length,
      total: stores.length,
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
 * GET /api/stores/update-is-open?storeId=xxx
 * 特定の店舗のis_openとvacancy_statusを更新（GETでも対応）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId parameter is required' },
        { status: 400 }
      );
    }

    const { data: store, error: fetchError } = await supabase
      .from('stores')
      .select('id, google_place_id, vacancy_status')
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

    // Google Maps APIから営業時間を取得してis_openを判定
    const isOpen = await checkIsOpenFromGooglePlaceId(store.google_place_id);

    if (isOpen === null) {
      return NextResponse.json(
        { error: 'Failed to get opening hours from Google Maps API' },
        { status: 500 }
      );
    }

    // vacancy_statusを決定
    const newVacancyStatus = determineVacancyStatus(isOpen, store.vacancy_status);

    // is_openとvacancy_statusを更新
    const { error: updateError } = await supabase
      .from('stores')
      .update({
        is_open: isOpen,
        vacancy_status: newVacancyStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storeId);

    if (updateError) {
      console.error('Error updating is_open:', updateError);
      return NextResponse.json(
        { error: 'Failed to update is_open' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      storeId: storeId,
      isOpen: isOpen,
      vacancyStatus: newVacancyStatus,
    });
  } catch (error) {
    console.error('Error in update-is-open API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}