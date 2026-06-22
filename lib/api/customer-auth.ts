// ============================================================
// 会員（customer）向け API の共通認証ヘルパー。
// Bearer トークン優先・Cookie セッションをフォールバックで解決し、
// 検証済みの user_id と service-role の admin クライアントを返す。
// （/api/me/check-ins などで個別にインラインしていた処理を共通化）
// ============================================================

import type { NextRequest } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export type CustomerAuthOk = {
  ok: true;
  userId: string;
  admin: SupabaseClient<Database>;
};
export type CustomerAuthErr = { ok: false; status: number; error: string };

/** Bearer 優先・Cookie フォールバックでアクセストークンを取り出す */
function extractAccessToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (bearer) return bearer;

  const cookieMatch = (request.headers.get('cookie') ?? '').match(
    /sb-[^=]+-auth-token=([^;]+)/
  );
  if (!cookieMatch) return null;
  try {
    const raw = decodeURIComponent(cookieMatch[1]);
    const parsed = raw.startsWith('base64-')
      ? JSON.parse(
          Buffer.from(raw.slice('base64-'.length), 'base64').toString('utf-8')
        )
      : JSON.parse(raw);
    return typeof parsed?.access_token === 'string' ? parsed.access_token : null;
  } catch {
    return null;
  }
}

/**
 * リクエストからログイン中ユーザーを解決する。
 * 成功時は { ok:true, userId, admin } を、失敗時は { ok:false, status, error } を返す。
 */
export async function resolveCustomerUser(
  request: NextRequest
): Promise<CustomerAuthOk | CustomerAuthErr> {
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return { ok: false, status: 500, error: 'server_misconfigured' };
  }
  const accessToken = extractAccessToken(request);
  if (!accessToken) return { ok: false, status: 401, error: 'unauthorized' };

  const anon = createClient<Database>(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error,
  } = await anon.auth.getUser(accessToken);
  if (error || !user) return { ok: false, status: 401, error: 'unauthorized' };

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return { ok: true, userId: user.id, admin };
}
