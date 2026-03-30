'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  type AdminTheme,
  type AdminThemeColors,
  getAdminColors,
  getStoredAdminTheme,
  setStoredAdminTheme,
} from '@/lib/admin-theme';

interface AdminThemeContextValue {
  theme: AdminTheme;
  colors: AdminThemeColors;
  toggleTheme: () => void;
  isDark: boolean;
  isLight: boolean;
}

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<AdminTheme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(getStoredAdminTheme());
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: AdminTheme = prev === 'dark' ? 'light' : 'dark';
      setStoredAdminTheme(next);
      return next;
    });
  }, []);

  const colors = useMemo(() => getAdminColors(theme), [theme]);

  // body の背景色をテーマに同期させる（min-h-screen 外の余白対策）
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = colors.bg;
    return () => {
      document.body.style.backgroundColor = prev;
    };
  }, [mounted, colors.bg]);
  const isDark = theme === 'dark';
  const isLight = theme === 'light';

  const value = useMemo(
    () => ({ theme, colors, toggleTheme, isDark, isLight }),
    [theme, colors, toggleTheme, isDark, isLight]
  );

  // SSR/ハイドレーション対策: マウント前はダークテーマで表示
  if (!mounted) {
    const darkColors = getAdminColors('dark');
    return (
      <AdminThemeContext.Provider
        value={{ theme: 'dark', colors: darkColors, toggleTheme: () => {}, isDark: true, isLight: false }}
      >
        {children}
      </AdminThemeContext.Provider>
    );
  }

  return (
    <AdminThemeContext.Provider value={value}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme(): AdminThemeContextValue {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) {
    throw new Error('useAdminTheme must be used within AdminThemeProvider');
  }
  return ctx;
}
