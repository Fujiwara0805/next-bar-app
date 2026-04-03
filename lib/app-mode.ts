/**
 * ============================================
 * ファイルパス: lib/app-mode.ts
 *
 * 機能: アプリモード（バー/カフェ）の判定・カラーパレット・特徴タグ
 *       6:00〜16:59 → カフェモード
 *       17:00〜5:59 → バーモード
 * ============================================
 */

// ============================================================================
// 型定義
// ============================================================================

export type AppMode = 'bar' | 'cafe';

/** Shape A: map/page.tsx, map-view.tsx, landing/page.tsx で使用 */
export interface ColorsShapeA {
  // ベースカラー
  background: string;
  surface: string;
  surfaceLight: string;
  cardBackground: string;
  // メインカラー（landing用）
  primary: string;
  charcoal: string;
  warmGray: string;
  // アクセントカラー
  accent: string;
  accentLight: string;
  accentDark: string;
  // テキストカラー
  text: string;
  textMuted: string;
  textSubtle: string;
  // グラデーション
  luxuryGradient: string;
  goldGradient: string;
  cardGradient: string;
  // ボーダー・シャドウ
  borderGold: string;
  borderSubtle: string;
  shadowGold: string;
  shadowDeep: string;
  // エラー
  error: string;
  errorBg: string;
  errorBorder: string;
}

/** Shape B: store-list/page.tsx, store/[id]/page.tsx で使用 */
export interface ColorsShapeB {
  deepNavy: string;
  midnightBlue: string;
  royalNavy: string;
  champagneGold: string;
  paleGold: string;
  antiqueGold: string;
  charcoal: string;
  warmGray: string;
  platinum: string;
  ivory: string;
  luxuryGradient: string;
  goldGradient: string;
  cardGradient: string;
}

/** StoreDetailPanel用テーマ */
export interface PanelDarkTheme {
  background: string;
  surface: string;
  accent: string;
  accentLight: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  borderGold: string;
  borderSubtle: string;
  shadowGold: string;
  goldGradient: string;
}

export interface PanelLightTheme {
  background: string;
  surface: string;
  accent: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  borderGold: string;
  borderSubtle: string;
  badgeBg: string;
}

// ============================================================================
// モード判定
// ============================================================================

const STORAGE_KEY = 'nikenme-app-mode';

/** localStorageからモードを取得（未設定ならデフォルト 'bar'） */
export function getStoredMode(): AppMode {
  if (typeof window === 'undefined') return 'bar';
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'cafe' ? 'cafe' : 'bar';
}

/** localStorageにモードを保存 */
export function setStoredMode(mode: AppMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, mode);
}

// ============================================================================
// バーモード カラーパレット
// ============================================================================

export const BAR_COLORS_A: ColorsShapeA = {
  background: '#13294b',              // Brewers Dark Navy
  surface: '#1F57A4',                 // Brewers Blue
  surfaceLight: '#86BFE8',            // Brewers Light Blue
  cardBackground: '#FDFBF7',          // Off-white
  primary: '#1F57A4',                 // Brewers Blue
  charcoal: '#2D3436',
  warmGray: '#636E72',
  accent: '#ffc72d',                  // Brewers Yellow
  accentLight: '#FFD966',             // Light Yellow
  accentDark: '#C9A86C',              // Dark Gold
  text: '#FDFBF7',                    // Off-white
  textMuted: 'rgba(253, 251, 247, 0.7)',
  textSubtle: 'rgba(253, 251, 247, 0.5)',
  luxuryGradient: 'linear-gradient(165deg, #12284B 0%, #1A3562 50%, #1F57A4 100%)',
  goldGradient: 'linear-gradient(135deg, #FFC52F 0%, #FFD966 50%, #C9A86C 100%)',
  cardGradient: 'linear-gradient(145deg, #FDFBF7 0%, #F5F1EB 100%)',
  borderGold: 'rgba(255, 197, 47, 0.3)',
  borderSubtle: 'rgba(255, 197, 47, 0.15)',
  shadowGold: '0 8px 30px rgba(255, 197, 47, 0.3)',
  shadowDeep: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.15)',
  errorBorder: 'rgba(239, 68, 68, 0.3)',
};

