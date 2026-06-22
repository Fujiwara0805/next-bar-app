// ============================================
// POST /api/me/events/[eventId]/submit
// スタンプを全て集めた(ゴール到達)会員が「送信」する。
// サーバ側でゴール到達を再検証し、event_stamp_rewards.submitted_at を記録する。
// 運営はダッシュボードで submitted_at を持つ行を確認できる（外部通知はしない）。
// 認証 = Bearer（または Cookie セッション）。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { resolveCustomerUser } from '@/lib/api/customer-auth';
import { getEventStampProgress } from '@/lib/check-in/event-stamp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_NOTE = 500;

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const auth = await resolveCustomerUser(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { userId, admin } = auth;

  let note: string | null = null;
  try {
    const body = (await request.json()) as { note?: unknown };
    if (typeof body?.note === 'string') {
      const trimmed = body.note.trim();
      note = trimmed ? trimmed.slice(0, MAX_NOTE) : null;
    }
  } catch {
    // body は任意。無ければ note=null。
  }

  // ゴール到達をサーバ側で再検証
  const progress = await getEventStampProgress(admin, userId, params.eventId);
  if (!progress) {
    return NextResponse.json({ error: 'event_unavailable' }, { status: 404 });
  }
  if (!progress.goalReached) {
    return NextResponse.json({ error: 'goal_not_reached' }, { status: 400 });
  }

  const now = new Date().toISOString();

  // 報酬行を冪等に確保（通常はゴール到達時に作成済み）
  const { error: upsertErr } = await admin
    .from('event_stamp_rewards')
    .upsert(
      { user_id: userId, event_id: params.eventId },
      { onConflict: 'user_id,event_id', ignoreDuplicates: true }
    );
  if (upsertErr && upsertErr.code !== '42P01') {
    console.error('[me/events/submit] upsert error', upsertErr);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  // 既に送信済みなら冪等に既存値を返す
  const { data: existing } = await admin
    .from('event_stamp_rewards')
    .select('submitted_at')
    .eq('user_id', userId)
    .eq('event_id', params.eventId)
    .maybeSingle();
  const alreadySubmitted = (existing as { submitted_at?: string | null } | null)?.submitted_at ?? null;
  if (alreadySubmitted) {
    return NextResponse.json({ ok: true, submitted_at: alreadySubmitted, already: true });
  }

  const { data: updated, error: updErr } = await admin
    .from('event_stamp_rewards')
    .update({ submitted_at: now, submit_note: note })
    .eq('user_id', userId)
    .eq('event_id', params.eventId)
    .select('submitted_at')
    .maybeSingle();
  if (updErr) {
    console.error('[me/events/submit] update error', updErr);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    submitted_at: (updated as { submitted_at?: string | null } | null)?.submitted_at ?? now,
  });
}
