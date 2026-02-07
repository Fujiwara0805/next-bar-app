// ============================================
// 型定義(lib/types/coupon.ts)
// ============================================

import { z } from 'zod';

// 割引タイプの定義
export const CouponDiscountType = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
  SPECIAL_PRICE: 'special_price', // 特別価格（元の価格→割引後の価格）
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
  coupon_additional_bonus: string | null;
  coupon_is_campaign: boolean; // キャンペーン用クーポンかどうか
}

// クーポンフォームの入力値型
export interface CouponFormValues {
  title: string;
  description: string;
  discountType: CouponDiscountType | '';
  discountValue: string;
  // 定額割引用の新フィールド（元の価格と割引後の価格）
  originalPrice: string;   // 元の価格 (例: 3500)
  discountedPrice: string; // 割引後の価格 (例: 2000)
  conditions: string;
  startDate: string;
  expiryDate: string;
  imageUrl: string;
  isActive: boolean;
  maxUses: string;
  code: string;
  barcodeUrl: string;
  additionalBonus: string;
  isCampaign: boolean; // キャンペーン用クーポンかどうか
}

// Zodバリデーションスキーマ（クーポン設定OFFのときはタイトル・日付等は不要）
export const couponFormSchema = z.object({
  title: z.string().max(100, 'タイトルは100文字以内で入力してください').optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  discountType: z.enum(['percentage', 'fixed', 'special_price', 'free_item', '']).optional(),
  discountValue: z.string().optional().or(z.literal('')),
  // 特別価格用の新フィールド
  originalPrice: z.string().optional().or(z.literal('')),
  discountedPrice: z.string().optional().or(z.literal('')),
  conditions: z.string().optional().or(z.literal('')),
  startDate: z.string().optional().or(z.literal('')),
  expiryDate: z.string().optional().or(z.literal('')),
  imageUrl: z.string().url('有効なURLを入力してください').optional().or(z.literal('')),
  isActive: z.boolean().default(false),
  maxUses: z.string().optional().or(z.literal('')),
  code: z.string().max(50, 'クーポンコードは50文字以内で入力してください').optional().or(z.literal('')),
  barcodeUrl: z.string().url('有効なURLを入力してください').optional().or(z.literal('')),
  additionalBonus: z.string().optional().or(z.literal('')),
  isCampaign: z.boolean().default(false),
})
  .refine((data) => {
    // クーポン設定がONの場合のみ、タイトル・配布開始日・有効期限を必須にする
    if (!data.isActive) return true;
    return !!(data.title && data.title.trim());
  }, { message: 'クーポンタイトルは必須です', path: ['title'] })
  .refine((data) => {
    if (!data.isActive) return true;
    return !!(data.startDate && data.startDate.trim());
  }, { message: '配布開始日は必須です', path: ['startDate'] })
  .refine((data) => {
    if (!data.isActive) return true;
    return !!(data.expiryDate && data.expiryDate.trim());
  }, { message: '有効期限は必須です', path: ['expiryDate'] })
  .refine((data) => {
  // クーポンが有効な場合、割引タイプは必須
  if (data.isActive && !data.discountType) {
    return false;
  }
  return true;
}, {
  message: '割引タイプを選択してください',
  path: ['discountType'],
}).refine((data) => {
  // クーポンが有効かつ割引タイプがpercentageの場合、割引値は必須
  if (data.isActive && data.discountType === 'percentage') {
    if (!data.discountValue || data.discountValue === '') {
      return false;
    }
  }
  return true;
}, {
  message: '割引値を入力してください',
  path: ['discountValue'],
}).refine((data) => {
  // クーポンが有効かつ割引タイプがfixedの場合、割引値は必須
  if (data.isActive && data.discountType === 'fixed') {
    if (!data.discountValue || data.discountValue === '') {
      return false;
    }
  }
  return true;
}, {
  message: '割引額を入力してください',
  path: ['discountValue'],
}).refine((data) => {
  // クーポンが有効かつ割引タイプがspecial_priceの場合、元の価格と割引後の価格は必須
  if (data.isActive && data.discountType === 'special_price') {
    if (!data.originalPrice || data.originalPrice === '' || !data.discountedPrice || data.discountedPrice === '') {
      return false;
    }
  }
  return true;
}, {
  message: '特別価格の場合、元の価格と特別価格を入力してください',
  path: ['originalPrice'],
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
  // 特別価格の場合、割引後の価格は元の価格より小さい必要がある
  if (data.discountType === 'special_price' && data.originalPrice && data.discountedPrice) {
    const original = parseFloat(data.originalPrice);
    const discounted = parseFloat(data.discountedPrice);
    if (!isNaN(original) && !isNaN(discounted)) {
      return discounted < original;
    }
  }
  return true;
}, {
  message: '特別価格は元の価格より小さい値を設定してください',
  path: ['discountedPrice'],
}).refine((data) => {
  // 特別価格の場合、価格は0以上
  if (data.discountType === 'special_price') {
    if (data.originalPrice) {
      const original = parseFloat(data.originalPrice);
      if (isNaN(original) || original < 0) return false;
    }
    if (data.discountedPrice) {
      const discounted = parseFloat(data.discountedPrice);
      if (isNaN(discounted) || discounted < 0) return false;
    }
  }
  return true;
}, {
  message: '価格は0以上の値を入力してください',
  path: ['originalPrice'],
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
  // 特別価格の場合は、割引額（元の価格 - 割引後の価格）を計算
  let discountValue: number | null = null;
  if (formValues.discountType === 'special_price' && formValues.originalPrice && formValues.discountedPrice) {
    const original = parseFloat(formValues.originalPrice);
    const discounted = parseFloat(formValues.discountedPrice);
    if (!isNaN(original) && !isNaN(discounted)) {
      discountValue = original - discounted;
    }
  } else if (formValues.discountValue) {
    discountValue = parseFloat(formValues.discountValue);
  }
  
  // 特別価格の場合、descriptionに元の価格→特別価格を自動追記
  let description = formValues.description || '';
  if (formValues.discountType === 'special_price' && formValues.originalPrice && formValues.discountedPrice) {
    const priceInfo = `【特別価格】¥${parseInt(formValues.originalPrice).toLocaleString()} → ¥${parseInt(formValues.discountedPrice).toLocaleString()}`;
    // 既に価格情報がある場合は更新、なければ追加
    if (description.includes('【特別価格】')) {
      description = description.replace(/【特別価格】.*円?→.*円?/g, priceInfo);
    } else if (!description.includes(priceInfo)) {
      description = description ? `${description}\n\n${priceInfo}` : priceInfo;
    }
  }
  
  return {
    coupon_title: formValues.title || null,
    coupon_description: description || null,
    coupon_discount_type: (formValues.discountType as CouponDiscountType) || null,
    coupon_discount_value: discountValue,
    coupon_conditions: formValues.conditions || null,
    coupon_start_date: formValues.startDate || null,
    coupon_expiry_date: formValues.expiryDate || null,
    coupon_image_url: formValues.imageUrl || null,
    coupon_is_active: formValues.isActive,
    coupon_max_uses: formValues.maxUses ? parseInt(formValues.maxUses, 10) : null,
    coupon_code: formValues.code || null,
    coupon_barcode_url: formValues.barcodeUrl || null,
    coupon_additional_bonus: formValues.additionalBonus || null,
    coupon_is_campaign: formValues.isCampaign,
  };
}

// DBデータをフォーム値に変換
export function dbDataToCouponForm(dbData: Partial<CouponData> | null): CouponFormValues {
  if (!dbData) {
    return getDefaultCouponFormValues();
  }
  
  // 特別価格の場合、descriptionから元の価格と特別価格を抽出
  let originalPrice = '';
  let discountedPrice = '';
  let description = dbData.coupon_description || '';
  
  if (dbData.coupon_discount_type === 'special_price' && description) {
    const priceMatch = description.match(/【特別価格】¥([\d,]+)\s*→\s*¥([\d,]+)/);
    if (priceMatch) {
      originalPrice = priceMatch[1].replace(/,/g, '');
      discountedPrice = priceMatch[2].replace(/,/g, '');
      // descriptionから価格情報を除去（編集時に重複しないよう）
      description = description.replace(/\n*【特別価格】¥[\d,]+\s*→\s*¥[\d,]+/g, '').trim();
    }
  }
  
  return {
    title: dbData.coupon_title || '',
    description: description,
    discountType: dbData.coupon_discount_type || '',
    discountValue: dbData.coupon_discount_value?.toString() || '',
    originalPrice: originalPrice,
    discountedPrice: discountedPrice,
    conditions: dbData.coupon_conditions || '',
    startDate: dbData.coupon_start_date ? dbData.coupon_start_date.split('T')[0] : '',
    expiryDate: dbData.coupon_expiry_date ? dbData.coupon_expiry_date.split('T')[0] : '',
    imageUrl: dbData.coupon_image_url || '',
    isActive: dbData.coupon_is_active || false,
    maxUses: dbData.coupon_max_uses?.toString() || '',
    code: dbData.coupon_code || '',
    barcodeUrl: dbData.coupon_barcode_url || '',
    additionalBonus: dbData.coupon_additional_bonus || '',
    isCampaign: dbData.coupon_is_campaign || false,
  };
}

// 今日の日付をYYYY-MM-DD形式で取得
function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// デフォルト値
export function getDefaultCouponFormValues(): CouponFormValues {
  return {
    title: '',
    description: '',
    discountType: '',
    discountValue: '',
    originalPrice: '',
    discountedPrice: '',
    conditions: '',
    startDate: getTodayString(), // デフォルトで今日の日付を設定
    expiryDate: '',
    imageUrl: '',
    isActive: false,
    maxUses: '',
    code: '',
    barcodeUrl: '',
    additionalBonus: '',
    isCampaign: false,
  };
}

// クーポンが有効かどうかをチェック
export function isCouponValid(coupon: Partial<CouponData>): boolean {
  if (!coupon.coupon_is_active) return false;

  const now = new Date();

  // 開始日チェック（日付のみの文字列はローカルタイムゾーンの0時として比較）
  if (coupon.coupon_start_date) {
    const startStr = coupon.coupon_start_date.split('T')[0]; // "YYYY-MM-DD"
    const [y, m, d] = startStr.split('-').map(Number);
    const startLocal = new Date(y, m - 1, d, 0, 0, 0); // ローカルタイムゾーンの0時
    if (startLocal > now) {
      return false;
    }
  }

  // 有効期限チェック（日付のみの文字列はローカルタイムゾーンの23:59:59として比較）
  if (coupon.coupon_expiry_date) {
    const expiryStr = coupon.coupon_expiry_date.split('T')[0]; // "YYYY-MM-DD"
    const [y, m, d] = expiryStr.split('-').map(Number);
    const expiryLocal = new Date(y, m - 1, d, 23, 59, 59); // ローカルタイムゾーンの23:59:59
    if (expiryLocal < now) {
      return false;
    }
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
      return '定額割引';
    case 'special_price':
      return '特別価格';
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
    case 'special_price':
      return `¥${value.toLocaleString()}お得`;
    case 'free_item':
      return '無料';
    default:
      return '';
  }
}
