// ============================================
// ボーナスクリック（追加特典）の型定義
// lib/types/bonus-click.ts
// ============================================

import { z } from 'zod';

/**
 * クリックタイプの定義
 */
export const BonusClickType = {
  INSTAGRAM: 'instagram',
  GOOGLE_REVIEW: 'google_review',
  ADDITIONAL_BONUS: 'additional_bonus',
} as const;

export type BonusClickType = typeof BonusClickType[keyof typeof BonusClickType];

/**
 * ボーナスクリックのデータベース型
 */
export interface BonusClick {
  id: string;
  coupon_usage_id: string | null;
  store_id: string;
  click_type: BonusClickType;
  session_id: string | null;
  user_agent: string | null;
  referrer: string | null;
  clicked_at: string;
}

/**
 * ボーナスクリック記録リクエストのZodスキーマ
 */
export const recordBonusClickSchema = z.object({
  storeId: z.string().uuid('店舗IDが不正です'),
  couponUsageId: z.string().uuid('クーポン利用IDが不正です').optional(),
  clickType: z.enum(['instagram', 'google_review', 'additional_bonus'], {
    errorMap: () => ({ message: 'クリックタイプが不正です' }),
  }),
  sessionId: z.string().min(1, 'セッションIDは必須です'),
});

export type RecordBonusClickRequest = z.infer<typeof recordBonusClickSchema>;

/**
 * ボーナスクリック記録レスポンス
 */
export interface RecordBonusClickResponse {
  success: boolean;
  clickId?: string;
  error?: 'VALIDATION_ERROR' | 'DATABASE_ERROR' | 'UNKNOWN_ERROR';
  message?: string;
}

/**
 * ボーナスクリック統計
 */
export interface BonusClickStats {
  totalClicks: number;
  instagramClicks: number;
  googleReviewClicks: number;
  additionalBonusClicks: number;
  // 計算されたレート
  instagramRate: number;      // クーポン利用に対するInstagramクリック率
  googleReviewRate: number;   // クーポン利用に対するGoogleレビュークリック率
  additionalBonusRate: number; // クーポン利用に対する追加特典クリック率
  // 生データ
  rawData: BonusClick[];
}

/**
 * クリックタイプの表示名を取得
 */
export function getClickTypeLabel(clickType: BonusClickType): string {
  switch (clickType) {
    case 'instagram':
      return 'Instagramフォロー';
    case 'google_review':
      return 'Google口コミ';
    case 'additional_bonus':
      return '追加特典';
    default:
      return '不明';
  }
}

/**
 * クリックタイプのアイコン名を取得（lucide-react用）
 */
export function getClickTypeIcon(clickType: BonusClickType): string {
  switch (clickType) {
    case 'instagram':
      return 'Instagram';
    case 'google_review':
      return 'Star';
    case 'additional_bonus':
      return 'Sparkles';
    default:
      return 'MousePointer';
  }
}

/**
 * クリックタイプの色を取得
 */
export function getClickTypeColor(clickType: BonusClickType): string {
  switch (clickType) {
    case 'instagram':
      return '#E1306C'; // Instagram pink
    case 'google_review':
      return '#4285F4'; // Google blue
    case 'additional_bonus':
      return '#C9A86C'; // Gold
    default:
      return '#6B7280'; // Gray
  }
}
