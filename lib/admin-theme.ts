// ============================================
// Admin Dashboard テーマ定義
// Dark/Light 切替用カラートークン
// ============================================

export type AdminTheme = 'dark' | 'light';

export interface AdminThemeColors {
  // Background
  bg: string;
  bgCard: string;
  bgCardHover: string;
  bgInput: string;
  bgElevated: string;

  // Text
  text: string;
  textMuted: string;
  textSubtle: string;

  // Accent — テーマで切替: Light=Navy / Dark=Yellow（背景に対するコントラスト確保）
  accent: string;
  accentLight: string;
  accentBg: string;
  /** accent 背景上に乗せるテキスト/アイコン色。Light=オフホワイト / Dark=Navy */
  accentForeground: string;

  // Borders
  border: string;
  borderSubtle: string;

  // Status colors (same in both themes)
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  info: string;
  infoBg: string;
}

// Brewer Navy + Yellow ブランドカラーに統一 (DESIGN.md 準拠)
// Navy: #13294b / Yellow: #ffc62d (= #ffc82c) / Off-white (cream): #F7F3E9
//
// ルール:
//   - Navy 背景 → text = オフホワイト(#F7F3E9) or イエロー(#ffc62d)
//   - オフホワイト背景 → text = Navy(#13294b) (アクセントのみ Yellow)
//   - イエロー背景 → text = Navy(#13294b)
export const ADMIN_DARK_COLORS: AdminThemeColors = {
  bg: '#13294b', // Brewer Navy 基調
  bgCard: 'rgba(247,243,233,0.06)', // ネイビー上のカード: オフホワイト 6%
  bgCardHover: 'rgba(255,198,45,0.10)',
  bgInput: 'rgba(247,243,233,0.08)',
  bgElevated: 'rgba(247,243,233,0.10)',

  text: '#F7F3E9', // オフホワイト
  textMuted: '#D7CBB3', // オフホワイト系ミュート
  textSubtle: '#A79A80',

  // Dark: Navy 背景上ではアクセント = Yellow（コントラスト確保）
  accent: '#ffc62d', // イエロー
  accentLight: '#ffdf85',
  accentBg: 'rgba(255,198,45,0.14)',
  accentForeground: '#13294b', // Yellow背景上のテキスト = Navy

  border: 'rgba(255,198,45,0.24)',
  borderSubtle: 'rgba(247,243,233,0.12)',

  success: '#22c55e',
  successBg: 'rgba(34,197,94,0.12)',
  warning: '#ffc62d',
  warningBg: 'rgba(255,198,45,0.12)',
  danger: '#ef4444',
  dangerBg: 'rgba(239,68,68,0.12)',
  info: '#ffc62d',
  infoBg: 'rgba(255,198,45,0.12)',
};

export const ADMIN_LIGHT_COLORS: AdminThemeColors = {
  bg: '#F7F3E9', // オフホワイト(Cream) 基調
  bgCard: '#ffffff',
  bgCardHover: '#F0E9D6',
  bgInput: '#F0E9D6',
  bgElevated: '#ffffff',

  text: '#13294b', // Brewer Navy
  textMuted: '#2E4267', // Navy 70%
  textSubtle: '#5A6E8E', // Navy 50%

  // Light: オフホワイト背景上ではアクセント = Navy（イエローはコントラスト不足）
  accent: '#13294b', // Navy
  accentLight: '#2E4267',
  accentBg: 'rgba(19,41,75,0.10)',
  accentForeground: '#F7F3E9', // Navy背景上のテキスト = オフホワイト

  border: 'rgba(19,41,75,0.16)',
  borderSubtle: 'rgba(19,41,75,0.08)',

  success: '#16a34a',
  successBg: 'rgba(22,163,74,0.10)',
  warning: '#b4861c',
  warningBg: 'rgba(255,198,45,0.18)',
  danger: '#dc2626',
  dangerBg: 'rgba(220,38,38,0.08)',
  info: '#13294b',
  infoBg: 'rgba(19,41,75,0.08)',
};

const STORAGE_KEY = 'nikenme-admin-theme';

export function getAdminColors(theme: AdminTheme): AdminThemeColors {
  return theme === 'dark' ? ADMIN_DARK_COLORS : ADMIN_LIGHT_COLORS;
}

export function getStoredAdminTheme(): AdminTheme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  return 'dark';
}

export function setStoredAdminTheme(theme: AdminTheme): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
}
