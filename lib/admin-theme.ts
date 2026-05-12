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

// Brewer Navy + Yellow ブランドカラー (DESIGN.md 準拠)
// Navy: #13294b / Yellow: #ffc62d / Off-white (cream): #F7F3E9
//
// ルール（ライト基調）:
//   - オフホワイト背景 → text = Navy(#13294b) (アクセントのみ Yellow)
//   - イエロー背景 → text = Navy(#13294b)
export const ADMIN_LIGHT_COLORS: AdminThemeColors = {
  bg: '#F7F3E9', // オフホワイト(Cream) 基調
  bgCard: '#ffffff',
  bgCardHover: '#F0E9D6',
  bgInput: '#F0E9D6',
  bgElevated: '#ffffff',

  text: '#13294b', // Brewer Navy
  textMuted: '#2E4267', // Navy 70%
  textSubtle: '#5A6E8E', // Navy 50%

  // オフホワイト背景上のアクセント = Navy
  accent: '#13294b',
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

export function getAdminColors(): AdminThemeColors {
  return ADMIN_LIGHT_COLORS;
}
