// ============================================
// POST /api/stamp-rally/entry
// 12時間ローリング窓内の distinct 店舗数が閾値に達したユーザーが、
// メールアドレスを入力して抽選応募する。
// 応募は1日1回まで（entry_date）。応募後は created_at が次回のカットオフになる。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LOTTERY_STORE_THRESHOLD = 3;
const LOTTERY_STORE_MAX = 5;
const WINDOW_HOURS = 12;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function tokyoDate(): string {
  const now = new Date();
  const tokyoMs = now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60 * 1000;
  return new Date(tokyoMs).toISOString().slice(0, 10);
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const accessToken = authHeader.slice(7);

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const email = body.email?.trim();
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  const userClient = createClient<Database>(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser(accessToken);
  if (userErr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const entryDate = tokyoDate();

  // 1日1回の応募上限チェック
  const { data: existing } = await admin
    .from('stamp_rally_entries')
    .select('id, created_at')
    .eq('user_id', user.id)
    .eq('entry_date', entryDate)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'already_entered' }, { status: 409 });
  }

  // 12時間窓 + 前回応募後リセットを反映したカットオフ
  const { data: latestEntry } = await admin
    .from('stamp_rally_entries')
    .select('created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = new Date();
  const windowStartMs = now.getTime() - WINDOW_HOURS * 60 * 60 * 1000;
  const entryMs = latestEntry?.created_at
    ? new Date(latestEntry.created_at).getTime()
    : 0;
  const cutoff = new Date(Math.max(windowStartMs, entryMs));

  const { data: visits } = await admin
    .from('store_check_ins')
    .select('store_id')
    .eq('user_id', user.id)
    .gte('checked_in_at', cutoff.toISOString());
  const uniqueStoreIds = Array.from(
    new Set((visits ?? []).map((r) => r.store_id))
  );
  if (uniqueStoreIds.length < LOTTERY_STORE_THRESHOLD) {
    return NextResponse.json(
      {
        error: 'threshold_not_met',
        currentCount: uniqueStoreIds.length,
        threshold: LOTTERY_STORE_THRESHOLD,
      },
      { status: 403 }
    );
  }

  // MAX を超えた分は切り捨て（表示と一致させる）
  const visitedStoreIds = uniqueStoreIds.slice(0, LOTTERY_STORE_MAX);

  const { data: inserted, error: insertErr } = await admin
    .from('stamp_rally_entries')
    .insert({
      user_id: user.id,
      entry_date: entryDate,
      visited_store_ids: visitedStoreIds,
      email,
      status: 'pending',
    })
    .select()
    .maybeSingle();

  if (insertErr) {
    console.error('[stamp-rally entry] insert error', insertErr);
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, entry: inserted });
}
