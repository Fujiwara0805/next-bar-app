import { createClient } from '@supabase/supabase-js';

/**
 * サーバーサイド用のSupabaseクライアントを作成
 * SUPABASE_SERVICE_ROLE_KEY があればそれを使用（RLSをバイパス）
 * なければ SUPABASE_ANON_KEY を使用（RLSが適用される）
 */
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }

  // サービスロールキーがあればそれを使用（RLSをバイパス）
  const key = supabaseServiceKey || supabaseAnonKey;
  
  if (!key) {
    throw new Error('Neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY is set');
  }

  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