export const BAR_COLORS_B: ColorsShapeB = {
  deepNavy: '#12284B',              // Brewers Dark Navy
  midnightBlue: '#1F57A4',          // Brewers Blue
  royalNavy: '#86BFE8',             // Brewers Light Blue
  champagneGold: '#FFC52F',         // Brewers Yellow
  paleGold: '#FFD966',              // Light Yellow
  antiqueGold: '#C9A86C',           // Dark Gold
  charcoal: '#2D3436',
  warmGray: '#636E72',
  platinum: '#DFE6E9',
  ivory: '#FDFBF7',
  luxuryGradient: 'linear-gradient(165deg, #12284B 0%, #1A3562 50%, #1F57A4 100%)',
  goldGradient: 'linear-gradient(135deg, #FFC52F 0%, #FFD966 50%, #C9A86C 100%)',
  cardGradient: 'linear-gradient(145deg, #FDFBF7 0%, #F5F1EB 100%)',
};

export const BAR_PANEL_DARK: PanelDarkTheme = {
  background: '#12284B',
  surface: '#1F57A4',
  accent: '#FFC52F',
  accentLight: '#FFD966',
  text: '#FDFBF7',
  textMuted: 'rgba(253, 251, 247, 0.7)',
  textSubtle: 'rgba(253, 251, 247, 0.5)',
  borderGold: 'rgba(255, 197, 47, 0.3)',
  borderSubtle: 'rgba(255, 197, 47, 0.15)',
  shadowGold: '0 8px 30px rgba(255, 197, 47, 0.3)',
  goldGradient: 'linear-gradient(135deg, #FFC52F 0%, #FFD966 50%, #C9A86C 100%)',
};

export const BAR_PANEL_LIGHT: PanelLightTheme = {
  background: '#FFFFFF',
  surface: '#FDFBF7',
  accent: '#FFC52F',
  text: '#12284B',
  textMuted: '#636E72',
  textSubtle: '#9BA4A9',
  borderGold: 'rgba(255, 197, 47, 0.25)',
  borderSubtle: 'rgba(255, 197, 47, 0.12)',
  badgeBg: 'rgba(18, 40, 75, 0.04)',
};

// ============================================================================
// カフェモード カラーパレット
// ============================================================================

export const CAFE_COLORS_A: ColorsShapeA = {
  background: '#F7F3EE',         // Latte White
  surface: '#FFFFFF',             // Pure White
  surfaceLight: '#EDE0D4',        // Milk Foam
  cardBackground: '#FFFFFF',      // White
  primary: '#2D2420',             // Coffee Black
  charcoal: '#2D2420',
  warmGray: '#9A8A7A',            // Warm Taupe
  accent: '#A07850',              // Espresso Brown
  accentLight: '#C9A86C',         // Champagne Gold
  accentDark: '#7A5C3C',          // Dark Roast
  text: '#2D2420',                // Coffee Black
  textMuted: 'rgba(45, 36, 32, 0.7)',
  textSubtle: 'rgba(45, 36, 32, 0.5)',
  luxuryGradient: 'linear-gradient(165deg, #F7F3EE 0%, #FFFFFF 50%, #EDE0D4 100%)',
  goldGradient: 'linear-gradient(135deg, #A07850 0%, #C9A86C 50%, #7A5C3C 100%)',
  cardGradient: 'linear-gradient(145deg, #FFFFFF 0%, #EDE0D4 100%)',
  borderGold: 'rgba(160, 120, 80, 0.3)',
  borderSubtle: 'rgba(160, 120, 80, 0.15)',
  shadowGold: '0 8px 30px rgba(160, 120, 80, 0.2)',
  shadowDeep: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.1)',
  errorBorder: 'rgba(239, 68, 68, 0.2)',
};

