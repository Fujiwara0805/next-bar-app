'use client';

// ============================================
// LiffProvider: LINE LIFF SDK状態管理コンテキスト
// AuthProviderの外側に配置し、LINE環境情報を提供
// ============================================

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { LiffContextType, LineProfile } from './types';
import {
  getLiff,
  getLineProfile,
  getLineIdToken,
  lineLogin as liffLoginFn,
  lineLogout as liffLogoutFn,
} from './liff';

const LiffContext = createContext<LiffContextType | undefined>(undefined);

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [isInLine, setIsInLine] = useState(false);
  const [isLineLoggedIn, setIsLineLoggedIn] = useState(false);
  const [lineProfile, setLineProfile] = useState<LineProfile | null>(null);
  const [liffError, setLiffError] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);

  // LIFF初期化
  useEffect(() => {
    const initLiff = async () => {
      try {
        const liff = await getLiff();

        if (!liff) {
          // LIFF IDが未設定 or SSR環境 → LINE機能無効で正常動作
          setIsLiffReady(true);
          return;
        }

        setIsInLine(liff.isInClient());
        setIsLineLoggedIn(liff.isLoggedIn());

        if (liff.isLoggedIn()) {
          const [profile, token] = await Promise.all([
            getLineProfile(),
            getLineIdToken(),
          ]);
          setLineProfile(profile);
          setIdToken(token);
        }

        setIsLiffReady(true);
      } catch (error) {
        console.error('[LiffProvider] 初期化エラー:', error);
        setLiffError(error instanceof Error ? error.message : 'LIFF初期化に失敗しました');
        setIsLiffReady(true); // エラーでもアプリは使えるようにする
      }
    };

    initLiff();
  }, []);

  const liffLogin = useCallback(async () => {
    await liffLoginFn();
  }, []);

  const liffLogout = useCallback(async () => {
    await liffLogoutFn();
    setLineProfile(null);
    setIsLineLoggedIn(false);
    setIdToken(null);
  }, []);

  const getIdToken = useCallback(() => {
    return idToken;
  }, [idToken]);

  return (
    <LiffContext.Provider
      value={{
        isLiffReady,
        isInLine,
        isLineLoggedIn,
        lineProfile,
        liffError,
        liffLogin,
        liffLogout,
        getIdToken,
      }}
    >
      {children}
    </LiffContext.Provider>
  );
}

/**
 * LiffContextを利用するフック
 * LiffProviderの外では使用不可
 */
export function useLiff() {
  const context = useContext(LiffContext);
  if (context === undefined) {
    throw new Error('useLiff must be used within a LiffProvider');
  }
  return context;
}
