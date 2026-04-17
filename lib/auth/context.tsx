'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

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
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
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
    await supabase.auth.signOut();
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
        signUp,
        signOut,
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
