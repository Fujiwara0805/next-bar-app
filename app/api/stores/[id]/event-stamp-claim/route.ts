// ============================================
// POST /api/stores/[id]/event-stamp-claim
// 店舗スタッフが、スタンプをコンプリートした顧客に特典を引き換えた事実を記録する。
// event_stamp_rewards.reward_claimed_at / claimed_store_id を冪等に更新（二重引換防止）。
// Bearer認証 = 店舗オーナー or 店舗本体 or admin（check-in-scan と同一の認可）。
// Body = { userId, eventId }
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

  let body: { userId?: unknown; eventId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const userId = typeof body.userId === 'string' ? body.userId : null;
  const eventId = typeof body.eventId === 'string' ? body.eventId : null;
  if (!userId || !eventId) {
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
    .select('id, owner_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!store) {
    return NextResponse.json({ error: 'store_not_found' }, { status: 404 });
  }

  // 認可: 1) 運営オーナー  2) 店舗アカウント本体 (auth.id === stores.id)  3) admin ロール
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

  // この店舗が当該イベントの参加店であること（参加店のみ特典を渡せる）
  const { data: participation } = await admin
    .from('store_event_participations')
    .select('id')
    .eq('store_id', store.id)
    .eq('event_id', eventId)
    .eq('is_participating', true)
    .maybeSingle();
  if (!participation) {
    return NextResponse.json({ error: 'not_participating' }, { status: 403 });
  }

  // ゴール到達者のみ event_stamp_rewards に行が存在する（finalizeEventStamp が upsert）
  const { data: reward } = await admin
    .from('event_stamp_rewards')
    .select('id, reward_claimed_at, claimed_store_id')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .maybeSingle();
  if (!reward) {
    return NextResponse.json({ error: 'not_completed' }, { status: 409 });
  }

  // 既に引換済みなら冪等にそのまま返す（二重引換防止）
  if (reward.reward_claimed_at) {
    return NextResponse.json({
      ok: true,
      alreadyClaimed: true,
      rewardClaimedAt: reward.reward_claimed_at,
      claimedStoreId: reward.claimed_store_id,
    });
  }

  const nowIso = new Date().toISOString();
  const { data: updated, error: updErr } = await admin
    .from('event_stamp_rewards')
    .update({ reward_claimed_at: nowIso, claimed_store_id: store.id })
    .eq('id', reward.id)
    .is('reward_claimed_at', null)
    .select('reward_claimed_at, claimed_store_id')
    .maybeSingle();

  if (updErr) {
    console.error('[event-stamp-claim] update error:', updErr);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }

  // 競合で他者が先に更新した場合は updated が null → 既存値を返す
  return NextResponse.json({
    ok: true,
    alreadyClaimed: !updated,
    rewardClaimedAt: updated?.reward_claimed_at ?? nowIso,
    claimedStoreId: updated?.claimed_store_id ?? store.id,
  });
}
