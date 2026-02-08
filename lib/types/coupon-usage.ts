// ============================================
// クーポン利用記録の型定義
// lib/types/coupon-usage.ts
// ============================================

import { z } from 'zod';

// アンケートのステップ
export type SurveyStep = 'intro' | 'first_visit' | 'residence' | 'complete';

// アンケートの回答
export interface SurveyAnswers {
  isFirstVisit: boolean | null;
  isLocalResident: boolean | null;
}

// アンケートが完了しているかチェック
export function isSurveyComplete(answers: SurveyAnswers): boolean {
  return answers.isFirstVisit !== null && answers.isLocalResident !== null;
}

// セッションIDの取得または作成
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') {
    return crypto.randomUUID();
  }
  
  const storageKey = 'coupon_session_id';
  let sessionId = sessionStorage.getItem(storageKey);
  
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(storageKey, sessionId);
  }
  
  return sessionId;
}

// クーポン利用記録リクエストのZodスキーマ
export const recordCouponUsageSchema = z.object({
  storeId: z.string().uuid('店舗IDが不正です'),
  storeName: z.string().min(1, '店舗名は必須です'),
  sessionId: z.string().min(1, 'セッションIDは必須です'),
  userId: z.string().uuid('ユーザーIDが不正です').optional(),
  isFirstVisit: z.boolean().default(false),
  isLocalResident: z.boolean().default(false),
  // キャンペーン関連（どのキャンペーンでクーポンが使用されたか追跡）
  campaignId: z.string().uuid('キャンペーンIDが不正です').optional().nullable(),
  campaignName: z.string().optional().nullable(),
  // クーポン詳細（どのクーポンが使用されたか追跡）
  couponTitle: z.string().optional().nullable(),
  couponDiscountType: z.string().optional().nullable(),
  couponDiscountValue: z.number().optional().nullable(),
  couponConditions: z.string().optional().nullable(),
  couponCode: z.string().optional().nullable(),
  couponAdditionalBonus: z.string().optional().nullable(),
});

// リクエスト型
export type RecordCouponUsageRequest = z.infer<typeof recordCouponUsageSchema>;

// レスポンス型
export interface RecordCouponUsageResponse {
  success: boolean;
  usageId?: string;
  error?: 'VALIDATION_ERROR' | 'DUPLICATE_USAGE' | 'DATABASE_ERROR' | 'UNKNOWN_ERROR';
  message?: string;
}

// クーポン利用履歴の型
export interface CouponUsage {
  id: string;
  store_id: string;
  store_name: string;
  session_id: string;
  user_id: string | null;
  is_first_visit: boolean;
  is_local_resident: boolean;
  user_agent: string | null;
  referrer: string | null;
  used_at: string;
  // キャンペーン関連
  campaign_id: string | null;
  campaign_name: string | null;
  // クーポン詳細
  coupon_title: string | null;
  coupon_discount_type: string | null;
  coupon_discount_value: number | null;
  coupon_conditions: string | null;
  coupon_code: string | null;
  coupon_additional_bonus: string | null;
}

// クーポン利用統計の型
export interface CouponUsageStats {
  totalUsages: number;
  firstVisitCount: number;
  repeatVisitCount: number;
  localResidentCount: number;
  visitorCount: number;
  firstVisitRate: number;
  localResidentRate: number;
  rawData: CouponUsage[];
}
