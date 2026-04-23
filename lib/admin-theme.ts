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

  // Accent (gold — same in both themes)
  accent: string;
  accentLight: string;
  accentBg: string;

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
// Navy: #13294b / Yellow: #ffc82c / Off-white: #F7F3E9
export const ADMIN_DARK_COLORS: AdminThemeColors = {
  bg: '#0B1930',
  bgCard: 'rgba(255,255,255,0.03)',
  bgCardHover: 'rgba(255,200,44,0.05)',
  bgInput: 'rgba(255,255,255,0.04)',
  bgElevated: 'rgba(255,255,255,0.06)',

  text: '#F7F3E9',
  textMuted: '#90A4C1',
  textSubtle: '#607692',

  accent: '#ffc82c',
  accentLight: '#ffdf85',
  accentBg: 'rgba(255,200,44,0.10)',

  border: 'rgba(255,200,44,0.12)',
  borderSubtle: 'rgba(255,255,255,0.05)',

  success: '#22c55e',
  successBg: 'rgba(34,197,94,0.08)',
  warning: '#f59e0b',
  warningBg: 'rgba(245,158,11,0.08)',
  danger: '#ef4444',
  dangerBg: 'rgba(239,68,68,0.08)',
  info: '#3B5A87',
  infoBg: 'rgba(59,90,135,0.12)',
};

export const ADMIN_LIGHT_COLORS: AdminThemeColors = {
  bg: '#F7F8FA',
  bgCard: '#ffffff',
  bgCardHover: '#EEF0F4',
  bgInput: '#EEF0F4',
  bgElevated: '#ffffff',

  text: '#13294b',
  textMuted: '#4D5567',
  textSubtle: '#8DA2C4',

  accent: '#ffc82c',
  accentLight: '#ffdf85',
  accentBg: 'rgba(255,200,44,0.12)',

  border: '#DCE1EB',
  borderSubtle: '#EEF0F4',

  success: '#16a34a',
  successBg: 'rgba(22,163,74,0.08)',
  warning: '#d97706',
  warningBg: 'rgba(217,119,6,0.08)',
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
