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

/**
 * 「ユーザーが明示的にログアウトしたかどうか」を localStorage に保持。
 * 立っている間は LINE 自動再ログインを行わない (ログアウト後に勝手に
 * 再ログインされるのを防ぐ)。
 */
const SIGNED_OUT_FLAG_KEY = 'nikenme:user-signed-out';

function markSignedOut() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIGNED_OUT_FLAG_KEY, '1');
    }
  } catch {
    /* ignore */
  }
}

function clearSignedOutFlag() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SIGNED_OUT_FLAG_KEY);
    }
  } catch {
    /* ignore */
  }
}

function isSignedOutFlagSet(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(SIGNED_OUT_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * LIFF id_token を Supabase セッションへ交換する共通処理。
 * - 手動ログイン (ログイン画面の「LINEで続ける」) でも
 * - 自動再ログイン (AuthProvider 起動時の LIFF ログイン状態検出) でも
 * 同じロジックを共有する。
 *
 * id_token が期限切れなら liff.login() でリダイレクト (関数からは戻らない場合あり)。
 * `silent=true` の場合はリダイレクト系の副作用を抑制し、失敗時は false を返すだけ。
 */
async function performLineSignIn(silent: boolean): Promise<{
  ok: boolean;
  error?: Error;
}> {
  const liff = await getLiff();
  if (!liff) return { ok: false };

  if (!liff.isLoggedIn()) {
    if (silent) return { ok: false };
    await liffLoginFn();
    return { ok: false };
  }

  let idToken = await getLineIdToken();
  if (!idToken || isLineIdTokenExpired(idToken)) {
    if (silent) return { ok: false };
    try {
      liff.logout();
    } catch (err) {
      console.error('[LINE] logout error:', err);
    }
    liff.login({ redirectUri: window.location.href });
    return { ok: false };
  }

  let res: Response;
  try {
    res = await fetch('/api/auth/line-exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
  } catch (err) {
    return { ok: false, error: err as Error };
  }

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    const errCode = typeof errJson?.error === 'string' ? errJson.error : '';
    const errMessage = typeof errJson?.message === 'string' ? errJson.message : '';
    if (
      errCode === 'line_verify_failed' &&
      /IdToken expired|id_token expired/i.test(errMessage)
    ) {
      if (silent) return { ok: false };
      try {
        liff.logout();
      } catch (err) {
        console.error('[LINE] logout error:', err);
      }
      liff.login({ redirectUri: window.location.href });
      return { ok: false };
    }
    return { ok: false, error: new Error(errMessage || errCode || 'LINE exchange failed') };
  }

  const { hashedToken } = (await res.json()) as { email: string; hashedToken: string };
  const { error: verifyErr } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: hashedToken,
  });
  if (verifyErr) return { ok: false, error: verifyErr };

  // 成功した時点で signed-out フラグはクリア (再ログイン成立)
  clearSignedOutFlag();
  return { ok: true };
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

    let cancelled = false;

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (session?.user) {
        setSession(session);
        setUser(session.user);
        await resolveAccount(session.user.id);
        if (!cancelled) setLoading(false);
        return;
      }

      // Supabase セッションがない場合: ユーザーが明示的にログアウト済みでなければ
      // LIFF (LINEログイン状態) を起点に自動再ログインを試みる。
      // これにより /mypage / /mypage/qr / /liff/* など全ページで
      // 「LINEに一度ログインしたら、ログアウトするまで永続」を実現する。
      if (!isSignedOutFlagSet()) {
        const result = await performLineSignIn(true /* silent */);
        if (cancelled) return;
        if (result.ok) {
          // verifyOtp が onAuthStateChange を発火させ、setUser/resolveAccount が走る。
          // loading は onAuthStateChange のリスナで false に落とす。
          return;
        }
      }

      // 自動再ログインが不可 / スキップされた → 通常の未ログイン状態として完了
      if (!cancelled) {
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (cancelled) return;
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
        if (!cancelled) setLoading(false);
      })();
    });

    return () => {
      cancelled = true;
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
        // 明示的にログインし直したので signed-out フラグを解除
        clearSignedOutFlag();

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
    // 手動ログイン (button) なので silent=false: id_token 期限切れ時は LIFF login() で
    // リダイレクトしてユーザーに再認証してもらう。
    const result = await performLineSignIn(false);
    if (result.error) return { error: result.error };
    if (!result.ok) return { error: null }; // リダイレクト中などで戻り値なし
    return { error: null, accountType: 'customer' };
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
    // 自動再ログインの誤発火を防ぐため signed-out フラグを立てる。
    // 次回の手動ログイン (LINE / メール) で performLineSignIn / signIn 内で解除される。
    markSignedOut();
    // LIFF が立ち上がっている場合は LIFF も一緒にログアウト。
    // (LIFF が isLoggedIn のままだと AuthProvider の自動再ログインが復帰させてしまう)
    try {
      const liff = await getLiff();
      if (liff && liff.isLoggedIn()) {
        liff.logout();
      }
    } catch (e) {
      console.error('LIFF logout error:', e);
    }
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
