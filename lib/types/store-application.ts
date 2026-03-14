/**
 * ============================================
 * ファイルパス: lib/types/store-application.ts
 *
 * 機能: 加盟店申し込みフォームの型定義・バリデーション
 * ============================================
 */

import type { Database } from '@/lib/supabase/types';
import type { AppMode } from '@/lib/app-mode';
// カフェ・両方モード用設備はlib/app-mode.tsからexport済み

// DB型
export type StoreApplication = Database['public']['Tables']['store_applications']['Row'];
export type StoreApplicationInsert = Database['public']['Tables']['store_applications']['Insert'];
export type StoreApplicationUpdate = Database['public']['Tables']['store_applications']['Update'];

// ステータス型
export type ApplicationStatus = StoreApplication['status'];

// フォームステップ定義
export const APPLICATION_STEPS = [
  { id: 1, key: 'basic', label: '基本情報' },
  { id: 2, key: 'business', label: '営業情報' },
  { id: 3, key: 'facilities', label: '設備・サービス' },
  { id: 4, key: 'images', label: '画像・アカウント' },
  { id: 5, key: 'confirm', label: '確認・送信' },
] as const;

export type StepKey = typeof APPLICATION_STEPS[number]['key'];

// フォーム値の型
export interface ApplicationFormValues {
  // Step 1: 基本情報
  storeName: string;
  description: string;
  address: string;
  phone: string;
  storeCategory: 'bar' | 'cafe' | 'both';

  // Step 2: 営業情報
  businessHours: string;
  regularHoliday: string;
  budgetMin: number;
  budgetMax: number;
  paymentMethods: string[];

  // Step 3: 設備・サービス
  facilities: string[];

  // Step 4: 画像・アカウント
  imageFiles: File[];
  contactEmail: string;

  // Step 5: 確認・送信
  termsAgreed: boolean;
  remarks: string;
}

export function getDefaultApplicationFormValues(): ApplicationFormValues {
  return {
    storeName: '',
    description: '',
    address: '',
    phone: '',
    storeCategory: 'bar',
    businessHours: '',
    regularHoliday: '',
    budgetMin: 0,
    budgetMax: 0,
    paymentMethods: [],
    facilities: [],
    imageFiles: [],
    contactEmail: '',
    termsAgreed: false,
    remarks: '',
  };
}

// バリデーション関数
export function validateStep(step: number, values: ApplicationFormValues): string | null {
  switch (step) {
    case 1:
      if (!values.storeName.trim()) return '店舗名を入力してください';
      if (!values.address.trim()) return '住所を入力してください';
      return null;
    case 2:
      return null; // 営業情報は任意
    case 3:
      return null; // 設備は任意
    case 4:
      if (!values.contactEmail.trim()) return 'メールアドレスを入力してください';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail)) return '有効なメールアドレスを入力してください';
      if (values.imageFiles.length > 5) return '画像は最大5枚までです';
      for (const file of values.imageFiles) {
        if (file.size > 10 * 1024 * 1024) return `${file.name} のサイズが10MBを超えています`;
      }
      return null;
    case 5:
      return null;
    default:
      return null;
  }
}

// 支払い方法の選択肢
export const PAYMENT_METHOD_OPTIONS = [
  '現金',
  'クレジットカード',
  '電子マネー',
  'QRコード決済（PayPay、LINE Payなど）',
  'デビットカード',
  '交通系IC（Suica、PASMOなど）',
] as const;

// 設備カテゴリ（夜モード用 - 新規登録画面・編集画面と統一）
export const FACILITY_CATEGORIES = {
  newcomer: {
    title: '✨ 新規・一人客向け',
    items: ['一人客歓迎', 'おひとり様大歓迎', 'カウンター充実', '常連さんが優しい'],
  },
  women: {
    title: '💕 女性向け',
    items: ['女性客多め', '女性一人でも安心', '女性スタッフ在籍', 'レディースデー有'],
  },
  pricing: {
    title: '💰 料金関連',
    items: ['チャージなし', '席料なし', 'お通しなし', '明朗会計', '価格表示あり', '予算相談OK'],
  },
} as const;

// 設備カテゴリ（昼モード用）
export const CAFE_FACILITY_CATEGORIES = {
  atmosphere: {
    title: '☕ 雰囲気',
    items: ['静かで落ち着く', 'おしゃれな内装', '読書に最適', 'BGM心地よい'],
  },
  workspace: {
    title: '💻 ワーク・スタディ',
    items: ['Wi-Fi完備', '電源あり', '長居OK', '作業向き'],
  },
  women_family: {
    title: '👩 女性・ファミリー向け',
    items: ['女性一人でも安心', '子連れ歓迎', 'ベビーカー可', 'キッズメニューあり'],
  },
  pricing: {
    title: '💰 料金・サービス',
    items: ['リーズナブル', '学割あり', 'フリードリンクあり', '明朗会計'],
  },
} as const;

