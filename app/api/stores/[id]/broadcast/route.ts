// ============================================
// POST /api/stores/[id]/broadcast
// 店舗オーナーがLINE OA友だちに任意メッセージを配信する。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { DAILY_NOTIFY_CAP, filterVacancyTargets, isMessagingConfigured, multicast, todayJst } from '@/lib/line/messaging';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BODY_LEN = 400;
const MAX_ALL_OA_PER_DAY = 3;
const DEFAULT_RADIUS_KM = 1.5;
const BROADCAST_THROTTLE_HOURS = 0.5; // 1ユーザー30分1通まで

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type BroadcastKind = 'announcement' | 'open_signal';
type TargetAudience = 'nearby' | 'all_oa';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const accessToken = authHeader.slice(7);

  const { id: storeId } = await params;

  let body: {
    kind?: BroadcastKind;
    body?: string;
    targetAudience?: TargetAudience;
    radiusKm?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const kind = body.kind;
  const text = body.body?.trim();
  const targetAudience = body.targetAudience ?? 'nearby';
  const radiusKm =
    targetAudience === 'nearby' ? body.radiusKm ?? DEFAULT_RADIUS_KM : null;

  if (kind !== 'announcement' && kind !== 'open_signal') {
    return NextResponse.json({ error: 'invalid_kind' }, { status: 400 });
  }
  if (!text || text.length > MAX_BODY_LEN) {
    return NextResponse.json({ error: 'invalid_body_text' }, { status: 400 });
  }
  if (targetAudience !== 'nearby' && targetAudience !== 'all_oa') {
    return NextResponse.json({ error: 'invalid_target' }, { status: 400 });
  }

  // ユーザー認証
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

  // 権限チェック: 自店舗オーナー or admin
  const { data: store } = await admin
    .from('stores')
    .select('id, name, owner_id, latitude, longitude')
    .eq('id', storeId)
    .maybeSingle();
  if (!store) {
    return NextResponse.json({ error: 'store_not_found' }, { status: 404 });
  }
  if (store.owner_id !== user.id) {
    const { data: me } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (me?.role !== 'admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  // 配信先の決定
  if (!isMessagingConfigured()) {
    return NextResponse.json({ error: 'messaging_not_configured' }, { status: 503 });
  }

  // all_oa は日次上限
  if (targetAudience === 'all_oa') {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from('store_messages')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('target_audience', 'all_oa')
      .gte('created_at', since);
    if ((count ?? 0) >= MAX_ALL_OA_PER_DAY) {
      return NextResponse.json(
        { error: 'daily_limit_exceeded', limit: MAX_ALL_OA_PER_DAY },
        { status: 429 }
      );
    }
  }

  let targetIds: string[] = [];
  if (targetAudience === 'nearby') {
    if (store.latitude == null || store.longitude == null) {
      return NextResponse.json({ error: 'store_location_missing' }, { status: 400 });
    }
    const { data: subscribers } = await admin
      .from('line_oa_subscribers')
      .select(
        'line_user_id, latest_latitude, latest_longitude, notify_center_latitude, notify_center_longitude, vacancy_notify_opt_in, vacancy_notify_radius_km, unfollowed_at, last_vacancy_sent_at, daily_notify_count, daily_notify_date'
      )
      .is('unfollowed_at', null);
    // 連投防止スロットル + 日次キャップを適用
    targetIds = filterVacancyTargets(
      subscribers ?? [],
      store.latitude as number,
      store.longitude as number,
      radiusKm ?? DEFAULT_RADIUS_KM,
      BROADCAST_THROTTLE_HOURS
    );
  } else {
    const { data: subscribers } = await admin
      .from('line_oa_subscribers')
      .select('line_user_id, daily_notify_count, daily_notify_date')
      .is('unfollowed_at', null);
    // 全友だち向けでも日次キャップは適用する（1ユーザー1日最大 DAILY_NOTIFY_CAP 通）
    const today = todayJst();
    targetIds = (subscribers ?? [])
      .filter((s) => {
        if (s.daily_notify_date !== today) return true;
        return (s.daily_notify_count ?? 0) < DAILY_NOTIFY_CAP;
      })
      .map((s) => s.line_user_id);
  }

  // 先にメッセージ行を作成し、クリック追跡URLに使うID確定
  const { data: created, error: insertErr } = await admin
    .from('store_messages')
    .insert({
      store_id: storeId,
      sender_user_id: user.id,
      kind,
      body: text,
      target_audience: targetAudience,
      target_radius_km: radiusKm,
      sent_count: 0,
      failed_count: 0,
      status: 'pending',
    })
    .select('id')
    .single();
  if (insertErr || !created) {
    return NextResponse.json({ error: 'log_failed' }, { status: 500 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
  const trackUrl = `${origin}/api/line/track?mid=${created.id}&u=${encodeURIComponent(`/store/${storeId}`)}`;
  const prefix = kind === 'open_signal' ? '🟢 営業中' : '📣 お知らせ';
  const messageText = `${prefix}｜${store.name}\n\n${text}\n\n👉 ${trackUrl}`;

  const result = targetIds.length > 0
    ? await multicast(targetIds, [{ type: 'text', text: messageText }])
    : { requested: 0, delivered: 0, failed: 0, errors: [] };

  // 送信成功者のスロットルタイムスタンプ + 日次カウンタを更新（JSTで自動リセット）
  if (result.delivered > 0 && targetIds.length > 0) {
    await admin.rpc('bump_line_oa_daily_count', { p_users: targetIds });
  }

  const status =
    result.failed === 0
      ? 'sent'
      : result.delivered === 0
      ? 'failed'
      : 'partial';

  const { data: logged } = await admin
    .from('store_messages')
    .update({
      sent_count: result.delivered,
      failed_count: result.failed,
      status,
      error_message: result.errors.slice(0, 3).join('; ') || null,
    })
    .eq('id', created.id)
    .select()
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    message: logged,
    targeted: targetIds.length,
    delivered: result.delivered,
    failed: result.failed,
  });
}

// 配信履歴（店舗オーナー）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const accessToken = authHeader.slice(7);
  const { id: storeId } = await params;

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
  const { data: store } = await admin
    .from('stores')
    .select('id, owner_id')
    .eq('id', storeId)
    .maybeSingle();
  if (!store) return NextResponse.json({ error: 'store_not_found' }, { status: 404 });
  if (store.owner_id !== user.id) {
    const { data: me } = await admin.from('users').select('role').eq('id', user.id).maybeSingle();
    if (me?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data: messages } = await admin
    .from('store_messages')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(30);

  return NextResponse.json({ ok: true, messages: messages ?? [] });
}
