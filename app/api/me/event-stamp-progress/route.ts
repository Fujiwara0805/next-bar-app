// ============================================
// GET /api/me/event-stamp-progress?eventIds=a,b,c
// ログイン中ユーザーの、指定イベント群におけるスタンプ進捗を読み取り専用で返す。
// 店舗詳細などでの「あなたのスタンプ N/M」常設表示に使う（副作用なし）。
// 認証 = Bearer（supabase.auth.getSession のトークン）または Cookie セッション。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEventStampProgress } from '@/lib/check-in/event-stamp';
import type { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAX_EVENT_IDS = 20;

export async function GET(request: NextRequest) {
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  const eventIds = (request.nextUrl.searchParams.get('eventIds') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_EVENT_IDS);
  if (eventIds.length === 0) {
    return NextResponse.json({ progress: {} });
  }

  // Bearer 優先・Cookie フォールバック（/api/me/check-in-token と同方式）
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

  const now = new Date();
  const entries = await Promise.all(
    eventIds.map(async (eventId) => {
      const progress = await getEventStampProgress(admin, user.id, eventId, now);
      return [eventId, progress] as const;
    })
  );

  const progress: Record<
    string,
    NonNullable<Awaited<ReturnType<typeof getEventStampProgress>>>
  > = {};
  for (const [eventId, p] of entries) {
    if (p) progress[eventId] = p;
  }

  return NextResponse.json({ progress });
}
