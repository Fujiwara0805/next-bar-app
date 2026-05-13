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
  background: '#13294b',
  surface: '#20385F',
  surfaceLight: '#335280',
  cardBackground: '#F7F3E9',
  primary: '#13294b',
  charcoal: '#141821',
  warmGray: '#4D5567',
  accent: '#ffc82c',
  accentLight: '#ffdf85',
  accentDark: '#C49A33',
  text: '#F7F3E9',
  textMuted: 'rgba(247, 243, 233, 0.76)',
  textSubtle: 'rgba(144, 164, 193, 0.9)',
  luxuryGradient: 'linear-gradient(135deg, #13294b 0%, #20385F 100%)',
  goldGradient: 'linear-gradient(135deg, #ffdf85 0%, #ffc82c 100%)',
  cardGradient: 'linear-gradient(180deg, #F7F3E9 0%, #FFFFFF 100%)',
  borderGold: 'rgba(255, 200, 44, 0.28)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  shadowGold: '0 0 32px rgba(255, 200, 44, 0.22)',
  shadowDeep: '0 16px 40px rgba(0, 0, 0, 0.24)',
  error: '#B3453F',
  errorBg: 'rgba(179, 69, 63, 0.14)',
  errorBorder: 'rgba(179, 69, 63, 0.3)',
};

export const BAR_COLORS_B: ColorsShapeB = {
  deepNavy: '#13294b',
  midnightBlue: '#20385F',
  royalNavy: '#335280',
  champagneGold: '#ffc82c',
  paleGold: '#ffdf85',
  antiqueGold: '#B87333',
  charcoal: '#141821',
  warmGray: '#4D5567',
  platinum: '#DCE1EB',
  ivory: '#F7F3E9',
  luxuryGradient: 'linear-gradient(135deg, #13294b 0%, #20385F 100%)',
  goldGradient: 'linear-gradient(135deg, #ffdf85 0%, #ffc82c 100%)',
  cardGradient: 'linear-gradient(180deg, #F7F3E9 0%, #FFFFFF 100%)',
};

export const BAR_PANEL_DARK: PanelDarkTheme = {
  background: '#13294b',
  surface: '#20385F',
  accent: '#ffc82c',
  accentLight: '#ffdf85',
  text: '#F7F3E9',
  textMuted: 'rgba(247, 243, 233, 0.76)',
  textSubtle: 'rgba(144, 164, 193, 0.9)',
  borderGold: 'rgba(255, 200, 44, 0.28)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  shadowGold: '0 0 32px rgba(255, 200, 44, 0.22)',
  goldGradient: 'linear-gradient(135deg, #ffdf85 0%, #ffc82c 100%)',
};

export const BAR_PANEL_LIGHT: PanelLightTheme = {
  background: '#FFFFFF',
  surface: '#F7F8FA',
  accent: '#13294b',
  text: '#13294b',
  textMuted: '#4D5567',
  textSubtle: '#8D95A6',
  borderGold: 'rgba(255, 200, 44, 0.25)',
  borderSubtle: '#DCE1EB',
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
