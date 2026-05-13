// ============================================
// Admin Dashboard テーマ定義（ライトモード固定）
// ============================================

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

  // Accent
  accent: string;
  accentLight: string;
  accentBg: string;
  /** accent 背景上に乗せるテキスト/アイコン色 */
  accentForeground: string;

  // Borders
  border: string;
  borderSubtle: string;

  // Status colors
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  info: string;
  infoBg: string;
}

// Brewer Navy + Brass Yellow ブランドカラー (DESIGN.md 準拠)
// 管理画面はライト背景・白カード・ボーダー中心で情報密度を確保する。
export const ADMIN_LIGHT_COLORS: AdminThemeColors = {
  bg: '#F7F8FA',
  bgCard: '#FFFFFF',
  bgCardHover: '#F7F3E9',
  bgInput: '#FFFFFF',
  bgElevated: '#FFFFFF',

  text: '#141821',
  textMuted: '#4D5567',
  textSubtle: '#8D95A6',

  accent: '#13294b',
  accentLight: '#335280',
  accentBg: 'rgba(19, 41, 75, 0.08)',
  accentForeground: '#F7F3E9',

  border: '#DCE1EB',
  borderSubtle: '#EEF0F4',

  success: '#3E8E6B',
  successBg: 'rgba(62, 142, 107, 0.12)',
  warning: '#C49A33',
  warningBg: 'rgba(196, 154, 51, 0.14)',
  danger: '#B3453F',
  dangerBg: 'rgba(179, 69, 63, 0.10)',
  info: '#3B5A87',
  infoBg: 'rgba(59, 90, 135, 0.10)',
};

export function getAdminColors(): AdminThemeColors {
  return ADMIN_LIGHT_COLORS;
}
