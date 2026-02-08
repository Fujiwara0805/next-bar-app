'use server';

// ============================================
// ボーナスクリック記録のサーバーアクション
// lib/actions/bonus-click.ts
// ============================================

import { headers } from 'next/headers';
import {
  RecordBonusClickRequest,
  RecordBonusClickResponse,
  recordBonusClickSchema,
  BonusClickStats,
  BonusClickType,
} from '@/lib/types/bonus-click';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * ボーナスクリックを記録するサーバーアクション
 * クーポン使用完了画面での「追加特典ボタン」クリックを計測
 */
export async function recordBonusClick(
  request: RecordBonusClickRequest
): Promise<RecordBonusClickResponse> {
  try {
    const supabase = createServerSupabaseClient();
    
    // バリデーション
    const validationResult = recordBonusClickSchema.safeParse(request);
    
    if (!validationResult.success) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: validationResult.error.errors[0]?.message || '入力値が不正です',
      };
    }

    const validatedData = validationResult.data;

    // ヘッダーから追加情報を取得
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') || undefined;
    const referrer = headersList.get('referer') || undefined;

    // ボーナスクリックを記録
    const { data: clickData, error: insertError } = await supabase
      .from('bonus_clicks')
      .insert({
        store_id: validatedData.storeId,
        coupon_usage_id: validatedData.couponUsageId || null,
        click_type: validatedData.clickType,
        session_id: validatedData.sessionId,
        user_agent: userAgent,
        referrer: referrer,
        // 詳細データ（どのボーナスが使用されたかのスナップショット）
        store_name: validatedData.storeName || null,
        instagram_url: validatedData.instagramUrl || null,
        google_place_id: validatedData.googlePlaceId || null,
        additional_bonus_text: validatedData.additionalBonusText || null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Insert bonus click error:', insertError);
      // テーブルが存在しない場合のエラーハンドリング
      if (insertError.code === '42P01') {
        console.warn('bonus_clicks table does not exist yet. Skipping recording.');
        return {
          success: true, // UXを損なわないよう成功として返す
          message: 'Recording skipped (table not ready)',
        };
      }
      // RLS権限エラーの場合もUXを損なわないよう成功として返す
      if (insertError.code === '42501') {
        console.warn('RLS policy violation for bonus_clicks. Skipping recording. Please check RLS policies or SUPABASE_SERVICE_ROLE_KEY.');
        return {
          success: true, // UXを損なわないよう成功として返す
          message: 'Recording skipped (permission issue)',
        };
      }
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: 'クリック記録に失敗しました',
      };
    }

    return {
      success: true,
      clickId: clickData?.id,
    };
  } catch (error) {
    console.error('Record bonus click error:', error);
    return {
      success: false,
      error: 'UNKNOWN_ERROR',
      message: '予期せぬエラーが発生しました',
    };
  }
}

/**
 * 店舗のボーナスクリック統計を取得
 * @param storeId 店舗ID
 * @param startDate 集計開始日（オプション）
 * @param endDate 集計終了日（オプション）
 * @param couponUsagesCount 同期間のクーポン利用数（レート計算用）
 */
export async function getBonusClickStats(
  storeId: string,
  startDate?: string,
  endDate?: string,
  couponUsagesCount?: number
): Promise<{ success: boolean; data?: BonusClickStats; error?: string }> {
  try {
    const supabase = createServerSupabaseClient();
    
    let query = supabase
      .from('bonus_clicks')
      .select('*')
      .eq('store_id', storeId)
      .order('clicked_at', { ascending: false });

    if (startDate) {
      query = query.gte('clicked_at', startDate);
    }
    if (endDate) {
      query = query.lte('clicked_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      // テーブルが存在しない場合
      if (error.code === '42P01') {
        return {
          success: true,
          data: {
            totalClicks: 0,
            instagramClicks: 0,
            googleReviewClicks: 0,
            additionalBonusClicks: 0,
            instagramRate: 0,
            googleReviewRate: 0,
            additionalBonusRate: 0,
            rawData: [],
          },
        };
      }
      console.error('Get bonus click stats error:', error);
      return { success: false, error: error.message };
    }

    // 統計を計算
    const totalClicks = data?.length || 0;
    const instagramClicks = data?.filter((c) => c.click_type === 'instagram').length || 0;
    const googleReviewClicks = data?.filter((c) => c.click_type === 'google_review').length || 0;
    const additionalBonusClicks = data?.filter((c) => c.click_type === 'additional_bonus').length || 0;

    // クーポン利用数が提供されている場合、レートを計算
    const baseCount = couponUsagesCount || totalClicks; // フォールバック
    
    return {
      success: true,
      data: {
        totalClicks,
        instagramClicks,
        googleReviewClicks,
        additionalBonusClicks,
        instagramRate: baseCount > 0 ? (instagramClicks / baseCount) * 100 : 0,
        googleReviewRate: baseCount > 0 ? (googleReviewClicks / baseCount) * 100 : 0,
        additionalBonusRate: baseCount > 0 ? (additionalBonusClicks / baseCount) * 100 : 0,
        rawData: data || [],
      },
    };
  } catch (error) {
    console.error('Get bonus click stats error:', error);
    return { success: false, error: 'Failed to get stats' };
  }
}
