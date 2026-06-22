// ============================================
// POST /api/stores/[id]/events/[eventId]/redeem-code
// 加盟店スタッフが、公式LINEで配信された電子クーポンの「番号」(#1111 等)を
// 手入力して消し込む。イベントの redemption_code と照合し、一致すれば
// store_event_benefit_redemptions に1件記録する（番号ベースのため匿名カウント）。
//
// 会員証QRスキャン消込(scan-redeem, per-user)と併用できる。
// Bearer認証 = 店舗オーナー / 店舗アカウント本体 / admin。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** クーポン番号の正規化（前後空白除去・先頭の # を許容・大文字小文字無視） */
function normalizeCode(value: string): string {
  return value.trim().replace(/^#+/, '').toLowerCase();
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; eventId: string } }
) {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const accessToken = authHeader.slice(7);

  let body: { code?: unknown };
  try {
    body = (await request.json()) as { code?: unknown };
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const inputCode = typeof body.code === 'string' ? body.code : '';
  if (!inputCode.trim()) {
    return NextResponse.json({ error: 'code_required' }, { status: 400 });
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
    .select('id, owner_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!store) {
    return NextResponse.json({ error: 'store_not_found' }, { status: 404 });
  }

  // 認可: 1) 店舗オーナー  2) 店舗アカウント本体  3) admin ロール
  const isOwner = store.owner_id === operator.id;
  const isStoreSelf = store.id === operator.id;
  if (!isOwner && !isStoreSelf) {
    const { data: operatorRow } = await admin
      .from('users')
      .select('role')
      .eq('id', operator.id)
      .maybeSingle();
    if (operatorRow?.role !== 'admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  // 参加中のイベントのみ消込可能
  const { data: participation } = await admin
    .from('store_event_participations')
    .select('id, is_participating')
    .eq('store_id', params.id)
    .eq('event_id', params.eventId)
    .maybeSingle();
  if (!participation || !participation.is_participating) {
    return NextResponse.json({ error: 'not_participating' }, { status: 400 });
  }

  // イベントのクーポン番号と照合
  const { data: event } = await admin
    .from('platform_events')
    .select('id, redemption_code')
    .eq('id', params.eventId)
    .maybeSingle();
  if (!event) {
    return NextResponse.json({ error: 'event_not_found' }, { status: 404 });
  }
  const expected = (event as { redemption_code?: string | null }).redemption_code ?? '';
  if (!expected.trim()) {
    return NextResponse.json({ error: 'no_code_configured' }, { status: 400 });
  }
  if (normalizeCode(expected) !== normalizeCode(inputCode)) {
    return NextResponse.json({ error: 'code_mismatch' }, { status: 400 });
  }

  // 消込を記録（番号ベースのため匿名カウント。user_id は付けない）
  const now = new Date().toISOString();
  const { data: redemption, error: insErr } = await admin
    .from('store_event_benefit_redemptions')
    .insert({
      event_id: params.eventId,
      store_id: params.id,
      redeemed_at: now,
      created_by: operator.id,
    })
    .select('id, redeemed_at')
    .single();
  if (insErr) {
    if (insErr.code === '42P01') {
      return NextResponse.json({ error: 'table_missing' }, { status: 501 });
    }
    console.error('[redeem-code] insert error', insErr);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, redemption });
}
