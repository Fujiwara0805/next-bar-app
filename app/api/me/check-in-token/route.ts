// ============================================
// POST /api/me/check-in-token
// ログイン中の顧客に、自分の来店チェックインQR用トークンを発行する（Phase 11）。
// サーバー側で QR_SIGNATURE_SECRET を用いて HMAC を生成し、{u,t,s} を返す。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildCustomerCheckInToken } from '@/lib/qr/signature';
import type { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  // Cookie ベースで Supabase セッションを読み取るか、Bearer を受け付けるかの2系統
  // ここでは Authorization ヘッダ（クライアントが supabase.auth.getSession で取得したもの）、
  // かつ Cookie も試みる。マイページは SSRでのアクセスがないのでBearer優先。
  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  // Cookie にある Supabase セッションをパース（client-side 既定のキー）
  // ただし Cookie 経由のトークン取得は Next.js API では標準的ではないので、
  // Bearer がない場合は fetch credentials: 'include' での自動送信は期待できない。
  // マイページ画面から `credentials: 'same-origin'` で同オリジン Cookie が送られる。
  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookieTokenMatch = cookieHeader.match(
    /sb-[^=]+-auth-token=([^;]+)/
  );
  let cookieToken: string | null = null;
  if (cookieTokenMatch) {
    try {
      const raw = decodeURIComponent(cookieTokenMatch[1]);
      const parsed = raw.startsWith('base64-')
        ? JSON.parse(
            Buffer.from(raw.slice('base64-'.length), 'base64').toString(
              'utf-8'
            )
          )
        : JSON.parse(raw);
      cookieToken =
        typeof parsed?.access_token === 'string'
          ? parsed.access_token
          : null;
    } catch {
      cookieToken = null;
    }
  }

  const accessToken = bearer || cookieToken;
  if (!accessToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const anon = createClient<Database>(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await anon.auth.getUser(accessToken);
  if (error || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const token = buildCustomerCheckInToken(user.id);
    return NextResponse.json(token);
  } catch (err) {
    console.error('[me/check-in-token] sign error', err);
    return NextResponse.json({ error: 'sign_failed' }, { status: 500 });
  }
}
