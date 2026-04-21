// ============================================
// POST /api/check-in
// QRコードをスキャンしたログイン済みユーザーが店舗チェックインを記録する。
// スタンプは 12時間ローリング窓で distinct 店舗数をカウント。
// 直近のスタンプラリー応募 created_at 以降のみを対象とすることで応募後リセットを表現。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyStoreSignature } from '@/lib/qr/signature';
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

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const accessToken = authHeader.slice(7);

  let body: { storeId?: string; sig?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const storeId = body.storeId;
  const sig = body.sig;
  if (!storeId || !sig) {
    return NextResponse.json({ error: 'params_required' }, { status: 400 });
  }

  if (!verifyStoreSignature(storeId, sig)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 403 });
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

  const { data: userRow } = await admin
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();
  if (!userRow) {
    return NextResponse.json({ error: 'customer_only' }, { status: 403 });
  }

  const { data: store } = await admin
    .from('stores')
    .select('id, name')
    .eq('id', storeId)
    .maybeSingle();
  if (!store) {
    return NextResponse.json({ error: 'store_not_found' }, { status: 404 });
  }

  const now = new Date();
  const visitDate = tokyoDate();

  // 直近のエントリ created_at を取得して、応募後リセットのカットオフとして利用
  const { data: latestEntry } = await admin
    .from('stamp_rally_entries')
    .select('created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const windowStartMs = now.getTime() - WINDOW_HOURS * 60 * 60 * 1000;
  const entryMs = latestEntry?.created_at
    ? new Date(latestEntry.created_at).getTime()
    : 0;
  const cutoff = new Date(Math.max(windowStartMs, entryMs));

  // 挿入前の窓内店舗セット（このスキャンが新規スタンプかを判定するため）
  const { data: preWindow } = await admin
    .from('store_check_ins')
    .select('store_id')
    .eq('user_id', user.id)
    .gte('checked_in_at', cutoff.toISOString());
  const preStoreIds = new Set((preWindow ?? []).map((r) => r.store_id));
  const wasAlreadyStamped = preStoreIds.has(storeId);

  // チェックインを挿入（同日同一店舗はunique制約で弾かれる）
  const { error: insertErr } = await admin.from('store_check_ins').insert({
    user_id: user.id,
    store_id: storeId,
    visit_date: visitDate,
    source: 'qr',
  });

  const isDuplicateRow = insertErr?.code === '23505';
  if (insertErr && !isDuplicateRow) {
    console.error('[check-in] insert error:', insertErr);
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  // 挿入後の窓内店舗セット
  const { data: postWindow } = await admin
    .from('store_check_ins')
    .select('store_id')
    .eq('user_id', user.id)
    .gte('checked_in_at', cutoff.toISOString());
  const stampStoreIds = Array.from(
    new Set((postWindow ?? []).map((r) => r.store_id))
  );
  const stampCount = stampStoreIds.length;

  // 本日の応募有無（1日1回制限）
  const { data: todayEntry } = await admin
    .from('stamp_rally_entries')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('entry_date', visitDate)
    .maybeSingle();

  const canEnterLottery =
    stampCount >= LOTTERY_STORE_THRESHOLD && !todayEntry;

  return NextResponse.json({
    storeId: store.id,
    storeName: store.name,
    isNewStampToday: !wasAlreadyStamped,
    todayStoreCount: stampCount,
    windowStoreCount: stampCount,
    lotteryThreshold: LOTTERY_STORE_THRESHOLD,
    lotteryMax: LOTTERY_STORE_MAX,
    canEnterLottery,
    hasLotteryEntry: !!todayEntry,
    visitDate,
    windowCutoff: cutoff.toISOString(),
    windowHours: WINDOW_HOURS,
  });
}
