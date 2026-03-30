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

export const ADMIN_DARK_COLORS: AdminThemeColors = {
  bg: '#0f172a',
  bgCard: 'rgba(255,255,255,0.02)',
  bgCardHover: 'rgba(255,255,255,0.04)',
  bgInput: 'rgba(255,255,255,0.04)',
  bgElevated: 'rgba(255,255,255,0.06)',

  text: '#f8fafc',
  textMuted: '#94a3b8',
  textSubtle: '#64748b',

  accent: '#C9A86C',
  accentLight: '#E8D5B7',
  accentBg: 'rgba(201,168,108,0.06)',

  border: 'rgba(255,255,255,0.08)',
  borderSubtle: 'rgba(255,255,255,0.04)',

  success: '#22c55e',
  successBg: 'rgba(34,197,94,0.08)',
  warning: '#f59e0b',
  warningBg: 'rgba(245,158,11,0.08)',
  danger: '#ef4444',
  dangerBg: 'rgba(239,68,68,0.08)',
  info: '#3b82f6',
  infoBg: 'rgba(59,130,246,0.08)',
};

export const ADMIN_LIGHT_COLORS: AdminThemeColors = {
  bg: '#f8fafc',
  bgCard: '#ffffff',
  bgCardHover: '#f1f5f9',
  bgInput: '#f1f5f9',
  bgElevated: '#ffffff',

  text: '#0f172a',
  textMuted: '#475569',
  textSubtle: '#94a3b8',

  accent: '#C9A86C',
  accentLight: '#B8956E',
  accentBg: 'rgba(201,168,108,0.08)',

  border: '#e2e8f0',
  borderSubtle: '#f1f5f9',

  success: '#16a34a',
  successBg: 'rgba(22,163,74,0.08)',
  warning: '#d97706',
  warningBg: 'rgba(217,119,6,0.08)',
  danger: '#dc2626',
  dangerBg: 'rgba(220,38,38,0.08)',
  info: '#2563eb',
  infoBg: 'rgba(37,99,235,0.08)',
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
