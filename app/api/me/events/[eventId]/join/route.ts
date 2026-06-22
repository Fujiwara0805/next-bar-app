// ============================================
// POST   /api/me/events/[eventId]/join   … ログイン会員がイベントに「参加する」
// DELETE /api/me/events/[eventId]/join   … 参加を取りやめる
//
// 参加(opt-in)した会員だけ、会員ページにそのイベントのスタンプボードが表示される。
// 認証 = Bearer（または Cookie セッション）。会員(customer)のみ。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { resolveCustomerUser } from '@/lib/api/customer-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 現在のユーザーが当該イベントに参加済みかを返す（CTAの初期表示用）
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const auth = await resolveCustomerUser(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { userId, admin } = auth;

  const { data, error } = await admin
    .from('user_event_participations')
    .select('id')
    .eq('user_id', userId)
    .eq('event_id', params.eventId)
    .maybeSingle();
  if (error && error.code !== '42P01') {
    console.error('[me/events/join] status error', error);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
  return NextResponse.json({ joined: !!data });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const auth = await resolveCustomerUser(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { userId, admin } = auth;

  // 公開中のイベントのみ参加可能
  const { data: event, error: eventErr } = await admin
    .from('platform_events')
    .select('id, status')
    .eq('id', params.eventId)
    .maybeSingle();
  if (eventErr) {
    console.error('[me/events/join] event fetch error', eventErr);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
  if (!event || event.status !== 'published') {
    return NextResponse.json({ error: 'event_unavailable' }, { status: 404 });
  }

  // 冪等: (user_id, event_id) ユニーク。既参加なら何もしない。
  const { error: insertErr } = await admin
    .from('user_event_participations')
    .upsert(
      { user_id: userId, event_id: params.eventId },
      { onConflict: 'user_id,event_id', ignoreDuplicates: true }
    );
  if (insertErr) {
    if (insertErr.code === '42P01') {
      return NextResponse.json({ error: 'table_missing' }, { status: 501 });
    }
    console.error('[me/events/join] insert error', insertErr);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, joined: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const auth = await resolveCustomerUser(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { userId, admin } = auth;

  const { error } = await admin
    .from('user_event_participations')
    .delete()
    .eq('user_id', userId)
    .eq('event_id', params.eventId);
  if (error && error.code !== '42P01') {
    console.error('[me/events/join] delete error', error);
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, joined: false });
}
