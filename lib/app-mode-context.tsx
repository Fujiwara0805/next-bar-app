/**
 * ============================================
 * ファイルパス: lib/app-mode-context.tsx
 *
 * 機能: アプリモードのReact Context
 *       手動トグルでバー/カフェを切替、localStorageで永続化
 * ============================================
 */

'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  type AppMode,
  type ColorsShapeA,
  type ColorsShapeB,
  type PanelDarkTheme,
  type PanelLightTheme,
  getStoredMode,
  setStoredMode,
  getColorsA,
  getColorsB,
  getPanelDarkTheme,
  getPanelLightTheme,
} from '@/lib/app-mode';

interface AppModeContextType {
  mode: AppMode;
  isBar: boolean;
  isCafe: boolean;
  /** Shape A カラー（map, map-view, landing 用） */
  colorsA: ColorsShapeA;
  /** Shape B カラー（store-list, store/[id] 用） */
  colorsB: ColorsShapeB;
  /** StoreDetailPanel ダークテーマ */
  panelDark: PanelDarkTheme;
  /** StoreDetailPanel ライトテーマ */
  panelLight: PanelLightTheme;
  /** モードをトグル（bar↔cafe） */
  toggleMode: () => void;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AppMode>('bar');

  // クライアントサイドでlocalStorageから初期値を読み込み
  useEffect(() => {
    setMode(getStoredMode());
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next: AppMode = prev === 'bar' ? 'cafe' : 'bar';
      setStoredMode(next);
      return next;
    });
  }, []);

  const value = useMemo<AppModeContextType>(() => ({
    mode,
    isBar: mode === 'bar',
    isCafe: mode === 'cafe',
    colorsA: getColorsA(mode),
    colorsB: getColorsB(mode),
    panelDark: getPanelDarkTheme(mode),
    panelLight: getPanelLightTheme(mode),
    toggleMode,
  }), [mode, toggleMode]);

  return (
    <AppModeContext.Provider value={value}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  const context = useContext(AppModeContext);
  if (context === undefined) {
    throw new Error('useAppMode must be used within an AppModeProvider');
  }
  return context;
}
