// ============================================
// GET /api/me/check-ins
// ログイン中ユーザー自身の来店履歴（store_check_ins）を新しい順で返す。
// 会員ページ（マイページ）の「来店履歴」表示に使う（副作用なし・読み取り専用）。
// 認証 = Bearer（supabase.auth.getSession のトークン）または Cookie セッション。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  const limitParam = Number(request.nextUrl.searchParams.get('limit'));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(Math.floor(limitParam), MAX_LIMIT)
      : 50;

  // Bearer 優先・Cookie フォールバック（/api/me/event-stamp-progress と同方式）
  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  let cookieToken: string | null = null;
  const cookieMatch = (request.headers.get('cookie') ?? '').match(
    /sb-[^=]+-auth-token=([^;]+)/
  );
  if (cookieMatch) {
    try {
      const raw = decodeURIComponent(cookieMatch[1]);
      const parsed = raw.startsWith('base64-')
        ? JSON.parse(
            Buffer.from(raw.slice('base64-'.length), 'base64').toString('utf-8')
          )
        : JSON.parse(raw);
      cookieToken =
        typeof parsed?.access_token === 'string' ? parsed.access_token : null;
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

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: checkIns, error: ciErr } = await admin
    .from('store_check_ins')
    .select('id, store_id, checked_in_at, source')
    .eq('user_id', user.id)
    .order('checked_in_at', { ascending: false })
    .limit(limit);
  if (ciErr) {
    console.error('[me/check-ins] fetch error', ciErr);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  const rows = checkIns ?? [];
  const storeIds = Array.from(new Set(rows.map((r) => r.store_id)));

  const storeMap = new Map<
    string,
    { name: string; image_url: string | null }
  >();
  if (storeIds.length > 0) {
    const { data: stores } = await admin
      .from('stores')
      .select('id, name, image_urls')
      .in('id', storeIds);
    for (const s of stores ?? []) {
      const images = (s.image_urls as string[] | null) ?? [];
      storeMap.set(s.id, {
        name: s.name,
        image_url: images.length > 0 ? images[0] : null,
      });
    }
  }

  const history = rows.map((r) => {
    const store = storeMap.get(r.store_id);
    return {
      id: r.id,
      store_id: r.store_id,
      store_name: store?.name ?? '不明な店舗',
      store_image_url: store?.image_url ?? null,
      checked_in_at: r.checked_in_at,
      source: r.source,
    };
  });

  const uniqueStoreCount = storeIds.length;

  return NextResponse.json({
    history,
    total: history.length,
    unique_store_count: uniqueStoreCount,
  });
}
