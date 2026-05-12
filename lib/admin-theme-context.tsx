'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  type AdminThemeColors,
  getAdminColors,
} from '@/lib/admin-theme';

interface AdminThemeContextValue {
  colors: AdminThemeColors;
}

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const colors = useMemo(() => getAdminColors(), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // body の背景色をテーマに同期させる（min-h-screen 外の余白対策）
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = colors.bg;
    return () => {
      document.body.style.backgroundColor = prev;
    };
  }, [mounted, colors.bg]);

  const value = useMemo(() => ({ colors }), [colors]);

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
