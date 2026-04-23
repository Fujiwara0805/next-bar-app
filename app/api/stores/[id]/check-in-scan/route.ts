// ============================================
// POST /api/stores/[id]/check-in-scan
// 店舗スタッフが顧客マイページのQR (/c?u=..&t=..&s=..) をスキャンして
// その顧客の来店をチェックインとして記録する（Phase 11）。
// Bearer認証 = 店舗オーナー or admin。Body = { u, t, s } 顧客トークン。
// スタンプは 12時間ローリング窓で distinct 店舗数をカウント（既存 /api/check-in 踏襲）。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  parseCustomerCheckInPayload,
  verifyCustomerCheckInToken,
} from '@/lib/qr/signature';
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const accessToken = authHeader.slice(7);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const payload = parseCustomerCheckInPayload(rawBody);
  if (!payload) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const anon = createClient<Database>(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user: operator },
    error: userErr,
  } = await anon.auth.getUser(accessToken);
  if (userErr || !operator) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: store } = await admin
    .from('stores')
    .select('id, name, owner_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!store) {
    return NextResponse.json({ error: 'store_not_found' }, { status: 404 });
  }

  const isOwner = store.owner_id === operator.id;
  if (!isOwner) {
    const { data: operatorRow } = await admin
      .from('users')
      .select('role')
      .eq('id', operator.id)
      .maybeSingle();
    if (operatorRow?.role !== 'admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  const verify = verifyCustomerCheckInToken(payload);
  if (!verify.ok) {
    const code = verify.reason === 'expired' ? 'token_expired' : 'invalid_token';
    return NextResponse.json({ error: code }, { status: 403 });
  }

  const { data: customer } = await admin
    .from('users')
    .select('id, display_name, line_display_name, role')
    .eq('id', payload.u)
    .maybeSingle();
  if (!customer) {
    return NextResponse.json({ error: 'customer_not_found' }, { status: 404 });
  }
  if (customer.role && customer.role !== 'customer' && customer.role !== 'user') {
    return NextResponse.json({ error: 'customer_only' }, { status: 403 });
  }

  const now = new Date();
  const visitDate = tokyoDate();

  const { data: latestEntry } = await admin
    .from('stamp_rally_entries')
    .select('created_at')
    .eq('user_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const windowStartMs = now.getTime() - WINDOW_HOURS * 60 * 60 * 1000;
  const entryMs = latestEntry?.created_at
    ? new Date(latestEntry.created_at).getTime()
    : 0;
  const cutoff = new Date(Math.max(windowStartMs, entryMs));

  const { data: preWindow } = await admin
    .from('store_check_ins')
    .select('store_id')
    .eq('user_id', customer.id)
    .gte('checked_in_at', cutoff.toISOString());
  const preStoreIds = new Set((preWindow ?? []).map((r) => r.store_id));
  const wasAlreadyStamped = preStoreIds.has(store.id);

  const { error: insertErr } = await admin.from('store_check_ins').insert({
    user_id: customer.id,
    store_id: store.id,
    visit_date: visitDate,
    source: 'qr_scan',
  });

  const isDuplicateRow = insertErr?.code === '23505';
  if (insertErr && !isDuplicateRow) {
    console.error('[check-in-scan] insert error:', insertErr);
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  const { data: postWindow } = await admin
    .from('store_check_ins')
    .select('store_id')
    .eq('user_id', customer.id)
    .gte('checked_in_at', cutoff.toISOString());
  const stampStoreIds = Array.from(
    new Set((postWindow ?? []).map((r) => r.store_id))
  );
  const stampCount = stampStoreIds.length;

  const { data: todayEntry } = await admin
    .from('stamp_rally_entries')
    .select('id, status')
    .eq('user_id', customer.id)
    .eq('entry_date', visitDate)
    .maybeSingle();

  const canEnterLottery = stampCount >= LOTTERY_STORE_THRESHOLD && !todayEntry;

  const userDisplayName =
    customer.line_display_name || customer.display_name || 'ゲスト';

  return NextResponse.json({
    storeId: store.id,
    storeName: store.name,
    userId: customer.id,
    userDisplayName,
    isNewStamp: !wasAlreadyStamped,
    windowStoreCount: stampCount,
    lotteryThreshold: LOTTERY_STORE_THRESHOLD,
    lotteryMax: LOTTERY_STORE_MAX,
    canEnterLottery,
    hasLotteryEntry: !!todayEntry,
    visitDate,
    windowHours: WINDOW_HOURS,
  });
}
