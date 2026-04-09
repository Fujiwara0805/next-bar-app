/**
 * ============================================
 * ファイルパス: lib/app-mode.ts
 *
 * 機能: アプリモードのカラーパレット・特徴タグ
 *       バーモード固定
 * ============================================
 */

// ============================================================================
// 型定義
// ============================================================================

export type AppMode = 'bar';

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
  accent: '#ffc62d',                  // Brewers Yellow
  accentLight: '#FFD966',             // Light Yellow
  accentDark: '#C9A86C',              // Dark Gold
  text: '#FDFBF7',                    // Off-white
  textMuted: 'rgba(253, 251, 247, 0.7)',
  textSubtle: 'rgba(253, 251, 247, 0.5)',
  luxuryGradient: 'linear-gradient(165deg, #13294b 0%, #1A3562 50%, #1F57A4 100%)',
  goldGradient: 'linear-gradient(135deg, #ffc62d 0%, #FFD966 50%, #C9A86C 100%)',
  cardGradient: 'linear-gradient(145deg, #FDFBF7 0%, #F5F1EB 100%)',
  borderGold: 'rgba(255, 198, 45, 0.3)',
  borderSubtle: 'rgba(255, 198, 45, 0.15)',
  shadowGold: '0 8px 30px rgba(255, 198, 45, 0.3)',
  shadowDeep: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.15)',
  errorBorder: 'rgba(239, 68, 68, 0.3)',
};

export const BAR_COLORS_B: ColorsShapeB = {
  deepNavy: '#13294b',              // Brewers Dark Navy
  midnightBlue: '#1F57A4',          // Brewers Blue
  royalNavy: '#86BFE8',             // Brewers Light Blue
  champagneGold: '#ffc62d',         // Brewers Yellow
  paleGold: '#FFD966',              // Light Yellow
  antiqueGold: '#C9A86C',           // Dark Gold
  charcoal: '#2D3436',
  warmGray: '#636E72',
  platinum: '#DFE6E9',
  ivory: '#FDFBF7',
  luxuryGradient: 'linear-gradient(165deg, #13294b 0%, #1A3562 50%, #1F57A4 100%)',
  goldGradient: 'linear-gradient(135deg, #ffc62d 0%, #FFD966 50%, #C9A86C 100%)',
  cardGradient: 'linear-gradient(145deg, #FDFBF7 0%, #F5F1EB 100%)',
};

export const BAR_PANEL_DARK: PanelDarkTheme = {
  background: '#13294b',
  surface: '#1F57A4',
  accent: '#ffc62d',
  accentLight: '#FFD966',
  text: '#FDFBF7',
  textMuted: 'rgba(253, 251, 247, 0.7)',
  textSubtle: 'rgba(253, 251, 247, 0.5)',
  borderGold: 'rgba(255, 198, 45, 0.3)',
  borderSubtle: 'rgba(255, 198, 45, 0.15)',
  shadowGold: '0 8px 30px rgba(255, 198, 45, 0.3)',
  goldGradient: 'linear-gradient(135deg, #ffc62d 0%, #FFD966 50%, #C9A86C 100%)',
};

export const BAR_PANEL_LIGHT: PanelLightTheme = {
  background: '#FFFFFF',
  surface: '#FDFBF7',
  accent: '#ffc62d',
  text: '#13294b',
  textMuted: '#636E72',
  textSubtle: '#9BA4A9',
  borderGold: 'rgba(255, 198, 45, 0.25)',
  borderSubtle: 'rgba(255, 198, 45, 0.12)',
  badgeBg: 'rgba(19, 41, 75, 0.04)',
};

// ============================================================================
// カラー取得ヘルパー（後方互換性のため関数を維持）
// ============================================================================

export function getColorsA(): ColorsShapeA {
  return BAR_COLORS_A;
}

export function getColorsB(): ColorsShapeB {
  return BAR_COLORS_B;
}

export function getPanelDarkTheme(): PanelDarkTheme {
  return BAR_PANEL_DARK;
}

export function getPanelLightTheme(): PanelLightTheme {
  return BAR_PANEL_LIGHT;
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
