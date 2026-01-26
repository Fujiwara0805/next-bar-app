// ============================================
// 型定義(lib/types/coupon.ts)
// ============================================

import { z } from 'zod';

// 割引タイプの定義
export const CouponDiscountType = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
  FREE_ITEM: 'free_item',
} as const;

export type CouponDiscountType = typeof CouponDiscountType[keyof typeof CouponDiscountType];

// クーポンデータの型定義
export interface CouponData {
  coupon_title: string | null;
  coupon_description: string | null;
  coupon_discount_type: CouponDiscountType | null;
  coupon_discount_value: number | null;
  coupon_conditions: string | null;
  coupon_start_date: string | null;
  coupon_expiry_date: string | null;
  coupon_image_url: string | null;
  coupon_is_active: boolean;
  coupon_max_uses: number | null;
  coupon_current_uses: number;
  coupon_code: string | null;
  coupon_barcode_url: string | null;
}

// クーポンフォームの入力値型
export interface CouponFormValues {
  title: string;
  description: string;
  discountType: CouponDiscountType | '';
  discountValue: string;
  conditions: string;
  startDate: string;
  expiryDate: string;
  imageUrl: string;
  isActive: boolean;
  maxUses: string;
  code: string;
  barcodeUrl: string;
}

// Zodバリデーションスキーマ
export const couponFormSchema = z.object({
  title: z.string().max(100, 'タイトルは100文字以内で入力してください').optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  discountType: z.enum(['percentage', 'fixed', 'free_item', '']).optional(),
  discountValue: z.string().optional().or(z.literal('')),
  conditions: z.string().optional().or(z.literal('')),
  startDate: z.string().optional().or(z.literal('')),
  expiryDate: z.string().optional().or(z.literal('')),
  imageUrl: z.string().url('有効なURLを入力してください').optional().or(z.literal('')),
  isActive: z.boolean().default(false),
  maxUses: z.string().optional().or(z.literal('')),
  code: z.string().max(50, 'クーポンコードは50文字以内で入力してください').optional().or(z.literal('')),
  barcodeUrl: z.string().url('有効なURLを入力してください').optional().or(z.literal('')),
}).refine((data) => {
  // 割引タイプがpercentageの場合、値は0-100の範囲
  if (data.discountType === 'percentage' && data.discountValue) {
    const value = parseFloat(data.discountValue);
    return !isNaN(value) && value >= 0 && value <= 100;
  }
  return true;
}, {
  message: '%割引の場合、割引値は0〜100の範囲で入力してください',
  path: ['discountValue'],
}).refine((data) => {
  // 割引タイプがfixedの場合、値は0以上
  if (data.discountType === 'fixed' && data.discountValue) {
    const value = parseFloat(data.discountValue);
    return !isNaN(value) && value >= 0;
  }
  return true;
}, {
  message: '固定金額割引の場合、0以上の値を入力してください',
  path: ['discountValue'],
}).refine((data) => {
  // 有効期限は開始日より後である必要がある
  if (data.startDate && data.expiryDate) {
    return new Date(data.expiryDate) > new Date(data.startDate);
  }
  return true;
}, {
  message: '有効期限は配布開始日より後の日付を設定してください',
  path: ['expiryDate'],
});

export type CouponFormSchema = z.infer<typeof couponFormSchema>;

// フォーム値をDBカラム形式に変換
export function couponFormToDbData(formValues: CouponFormValues): Partial<CouponData> {
  return {
    coupon_title: formValues.title || null,
    coupon_description: formValues.description || null,
    coupon_discount_type: (formValues.discountType as CouponDiscountType) || null,
    coupon_discount_value: formValues.discountValue ? parseFloat(formValues.discountValue) : null,
    coupon_conditions: formValues.conditions || null,
    coupon_start_date: formValues.startDate || null,
    coupon_expiry_date: formValues.expiryDate || null,
    coupon_image_url: formValues.imageUrl || null,
    coupon_is_active: formValues.isActive,
    coupon_max_uses: formValues.maxUses ? parseInt(formValues.maxUses, 10) : null,
    coupon_code: formValues.code || null,
    coupon_barcode_url: formValues.barcodeUrl || null,
  };
}

// DBデータをフォーム値に変換
export function dbDataToCouponForm(dbData: Partial<CouponData> | null): CouponFormValues {
  if (!dbData) {
    return getDefaultCouponFormValues();
  }
  
  return {
    title: dbData.coupon_title || '',
    description: dbData.coupon_description || '',
    discountType: dbData.coupon_discount_type || '',
    discountValue: dbData.coupon_discount_value?.toString() || '',
    conditions: dbData.coupon_conditions || '',
    startDate: dbData.coupon_start_date ? dbData.coupon_start_date.split('T')[0] : '',
    expiryDate: dbData.coupon_expiry_date ? dbData.coupon_expiry_date.split('T')[0] : '',
    imageUrl: dbData.coupon_image_url || '',
    isActive: dbData.coupon_is_active || false,
    maxUses: dbData.coupon_max_uses?.toString() || '',
    code: dbData.coupon_code || '',
    barcodeUrl: dbData.coupon_barcode_url || '',
  };
}

// デフォルト値
export function getDefaultCouponFormValues(): CouponFormValues {
  return {
    title: '',
    description: '',
    discountType: '',
    discountValue: '',
    conditions: '',
    startDate: '',
    expiryDate: '',
    imageUrl: '',
    isActive: false,
    maxUses: '',
    code: '',
    barcodeUrl: '',
  };
}

// クーポンが有効かどうかをチェック
export function isCouponValid(coupon: Partial<CouponData>): boolean {
  if (!coupon.coupon_is_active) return false;
  
  const now = new Date();
  
  // 開始日チェック
  if (coupon.coupon_start_date && new Date(coupon.coupon_start_date) > now) {
    return false;
  }
  
  // 有効期限チェック
  if (coupon.coupon_expiry_date && new Date(coupon.coupon_expiry_date) < now) {
    return false;
  }
  
  // 発行上限チェック
  if (coupon.coupon_max_uses !== null && coupon.coupon_max_uses !== undefined) {
    const currentUses = coupon.coupon_current_uses || 0;
    if (currentUses >= coupon.coupon_max_uses) {
      return false;
    }
  }
  
  return true;
}

// 割引タイプの表示名
export function getDiscountTypeLabel(type: CouponDiscountType | null | ''): string {
  switch (type) {
    case 'percentage':
      return '%割引';
    case 'fixed':
      return '固定金額割引';
    case 'free_item':
      return '無料サービス';
    default:
      return '未設定';
  }
}

// 割引値の表示テキスト
export function formatDiscountValue(type: CouponDiscountType | null | '', value: number | null): string {
  if (!type || value === null) return '';
  
  switch (type) {
    case 'percentage':
      return `${value}%OFF`;
    case 'fixed':
      return `¥${value.toLocaleString()}OFF`;
    case 'free_item':
      return '無料';
    default:
      return '';
  }
}
