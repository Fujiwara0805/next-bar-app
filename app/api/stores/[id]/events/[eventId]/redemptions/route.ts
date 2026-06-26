import { NextRequest, NextResponse } from 'next/server';
import {
  assertStoreAccess,
  resolveManageAuth,
} from '@/lib/api/manage-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RedemptionRow = {
  id: string;
  event_id: string;
  store_id: string;
  redeemed_at: string;
  created_by: string | null;
  created_at: string;
  user_id?: string | null;
  customer_name?: string | null;
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; eventId: string } }
) {
  const auth = await resolveManageAuth(request);
  if (!auth.ok) return auth.response;
  const forbidden = await assertStoreAccess(auth.ctx, params.id);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get('limit'));
  const limit = Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 500
    ? Math.floor(limitParam)
    : 100;

  // user_id 列が無い環境でも壊れないよう '*' で取得
  const { data, error } = await (auth.ctx.admin as any)
    .from('store_event_benefit_redemptions')
    .select('*')
    .eq('store_id', params.id)
    .eq('event_id', params.eventId)
    .order('redeemed_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ redemptions: [], count: 0, last_redeemed_at: null });
    }
    console.error('[redemptions] fetch error', error);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  const rows = (data ?? []) as RedemptionRow[];

  // user_id を持つ行に顧客名を付与（per-user 消込の可視化）
  const userIds = Array.from(
    new Set(rows.map((r) => r.user_id).filter((v): v is string => !!v))
  );
  if (userIds.length > 0) {
    const { data: users } = await (auth.ctx.admin as any)
      .from('users')
      .select('id, display_name, line_display_name')
      .in('id', userIds);
    const nameById = new Map<string, string>();
    (users ?? []).forEach((u: any) => {
      nameById.set(u.id, u.line_display_name || u.display_name || 'ゲスト');
    });
    rows.forEach((r) => {
      if (r.user_id) r.customer_name = nameById.get(r.user_id) ?? 'ゲスト';
    });
  }

  // 全件カウントを別途取得（limit より多い場合に備えて）
  const { count, error: countErr } = await (auth.ctx.admin as any)
    .from('store_event_benefit_redemptions')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', params.id)
    .eq('event_id', params.eventId);

  if (countErr && countErr.code !== '42P01') {
    console.warn('[redemptions] count warning', countErr);
  }

  return NextResponse.json({
    redemptions: rows,
    count: typeof count === 'number' ? count : rows.length,
    last_redeemed_at: rows[0]?.redeemed_at ?? null,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; eventId: string } }
) {
  const auth = await resolveManageAuth(request);
  if (!auth.ok) return auth.response;
  const forbidden = await assertStoreAccess(auth.ctx, params.id);
  if (forbidden) return forbidden;

  // 参加中のイベントのみ記録を許可
  const { data: participation, error: pErr } = await (auth.ctx.admin as any)
    .from('store_event_participations')
    .select('id, is_participating')
    .eq('store_id', params.id)
    .eq('event_id', params.eventId)
    .maybeSingle();

  if (pErr && pErr.code !== '42P01') {
    console.error('[redemptions] participation lookup error', pErr);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
  if (!participation || !participation.is_participating) {
    return NextResponse.json({ error: 'not_participating' }, { status: 400 });
  }

  // 紙クーポンイベントはデジタル消込の対象外（デジタル消込は常に 0）。
  // 紙の使用枚数は store_event_paper_coupons（使用報告）で集計する。
  const { data: ev, error: evErr } = await (auth.ctx.admin as any)
    .from('platform_events')
    .select('uses_paper_coupon')
    .eq('id', params.eventId)
    .maybeSingle();
  if (evErr && evErr.code !== '42P01') {
    console.error('[redemptions] event lookup error', evErr);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
  if (ev?.uses_paper_coupon) {
    return NextResponse.json({ error: 'paper_coupon_event' }, { status: 400 });
  }

  const createdBy =
    auth.ctx.operatorRole === 'admin' ? auth.ctx.operatorId : null;

  const { data, error } = await (auth.ctx.admin as any)
    .from('store_event_benefit_redemptions')
    .insert({
      event_id: params.eventId,
      store_id: params.id,
      redeemed_at: new Date().toISOString(),
      created_by: createdBy,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'table_missing' }, { status: 501 });
    }
    console.error('[redemptions] insert error', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  return NextResponse.json({ redemption: data as RedemptionRow }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; eventId: string } }
) {
  const auth = await resolveManageAuth(request);
  if (!auth.ok) return auth.response;
  const forbidden = await assertStoreAccess(auth.ctx, params.id);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const redemptionId = searchParams.get('id');
  if (!redemptionId) {
    return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  }

  const { error } = await (auth.ctx.admin as any)
    .from('store_event_benefit_redemptions')
    .delete()
    .eq('id', redemptionId)
    .eq('store_id', params.id)
    .eq('event_id', params.eventId);

  if (error) {
    console.error('[redemptions] delete error', error);
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
