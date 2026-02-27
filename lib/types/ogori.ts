/**
 * ============================================
 * おごり酒システム 型定義
 * ============================================
 */

/** おごり酒の固定金額（円） */
export const OGORI_FIXED_AMOUNT = 1000;

/** ドリンクメニュー項目（名前のみ、金額なし） */
export interface OgoriDrink {
  /** 一時ID（フォーム管理用） */
  id: string;
  /** ドリンク名 */
  name: string;
  /** 画像URL（任意） */
  imageUrl: string | null;
  /** 有効/無効 */
  isActive: boolean;
}

/** 管理画面用フォーム値 */
export interface OgoriFormValues {
  /** おごり酒機能ON/OFF */
  isEnabled: boolean;
  /** ドリンクメニュー */
  drinks: OgoriDrink[];
}

/** おごりチケットの状態 */
export type OgoriTicketStatus = 'available' | 'used' | 'expired';

/** おごりチケット（DB Row型） */
export interface OgoriTicket {
  id: string;
  store_id: string;
  purchaser_id: string | null;
  amount: number;
  drink_id: string | null;
  drink_name: string | null;
  stripe_payment_id: string | null;
  status: OgoriTicketStatus;
  used_by: string | null;
  used_at: string | null;
  used_drink_id: string | null;
  used_drink_name: string | null;
  created_at: string;
}

// ============================================
// ヘルパー関数
// ============================================

/** 一意のIDを生成 */
export const generateOgoriId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

/** デフォルトフォーム値を取得 */
export const getDefaultOgoriFormValues = (): OgoriFormValues => ({
  isEnabled: false,
  drinks: [],
});

/** フォーム値 → storesテーブル更新データ */
export const ogoriFormToDbData = (values: OgoriFormValues) => ({
  ogori_enabled: values.isEnabled,
});

/**
 * DBデータ → フォーム値
 * ※ drinks は別テーブルのため、storeデータからは ogori_enabled のみ復元
 */
export const dbDataToOgoriForm = (storeData: any): Pick<OgoriFormValues, 'isEnabled'> => ({
  isEnabled: storeData?.ogori_enabled ?? false,
});

/** 新規ドリンクの雛形を生成 */
export const createEmptyDrink = (): OgoriDrink => ({
  id: generateOgoriId(),
  name: '',
  imageUrl: null,
  isActive: true,
});

/** 金額をフォーマット（例: 1,000円） */
export const formatOgoriPrice = (price: number): string =>
  `${price.toLocaleString('ja-JP')}円`;
