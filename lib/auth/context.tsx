'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import {
  getLineIdToken,
  lineLogin as liffLoginFn,
  getLiff,
  isLineIdTokenExpired,
} from '@/lib/line/liff';

type UserRow = Database['public']['Tables']['users']['Row'];
type Store = Database['public']['Tables']['stores']['Row'];

type AccountType = 'platform' | 'store' | 'customer';

interface AuthContextType {
  user: User | null;
  profile: UserRow | null;
  store: Store | null;
  accountType: AccountType | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{
    error: Error | null;
    accountType?: AccountType;
    profile?: UserRow | null;
    store?: Store | null;
  }>;
  signInWithLine: () => Promise<{ error: Error | null; accountType?: AccountType }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function setAuthCookies(accountType: AccountType, storeId?: string) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `account-type=${accountType}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  if (storeId) {
    document.cookie = `store-id=${storeId}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  } else {
    document.cookie = 'store-id=; Path=/; Max-Age=0';
  }
}

function clearAuthCookies() {
  document.cookie = 'account-type=; Path=/; Max-Age=0';
  document.cookie = 'store-id=; Path=/; Max-Age=0';
}

function accountTypeForRole(role: UserRow['role']): AccountType {
  return role === 'admin' ? 'platform' : 'customer';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserRow | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolveAccount = async (authUserId: string) => {
      const { data: userRow } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUserId)
        .maybeSingle();

      if (userRow) {
        const nextAccountType = accountTypeForRole(userRow.role);
        setProfile(userRow);
        setAccountType(nextAccountType);
        setStore(null);
        setAuthCookies(nextAccountType);
        return;
      }

      const { data: storeData } = await supabase
        .from('stores')
        .select('*')
        .eq('id', authUserId)
        .maybeSingle();

      if (storeData) {
        setStore(storeData);
        setAccountType('store');
        setProfile(null);
        setAuthCookies('store', storeData.id);
      }
    };

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await resolveAccount(session.user.id);
      }

      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await resolveAccount(session.user.id);
        } else {
          setProfile(null);
          setStore(null);
          setAccountType(null);
          clearAuthCookies();
        }
      })();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const { data: userRow } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (userRow) {
          const nextAccountType = accountTypeForRole(userRow.role);
          return { error: null, accountType: nextAccountType, profile: userRow };
        }

        const { data: storeData } = await supabase
          .from('stores')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (storeData) {
          return { error: null, accountType: 'store' as AccountType, store: storeData };
        }

        throw new Error('アカウント情報が見つかりません');
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithLine = async (): Promise<{ error: Error | null; accountType?: AccountType }> => {
    try {
      const liff = await getLiff();
      if (!liff) {
        return { error: new Error('LIFF SDK is not available (LIFF_ID not configured or not in browser)') };
      }

      // 未ログインならLIFF経由でLINEログインを開始（ブラウザならリダイレクト）
      if (!liff.isLoggedIn()) {
        await liffLoginFn();
        // リダイレクトが発生するため、以降の処理はこの関数スコープ外で再実行される想定
        return { error: null };
      }

      let idToken = await getLineIdToken();

      // LIFF SDKはキャッシュされた id_token を返すため、期限切れなら logout→login で強制リフレッシュ
      if (!idToken || isLineIdTokenExpired(idToken)) {
        try {
          liff.logout();
        } catch (err) {
          console.error('[LINE] logout error:', err);
        }
        liff.login({ redirectUri: window.location.href });
        // リダイレクトが発生するので以降は実行されない
        return { error: null };
      }

      // サーバーで検証 + Supabase認証 magiclink hashed_token 発行
      const res = await fetch('/api/auth/line-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errCode = typeof errJson?.error === 'string' ? errJson.error : '';
        const errMessage = typeof errJson?.message === 'string' ? errJson.message : '';

        // サーバー側検証で expired が出た場合（LIFFキャッシュと実際のズレ）も logout→login でリカバリ
        if (
          errCode === 'line_verify_failed' &&
          /IdToken expired|id_token expired/i.test(errMessage)
        ) {
          try {
            liff.logout();
          } catch (err) {
            console.error('[LINE] logout error:', err);
          }
          liff.login({ redirectUri: window.location.href });
          return { error: null };
        }

        return {
          error: new Error(errMessage || errCode || 'LINE exchange failed'),
        };
      }

      const { hashedToken } = (await res.json()) as {
        email: string;
        hashedToken: string;
      };

      // magiclinkトークンをOTPとして検証 → Supabaseセッション確立
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        type: 'magiclink',
        token_hash: hashedToken,
      });

      if (verifyErr) {
        return { error: verifyErr };
      }

      // ここで onAuthStateChange が発火し、resolveAccount が走るため
      // accountType は呼び出し側で状態を参照する
      return { error: null, accountType: 'customer' };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('ユーザー作成に失敗しました');

      // DB trigger `handle_new_user` inserts into public.users with role='customer' automatically.
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    clearAuthCookies();
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('signOut error:', e);
    }
    // SPA の state レースを避けて、確実に /login へフルリロード遷移させる
    if (typeof window !== 'undefined') {
      window.location.assign('/login');
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    const { data: userRow } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (userRow) setProfile(userRow);
    const { data: storeData } = await supabase
      .from('stores')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (storeData) setStore(storeData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        store,
        accountType,
        session,
        loading,
        signIn,
        signInWithLine,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
