'use server';

// ============================================
// クーポン利用記録のサーバーアクション
// lib/actions/coupon-usage.ts
// ============================================

import { headers } from 'next/headers';
import {
  RecordCouponUsageRequest,
  RecordCouponUsageResponse,
  recordCouponUsageSchema,
} from '@/lib/types/coupon-usage';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * クーポン利用を記録するサーバーアクション
 */
export async function recordCouponUsage(
  request: RecordCouponUsageRequest
): Promise<RecordCouponUsageResponse> {
  try {
    // Supabaseクライアントを作成
    const supabase = createServerSupabaseClient();
    
    // バリデーション
    const validationResult = recordCouponUsageSchema.safeParse(request);
    
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

    // 重複チェック（同一セッション、同一店舗、30分以内）
    const { data: duplicateCheck, error: duplicateError } = await supabase.rpc(
      'check_coupon_duplicate_usage',
      {
        p_store_id: validatedData.storeId,
        p_session_id: validatedData.sessionId,
        p_minutes_threshold: 30,
      }
    );

    if (duplicateError) {
      // RPC関数が存在しない場合など、エラーが発生しても処理を続行
    } else if (duplicateCheck === true) {
      return {
        success: false,
        error: 'DUPLICATE_USAGE',
        message: '短時間内に同じクーポンが使用されています。30分後に再度お試しください。',
      };
    }

    // クーポン利用を記録（キャンペーン情報も含む）
    const { data: usageData, error: insertError } = await supabase
      .from('coupon_usages')
      .insert({
        store_id: validatedData.storeId,
        store_name: validatedData.storeName,
        session_id: validatedData.sessionId,
        user_id: validatedData.userId || null,
        is_first_visit: validatedData.isFirstVisit,
        is_local_resident: validatedData.isLocalResident,
        user_agent: userAgent,
        referrer: referrer,
        // キャンペーン関連（Aという店舗でBキャンペーンにてCクーポンが使用された記録）
        campaign_id: validatedData.campaignId || null,
        campaign_name: validatedData.campaignName || null,
        // クーポン詳細（どのクーポンが使用されたかのスナップショット）
        coupon_title: validatedData.couponTitle || null,
        coupon_discount_type: validatedData.couponDiscountType || null,
        coupon_discount_value: validatedData.couponDiscountValue ?? null,
        coupon_conditions: validatedData.couponConditions || null,
        coupon_code: validatedData.couponCode || null,
        coupon_additional_bonus: validatedData.couponAdditionalBonus || null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Insert coupon usage error:', insertError);
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: 'クーポン利用の記録に失敗しました',
      };
    }

    // 店舗のクーポン使用回数をインクリメント
    const { error: updateError } = await supabase.rpc('increment_coupon_uses', {
      store_id: validatedData.storeId,
    });

    // インクリメントRPCが存在しない場合は直接UPDATE
    if (updateError) {
      const { data: storeData } = await supabase
        .from('stores')
        .select('coupon_current_uses')
        .eq('id', validatedData.storeId)
        .single();
      
      await supabase
        .from('stores')
        .update({
          coupon_current_uses: (storeData?.coupon_current_uses ?? 0) + 1,
        })
        .eq('id', validatedData.storeId);
    }

    return {
      success: true,
      usageId: usageData.id,
    };
  } catch (error) {
    console.error('Record coupon usage error:', error);
    return {
      success: false,
      error: 'UNKNOWN_ERROR',
      message: '予期せぬエラーが発生しました',
    };
  }
}

/**
 * 店舗のクーポン利用統計を取得
 */
export async function getCouponUsageStats(
  storeId: string,
  startDate?: string,
  endDate?: string
) {
  try {
    const supabase = createServerSupabaseClient();
    
    let query = supabase
      .from('coupon_usages')
      .select('*')
      .eq('store_id', storeId)
      .order('used_at', { ascending: false });

    if (startDate) {
      query = query.gte('used_at', startDate);
    }
    if (endDate) {
      query = query.lte('used_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get coupon usage stats error:', error);
      return { success: false, error: error.message };
    }

    // 統計を計算
    const totalUsages = data?.length || 0;
    const firstVisitCount = data?.filter((u) => u.is_first_visit).length || 0;
    const localResidentCount = data?.filter((u) => u.is_local_resident).length || 0;

    return {
      success: true,
      data: {
        totalUsages,
        firstVisitCount,
        repeatVisitCount: totalUsages - firstVisitCount,
        localResidentCount,
        visitorCount: totalUsages - localResidentCount,
        firstVisitRate: totalUsages > 0 ? (firstVisitCount / totalUsages) * 100 : 0,
        localResidentRate: totalUsages > 0 ? (localResidentCount / totalUsages) * 100 : 0,
        rawData: data,
      },
    };
  } catch (error) {
    console.error('Get coupon usage stats error:', error);
    return { success: false, error: 'Failed to get stats' };
  }
}