export const CAFE_COLORS_B: ColorsShapeB = {
  deepNavy: '#2D2420',            // Coffee Black
  midnightBlue: '#3D3430',        // Medium Coffee
  royalNavy: '#4D4440',           // Light Coffee
  champagneGold: '#A07850',       // Espresso Brown
  paleGold: '#C9A86C',            // Champagne Gold
  antiqueGold: '#7A5C3C',         // Dark Roast
  charcoal: '#2D2420',
  warmGray: '#9A8A7A',            // Warm Taupe
  platinum: '#E8DDD4',            // Cream Border
  ivory: '#F7F3EE',               // Latte White
  luxuryGradient: 'linear-gradient(165deg, #F7F3EE 0%, #FFFFFF 50%, #EDE0D4 100%)',
  goldGradient: 'linear-gradient(135deg, #A07850 0%, #C9A86C 50%, #7A5C3C 100%)',
  cardGradient: 'linear-gradient(145deg, #FFFFFF 0%, #EDE0D4 100%)',
};

export const CAFE_PANEL_DARK: PanelDarkTheme = {
  background: '#2D2420',          // Coffee Black
  surface: '#3D3430',             // Medium Coffee
  accent: '#A07850',              // Espresso Brown
  accentLight: '#C9A86C',         // Champagne Gold
  text: '#F7F3EE',                // Latte White
  textMuted: 'rgba(247, 243, 238, 0.7)',
  textSubtle: 'rgba(247, 243, 238, 0.5)',
  borderGold: 'rgba(160, 120, 80, 0.3)',
  borderSubtle: 'rgba(160, 120, 80, 0.15)',
  shadowGold: '0 8px 30px rgba(160, 120, 80, 0.3)',
  goldGradient: 'linear-gradient(135deg, #A07850 0%, #C9A86C 50%, #7A5C3C 100%)',
};

export const CAFE_PANEL_LIGHT: PanelLightTheme = {
  background: '#FFFFFF',          // Pure White
  surface: '#EDE0D4',             // Milk Foam
  accent: '#A07850',              // Espresso Brown
  text: '#2D2420',                // Coffee Black
  textMuted: '#9A8A7A',           // Warm Taupe
  textSubtle: '#B0A090',
  borderGold: 'rgba(160, 120, 80, 0.25)',
  borderSubtle: 'rgba(160, 120, 80, 0.12)',
  badgeBg: 'rgba(45, 36, 32, 0.04)',
};

// ============================================================================
// カラー取得ヘルパー
// ============================================================================

export function getColorsA(mode: AppMode): ColorsShapeA {
  return mode === 'cafe' ? CAFE_COLORS_A : BAR_COLORS_A;
}

export function getColorsB(mode: AppMode): ColorsShapeB {
  return mode === 'cafe' ? CAFE_COLORS_B : BAR_COLORS_B;
}

export function getPanelDarkTheme(mode: AppMode): PanelDarkTheme {
  return mode === 'cafe' ? CAFE_PANEL_DARK : BAR_PANEL_DARK;
}

export function getPanelLightTheme(mode: AppMode): PanelLightTheme {
  return mode === 'cafe' ? CAFE_PANEL_LIGHT : BAR_PANEL_LIGHT;
}

// ============================================================================
// 特徴タグ
// ============================================================================

/** バーモード用特徴カテゴリ */
export const BAR_FEATURES = {
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

/** 昼モード用特徴カテゴリ */
export const CAFE_FEATURES = {
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

/** 昼モード用その他設備 */
export const CAFE_OTHER_FACILITIES = [
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

/** 両方モード用特徴カテゴリ */
export const BOTH_FEATURES = {
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

/** 両方モード用その他設備 */
export const BOTH_OTHER_FACILITIES = [
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

export function getFeatureCategories(mode: AppMode) {
  if (mode === 'cafe') return CAFE_FEATURES;
  return BAR_FEATURES;
}

export function getOtherFacilities(mode: AppMode) {
  if (mode === 'cafe') return CAFE_OTHER_FACILITIES;
  return BOTH_OTHER_FACILITIES; // bar mode uses OTHER_FACILITIES from store-application.ts
}
