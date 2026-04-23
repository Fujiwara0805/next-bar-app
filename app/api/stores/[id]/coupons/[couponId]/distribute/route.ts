// ============================================
// POST /api/stores/[id]/coupons/[couponId]/distribute
// クーポンを LINE OA 友だちへ Flex Message で配信する。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import {
  filterNearbySubscribers,
  isMessagingConfigured,
  pushToUser,
  type LineMessage,
} from '@/lib/line/messaging';
import { buildCouponBubble, buildCouponFlexMessage } from '@/lib/line/flex-coupon';
import { generateRedeemCode } from '@/lib/coupons/signature';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const DEFAULT_RADIUS_KM = 1.5;
const MAX_PER_DISTRIBUTE = 500;
const CODE_GENERATION_RETRY = 6;

type TargetAudience = 'nearby' | 'all_oa' | 'store_followers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; couponId: string }> }
) {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const accessToken = authHeader.slice(7);
  const { id: storeId, couponId } = await params;

  let body: {
    targetAudience?: TargetAudience;
    radiusKm?: number;
  };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const targetAudience = body.targetAudience ?? 'nearby';
  if (!['nearby', 'all_oa', 'store_followers'].includes(targetAudience)) {
    return NextResponse.json({ error: 'invalid_target' }, { status: 400 });
  }
  const radiusKm =
    targetAudience === 'nearby' ? body.radiusKm ?? DEFAULT_RADIUS_KM : null;

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

  const { data: coupon } = await admin
    .from('store_coupons')
    .select('*')
    .eq('id', couponId)
    .eq('store_id', storeId)
    .maybeSingle();
  if (!coupon) {
    return NextResponse.json({ error: 'coupon_not_found' }, { status: 404 });
  }
  if (!coupon.is_active) {
    return NextResponse.json({ error: 'coupon_inactive' }, { status: 400 });
  }
  if (new Date(coupon.valid_until).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'coupon_expired' }, { status: 400 });
  }

  if (!isMessagingConfigured()) {
    return NextResponse.json({ error: 'messaging_not_configured' }, { status: 503 });
  }

  // 発行上限チェック
  if (coupon.max_issues != null) {
    const { count } = await admin
      .from('coupon_issues')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', couponId);
    if ((count ?? 0) >= coupon.max_issues) {
      return NextResponse.json({ error: 'max_issues_reached' }, { status: 400 });
    }
  }

  // ターゲット抽出
  let targetIds: string[] = [];
  if (targetAudience === 'nearby') {
    if (store.latitude == null || store.longitude == null) {
      return NextResponse.json({ error: 'store_location_missing' }, { status: 400 });
    }
    const { data: subscribers } = await admin
      .from('line_oa_subscribers')
      .select(
        'line_user_id, latest_latitude, latest_longitude, notify_center_latitude, notify_center_longitude, vacancy_notify_opt_in, vacancy_notify_radius_km, unfollowed_at, last_vacancy_sent_at'
      )
      .is('unfollowed_at', null);
    targetIds = filterNearbySubscribers(
      subscribers ?? [],
      store.latitude as number,
      store.longitude as number,
      radiusKm ?? DEFAULT_RADIUS_KM
    );
  } else {
    const { data: subscribers } = await admin
      .from('line_oa_subscribers')
      .select('line_user_id')
      .is('unfollowed_at', null);
    targetIds = (subscribers ?? []).map((s) => s.line_user_id);
  }

  // 1ユーザーあたり発行数上限
  if (coupon.max_per_user > 0 && targetIds.length > 0) {
    const { data: priorIssues } = await admin
      .from('coupon_issues')
      .select('line_user_id')
      .eq('coupon_id', couponId)
      .in('line_user_id', targetIds);
    const issuedByLineUser = new Map<string, number>();
    for (const row of priorIssues ?? []) {
      if (!row.line_user_id) continue;
      issuedByLineUser.set(
        row.line_user_id,
        (issuedByLineUser.get(row.line_user_id) ?? 0) + 1
      );
    }
    targetIds = targetIds.filter(
      (id) => (issuedByLineUser.get(id) ?? 0) < coupon.max_per_user
    );
  }

  // 残枠がある場合はさらに max_issues で絞り込む
  if (coupon.max_issues != null) {
    const { count } = await admin
      .from('coupon_issues')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', couponId);
    const remaining = coupon.max_issues - (count ?? 0);
    if (remaining <= 0) {
      return NextResponse.json({ error: 'max_issues_reached' }, { status: 400 });
    }
    if (targetIds.length > remaining) {
      targetIds = targetIds.slice(0, remaining);
    }
  }

  if (targetIds.length > MAX_PER_DISTRIBUTE) {
    targetIds = targetIds.slice(0, MAX_PER_DISTRIBUTE);
  }

  // store_messages レコードを先に作成（クリック追跡 mid に使う）
  const { data: msgRow, error: msgErr } = await admin
    .from('store_messages')
    .insert({
      store_id: storeId,
      sender_user_id: user.id,
      kind: 'coupon',
      body: `[coupon:${coupon.title}] → ${coupon.valid_until}`,
      target_audience: targetAudience,
      target_radius_km: radiusKm,
      sent_count: 0,
      failed_count: 0,
      status: 'pending',
    })
    .select('id')
    .single();
  if (msgErr || !msgRow) {
    return NextResponse.json({ error: 'log_failed' }, { status: 500 });
  }

  // 事前に user_id を解決（line_user_id → users.id）
  const userIdByLine = new Map<string, string>();
  if (targetIds.length > 0) {
    const { data: linked } = await admin
      .from('users')
      .select('id, line_user_id')
      .in('line_user_id', targetIds);
    for (const u of linked ?? []) {
      if (u.line_user_id) userIdByLine.set(u.line_user_id, u.id);
    }
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '';

  const validUntilLabel = new Date(coupon.valid_until).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // 1ユーザーずつ発行 → pushToUser で個別送信（Flex 内のリンクを個別化するため multicast 不可）
  let delivered = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const lineUserId of targetIds) {
    // redeem_code 生成 & insert（衝突時は再生成）
    let createdIssueId: string | null = null;
    for (let attempt = 0; attempt < CODE_GENERATION_RETRY; attempt += 1) {
      const code = generateRedeemCode();
      const { data: issueRow, error: issueErr } = await admin
        .from('coupon_issues')
        .insert({
          coupon_id: couponId,
          store_id: storeId,
          user_id: userIdByLine.get(lineUserId) ?? null,
          line_user_id: lineUserId,
          message_id: msgRow.id,
          redeem_code: code,
        })
        .select('id')
        .single();
      if (!issueErr && issueRow) {
        createdIssueId = issueRow.id;
        break;
      }
      if (issueErr?.code !== '23505') {
        errors.push(issueErr?.message ?? 'issue_insert_failed');
        break;
      }
    }
    if (!createdIssueId) {
      failed += 1;
      continue;
    }

    const trackUrl = `${origin}/api/line/track?mid=${msgRow.id}&u=${encodeURIComponent(
      `/liff/coupon/${createdIssueId}`
    )}`;

    const bubble = buildCouponBubble({
      title: coupon.title,
      body: coupon.body,
      storeName: store.name,
      imageUrl: coupon.image_url,
      validUntilLabel,
      ctaLabel: 'クーポンを使う',
      trackingUrl: trackUrl,
    });

    const flex = buildCouponFlexMessage(
      `${store.name} からクーポンが届きました`,
      bubble
    );
    const messages: LineMessage[] = [flex];

    const result = await pushToUser(lineUserId, messages);
    if (result.delivered > 0) {
      delivered += 1;
    } else {
      failed += 1;
      if (result.errors[0]) errors.push(result.errors[0]);
      await admin.from('coupon_issues').delete().eq('id', createdIssueId);
    }
  }

  const status =
    failed === 0 && delivered > 0
      ? 'sent'
      : delivered === 0
      ? 'failed'
      : 'partial';

  await admin
    .from('store_messages')
    .update({
      sent_count: delivered,
      failed_count: failed,
      status,
      error_message: errors.slice(0, 3).join('; ') || null,
    })
    .eq('id', msgRow.id);

  return NextResponse.json({
    ok: true,
    messageId: msgRow.id,
    targeted: targetIds.length,
    delivered,
    failed,
  });
}