// 設備カテゴリ（両方モード用）
export const BOTH_FACILITY_CATEGORIES = {
  newcomer: {
    title: '✨ 新規・一人客向け',
    items: ['一人客歓迎', 'おひとり様大歓迎', 'カウンター充実', '常連さんが優しい'],
  },
  women: {
    title: '👩 女性向け',
    items: ['女性客多め', '女性一人でも安心', '女性スタッフ在籍', '子連れ歓迎'],
  },
  pricing: {
    title: '💰 料金関連',
    items: ['明朗会計', '価格表示あり', '予算相談OK', 'チャージなし', '席料なし', 'リーズナブル'],
  },
} as const;

// その他設備（夜モード用）
export const OTHER_FACILITIES = [
  'Wi-Fi', '喫煙可', '分煙', '禁煙', '駐車場', 'カウンター席', '個室', 'テラス席', 'ソファ席',
  'カラオケ完備', 'ダーツ', 'ビリヤード', 'ボードゲーム', '生演奏', 'DJ', 'スポーツ観戦可',
  '日本酒充実', 'ウイスキー充実', 'ワイン充実', 'カクテル豊富', 'クラフトビール', '焼酎充実',
  'フード充実', 'おつまみ豊富', '英語対応可', '外国語メニューあり', '観光客歓迎', 'ホテル近く',
  '駅近', '深夜営業', '朝まで営業', 'ボトルキープ可', 'セット料金あり', '静かな雰囲気',
  'ワイワイ系', 'オーセンティック', 'カジュアル', '隠れ家的', '大人の雰囲気', '昭和レトロ',
  'スタイリッシュ', 'アットホーム', 'ママ・マスター人気', '美味しいお酒', 'こだわりの一杯',
] as const;

// その他設備（昼モード用）
export const CAFE_OTHER_FACILITIES_LIST = [
  // 座席・空間
  'カウンター席', 'ソファ席', 'テラス席', '個室', 'テーブル席あり', '半個室', '窓際席あり',
  // ワーク・スタディ
  'Wi-Fi', '電源あり', 'テレワーク向き', '勉強向き', '読書向き', 'Web会議OK', '個別デスクあり', 'プリンター利用可',
  // メニュー
  'スペシャルティコーヒー', '自家焙煎', 'ラテアート', 'スイーツ充実', 'ランチ', 'モーニング', 'ヴィーガン対応', 'テイクアウト可', 'ヘルシーメニュー',
  // 喫煙
  '禁煙', '分煙',
  // ファミリー・ペット
  'ペット可', 'ベビーカー可', '子連れ歓迎', '授乳室あり',
  // アクセス・施設
  '駐車場', '駅近',
  // 国際対応
  '英語対応可', '外国語メニューあり', '観光客歓迎',
  // 雰囲気
  '隠れ家的', 'アットホーム', 'スタイリッシュ', 'フォトジェニック', 'コーヒー豆販売',
] as const;

// その他設備（両方モード用）
export const BOTH_OTHER_FACILITIES_LIST = [
  // 座席・空間
  'カウンター席', 'ソファ席', 'テラス席', '個室', 'テーブル席あり',
  // インフラ
  'Wi-Fi', '電源あり', '禁煙', '分煙', '喫煙可',
  // ワーク・くつろぎ
  '長居OK', '読書向き', '作業向き', 'テレワーク向き',
  // ドリンク
  'コーヒー充実', 'カクテル豊富', 'ワイン充実', 'クラフトビール',
  // フード
  'ランチ', 'フード充実', 'スイーツ充実', 'テイクアウト可', 'ヘルシーメニュー',
  // エンタメ
  'ボードゲーム', 'スポーツ観戦可',
  // ファミリー・ペット
  'ペット可', 'ベビーカー可', '子連れ歓迎',
  // アクセス・施設
  '駐車場', '駅近',
  // 国際対応
  '英語対応可', '外国語メニューあり', '観光客歓迎',
  // 雰囲気
  '隠れ家的', 'アットホーム', 'スタイリッシュ', 'カジュアル', '落ち着いた雰囲気', 'フォトジェニック', 'スタッフが親切',
] as const;

/** モードに応じた設備カテゴリを返す */
export function getFacilityCategoriesByStoreCategory(storeCategory: 'bar' | 'cafe' | 'both') {
  if (storeCategory === 'cafe') return CAFE_FACILITY_CATEGORIES;
  if (storeCategory === 'both') return BOTH_FACILITY_CATEGORIES;
  return FACILITY_CATEGORIES;
}

/** モードに応じたその他設備を返す */
export function getOtherFacilitiesByStoreCategory(storeCategory: 'bar' | 'cafe' | 'both') {
  if (storeCategory === 'cafe') return CAFE_OTHER_FACILITIES_LIST;
  if (storeCategory === 'both') return BOTH_OTHER_FACILITIES_LIST;
  return OTHER_FACILITIES;
}

// ステータスの表示情報
export const APPLICATION_STATUS_MAP: Record<ApplicationStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  pending: { label: '未確認', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  reviewing: { label: '確認中', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  approved: { label: '承認済', color: 'text-green-700', bgColor: 'bg-green-50' },
  rejected: { label: '不承認', color: 'text-red-700', bgColor: 'bg-red-50' },
};
