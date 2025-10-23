'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Store = Database['public']['Tables']['stores']['Row'];

type AccountType = 'platform' | 'store';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  store: Store | null;
  accountType: AccountType | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ 
    error: Error | null; 
    accountType?: AccountType; 
    profile?: Profile | null;
    store?: Store | null;
  }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // まずprofilesテーブルをチェック（運営会社アカウント）
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileData) {
          setProfile(profileData);
          setAccountType('platform');
          setStore(null);
        } else {
          // profilesになければstoresテーブルをチェック（店舗アカウント）
          const { data: storeData } = await supabase
            .from('stores')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (storeData) {
            setStore(storeData);
            setAccountType('store');
            setProfile(null);
          }
        }
      }

      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // まずprofilesテーブルをチェック（運営会社アカウント）
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileData) {
            setProfile(profileData);
            setAccountType('platform');
            setStore(null);
          } else {
            // profilesになければstoresテーブルをチェック（店舗アカウント）
            const { data: storeData } = await supabase
              .from('stores')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            if (storeData) {
              setStore(storeData);
              setAccountType('store');
              setProfile(null);
            }
          }
        } else {
          setProfile(null);
          setStore(null);
          setAccountType(null);
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

      // ログイン成功後、アカウントタイプを判定
      if (data.user) {
        // まずprofilesテーブルをチェック（運営会社アカウント）
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileData) {
          return { error: null, accountType: 'platform' as AccountType, profile: profileData };
        }

        // profilesになければstoresテーブルをチェック（店舗アカウント）
        const { data: storeData } = await supabase
          .from('stores')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (storeData) {
          return { error: null, accountType: 'store' as AccountType, store: storeData };
        }

        // どちらにも存在しない場合
        throw new Error('アカウント情報が見つかりません');
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      console.log('Starting platform account sign up process...');
      
      // Supabaseでユーザー作成（運営会社アカウント用）
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            account_type: 'platform',
          }
        }
      });

      if (error) {
        console.error('Auth sign up error:', error);
        throw error;
      }
      
      if (!data.user) {
        console.error('No user returned from sign up');
        throw new Error('ユーザー作成に失敗しました');
      }

      console.log('User created:', data.user.id);

      // 運営会社のプロフィールを作成
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email,
          display_name: displayName,
          is_business: true, // 運営会社は常にtrue
        } as any);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw new Error(`プロフィール作成に失敗: ${profileError.message}`);
      }

      console.log('Profile created successfully');

      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
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
