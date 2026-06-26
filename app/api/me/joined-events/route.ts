// ============================================
// GET /api/me/joined-events
// ログイン会員が「参加する」を押したイベントの一覧を、スタンプ進捗付きで返す。
// 会員ページのスタンプボード表示に使う（副作用なし・読み取り専用）。
// 認証 = Bearer（または Cookie セッション）。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { resolveCustomerUser } from '@/lib/api/customer-auth';
import { getEventStampProgress } from '@/lib/check-in/event-stamp';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await resolveCustomerUser(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { userId, admin } = auth;

  // 参加イベント ID 群
  const { data: parts, error: partErr } = await admin
    .from('user_event_participations')
    .select('event_id, joined_at')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });
  if (partErr) {
    if (partErr.code === '42P01') return NextResponse.json({ events: [] });
    console.error('[me/joined-events] participations error', partErr);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  const joinedAtById = new Map<string, string>();
  for (const p of parts ?? []) {
    if (!joinedAtById.has(p.event_id)) joinedAtById.set(p.event_id, p.joined_at);
  }
  const eventIds = Array.from(joinedAtById.keys());
  if (eventIds.length === 0) return NextResponse.json({ events: [] });

  // イベント本体（公開中のみ）
  const { data: events, error: evErr } = await admin
    .from('platform_events')
    .select(
      'id, title, area_label, image_url, description, start_at, end_at, status, stamp_enabled, stamp_goal, stamp_reward_text, redemption_code, uses_paper_coupon'
    )
    .in('id', eventIds)
    .eq('status', 'published');
  if (evErr) {
    console.error('[me/joined-events] events error', evErr);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  // 報酬行（submitted_at / reward_claimed_at）
  const { data: rewards } = await admin
    .from('event_stamp_rewards')
    .select('event_id, reward_claimed_at, submitted_at')
    .eq('user_id', userId)
    .in('event_id', eventIds);
  const rewardByEvent = new Map(
    (rewards ?? []).map((r) => [
      r.event_id,
      {
        reward_claimed_at: r.reward_claimed_at ?? null,
        submitted_at: (r as { submitted_at?: string | null }).submitted_at ?? null,
      },
    ])
  );

  // クーポンイベントの per-user 消込状況（電子クーポンは会員証スキャンで消込）。
  // 「参加中（クーポン）」カードで「利用済み」を表示するために使う。
  const { data: redemptions } = await admin
    .from('store_event_benefit_redemptions')
    .select('event_id, redeemed_at')
    .eq('user_id', userId)
    .in('event_id', eventIds);
  const redeemedByEvent = new Map<string, string>();
  for (const r of redemptions ?? []) {
    if (!r.event_id || !r.redeemed_at) continue;
    const prev = redeemedByEvent.get(r.event_id);
    if (!prev || r.redeemed_at < prev) redeemedByEvent.set(r.event_id, r.redeemed_at);
  }

  const now = new Date();
  const result = [];
  for (const ev of events ?? []) {
    const usesPaper = (ev as { uses_paper_coupon?: boolean }).uses_paper_coupon ?? false;
    // 電子クーポンのイベントのみ、会員に番号を表示する
    const redemptionCode = usesPaper
      ? null
      : (ev as { redemption_code?: string | null }).redemption_code ?? null;

    // スタンプ無効イベント = クーポンイベント。
    // スタンプボードの代わりに「参加中（クーポン）」カードとして返す。
    if (!ev.stamp_enabled) {
      result.push({
        id: ev.id,
        title: ev.title,
        area_label: ev.area_label,
        image_url: ev.image_url,
        description: (ev as { description?: string | null }).description ?? null,
        start_at: ev.start_at,
        end_at: ev.end_at,
        stamp_enabled: false,
        stamp_goal: 0,
        stamp_reward_text: ev.stamp_reward_text,
        stamp_count: 0,
        goal_reached: false,
        reward_claimed_at: null,
        submitted_at: null,
        joined_at: joinedAtById.get(ev.id) ?? null,
        uses_paper_coupon: usesPaper,
        redemption_code: redemptionCode,
        coupon_redeemed_at: redeemedByEvent.get(ev.id) ?? null,
      });
      continue;
    }

    const progress = await getEventStampProgress(admin, userId, ev.id, now);
    const reward = rewardByEvent.get(ev.id);
    result.push({
      id: ev.id,
      title: ev.title,
      area_label: ev.area_label,
      image_url: ev.image_url,
      description: (ev as { description?: string | null }).description ?? null,
      start_at: ev.start_at,
      end_at: ev.end_at,
      stamp_enabled: true,
      stamp_goal: progress?.stampGoal ?? ev.stamp_goal ?? 3,
      stamp_reward_text: ev.stamp_reward_text,
      stamp_count: progress?.stampCount ?? 0,
      goal_reached: progress?.goalReached ?? false,
      reward_claimed_at: reward?.reward_claimed_at ?? null,
      submitted_at: reward?.submitted_at ?? null,
      joined_at: joinedAtById.get(ev.id) ?? null,
      uses_paper_coupon: usesPaper,
      redemption_code: redemptionCode,
      coupon_redeemed_at: null,
    });
  }

  // 参加が新しい順
  result.sort((a, b) => (a.joined_at && b.joined_at ? (a.joined_at < b.joined_at ? 1 : -1) : 0));

  return NextResponse.json({ events: result });
}
