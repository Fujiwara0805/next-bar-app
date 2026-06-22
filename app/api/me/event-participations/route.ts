// ============================================
// GET /api/me/event-participations
// ログイン会員が参加(opt-in)している全イベントの ID 一覧を返す。
// 会員ページの「参加しますか？」カードで、未参加イベントを判定するために使う。
// 認証 = Bearer（または Cookie セッション）。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { resolveCustomerUser } from '@/lib/api/customer-auth';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await resolveCustomerUser(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { userId, admin } = auth;

  const { data, error } = await admin
    .from('user_event_participations')
    .select('event_id')
    .eq('user_id', userId);
  if (error) {
    if (error.code === '42P01') return NextResponse.json({ eventIds: [] });
    console.error('[me/event-participations] error', error);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  const eventIds = Array.from(new Set((data ?? []).map((r) => r.event_id)));
  return NextResponse.json({ eventIds });
}
