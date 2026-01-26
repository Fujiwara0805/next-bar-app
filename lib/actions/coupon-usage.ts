'use server';

// ============================================
// クーポン利用記録のサーバーアクション
// lib/actions/coupon-usage.ts
// ============================================

import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import {
  RecordCouponUsageRequest,
  RecordCouponUsageResponse,
  recordCouponUsageSchema,
} from '@/lib/types/coupon-usage';

// Supabaseクライアント（サーバーサイド用）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * クーポン利用を記録するサーバーアクション
 */
export async function recordCouponUsage(
  request: RecordCouponUsageRequest
): Promise<RecordCouponUsageResponse> {
  try {
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
    const { data: duplicateCheck, error: duplicateError } = await supabaseAdmin.rpc(
      'check_coupon_duplicate_usage',
      {
        p_store_id: validatedData.storeId,
        p_session_id: validatedData.sessionId,
        p_minutes_threshold: 30,
      }
    );

    if (duplicateError) {
      console.error('Duplicate check error:', duplicateError);
      // エラーが発生しても処理を続行（RPC関数が存在しない場合など）
    } else if (duplicateCheck === true) {
      return {
        success: false,
        error: 'DUPLICATE_USAGE',
        message: '短時間内に同じクーポンが使用されています。30分後に再度お試しください。',
      };
    }

    // クーポン利用を記録
    const { data: usageData, error: insertError } = await supabaseAdmin
      .from('coupon_usages')
      .insert({
        store_id: validatedData.storeId,
        session_id: validatedData.sessionId,
        user_id: validatedData.userId || null,
        is_first_visit: validatedData.isFirstVisit,
        is_local_resident: validatedData.isLocalResident,
        user_agent: userAgent,
        referrer: referrer,
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
    const { error: updateError } = await supabaseAdmin.rpc('increment_coupon_uses', {
      store_id: validatedData.storeId,
    });

    // インクリメントRPCが存在しない場合は直接UPDATE
    if (updateError) {
      await supabaseAdmin
        .from('stores')
        .update({
          coupon_current_uses: supabaseAdmin.rpc('coalesce', {
            value: 'coupon_current_uses',
            default_value: 0,
          }),
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
    let query = supabaseAdmin
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