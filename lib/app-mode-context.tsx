/**
 * ============================================
 * ファイルパス: lib/app-mode-context.tsx
 *
 * 機能: アプリモードのReact Context
 *       バーモード固定
 * ============================================
 */

'use client';

import { createContext, useContext, useMemo } from 'react';
import {
  type AppMode,
  type ColorsShapeA,
  type ColorsShapeB,
  type PanelDarkTheme,
  type PanelLightTheme,
  BAR_COLORS_A,
  BAR_COLORS_B,
  BAR_PANEL_DARK,
  BAR_PANEL_LIGHT,
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
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<AppModeContextType>(() => ({
    mode: 'bar',
    isBar: true,
    isCafe: false,
    colorsA: BAR_COLORS_A,
    colorsB: BAR_COLORS_B,
    panelDark: BAR_PANEL_DARK,
    panelLight: BAR_PANEL_LIGHT,
  }), []);

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
