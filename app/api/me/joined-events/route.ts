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
      'id, title, area_label, image_url, start_at, end_at, status, stamp_enabled, stamp_goal, stamp_reward_text'
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

  const now = new Date();
  const result = [];
  for (const ev of events ?? []) {
    if (!ev.stamp_enabled) continue; // スタンプ無効イベントはボード対象外
    const progress = await getEventStampProgress(admin, userId, ev.id, now);
    const reward = rewardByEvent.get(ev.id);
    result.push({
      id: ev.id,
      title: ev.title,
      area_label: ev.area_label,
      image_url: ev.image_url,
      start_at: ev.start_at,
      end_at: ev.end_at,
      stamp_goal: progress?.stampGoal ?? ev.stamp_goal ?? 3,
      stamp_reward_text: ev.stamp_reward_text,
      stamp_count: progress?.stampCount ?? 0,
      goal_reached: progress?.goalReached ?? false,
      reward_claimed_at: reward?.reward_claimed_at ?? null,
      submitted_at: reward?.submitted_at ?? null,
      joined_at: joinedAtById.get(ev.id) ?? null,
    });
  }

  // 参加が新しい順
  result.sort((a, b) => (a.joined_at && b.joined_at ? (a.joined_at < b.joined_at ? 1 : -1) : 0));

  return NextResponse.json({ events: result });
}
