import { NextRequest, NextResponse } from 'next/server';
import {
  assertStoreAccess,
  resolveManageAuth,
} from '@/lib/api/manage-auth';
import type {
  PlatformEvent,
  StoreEventParticipation,
  StoreEventRow,
} from '@/lib/types/platform-event';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PatchPayload = {
  event_id?: unknown;
  is_participating?: unknown;
  notes?: unknown;
  benefit_text?: unknown;
};

function nullableString(value: unknown, max = 1000): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await resolveManageAuth(request);
  if (!auth.ok) return auth.response;
  const forbidden = await assertStoreAccess(auth.ctx, params.id);
  if (forbidden) return forbidden;

  const { data: events, error: eventsErr } = await (auth.ctx.admin as any)
    .from('platform_events')
    .select('*')
    .eq('status', 'published')
    .order('start_at', { ascending: true, nullsFirst: false });
  if (eventsErr) {
    if (eventsErr.code === '42P01') return NextResponse.json({ events: [] });
    console.error('[store-events] fetch events error', eventsErr);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  const eventRows = (events ?? []) as PlatformEvent[];
  const eventIds = eventRows.map((event) => event.id);
  const { data: participations, error: participationErr } = await (auth.ctx.admin as any)
    .from('store_event_participations')
    .select('*')
    .eq('store_id', params.id)
    .in(
      'event_id',
      eventIds.length ? eventIds : ['00000000-0000-0000-0000-000000000000']
    );
  if (participationErr && participationErr.code !== '42P01') {
    console.warn('[store-events] fetch participation warning', participationErr);
  }

  const participationMap = new Map(
    participationErr
      ? []
      : ((participations ?? []) as StoreEventParticipation[]).map((row) => [
          row.event_id,
          row,
        ])
  );

  // 特典利用履歴の集計（参加中イベントのみ）
  const participatingEventIds = Array.from(participationMap.entries())
    .filter(([, p]) => p.is_participating)
    .map(([eventId]) => eventId);

  const statsMap = new Map<string, { redemption_count: number; last_redeemed_at: string | null }>();
  if (participatingEventIds.length > 0) {
    const { data: redemptions, error: redErr } = await (auth.ctx.admin as any)
      .from('store_event_benefit_redemptions')
      .select('event_id, redeemed_at')
      .eq('store_id', params.id)
      .in('event_id', participatingEventIds);
    if (redErr && redErr.code !== '42P01') {
      console.warn('[store-events] fetch redemption stats warning', redErr);
    }
    for (const row of (redemptions ?? []) as Array<{ event_id: string; redeemed_at: string }>) {
      const entry = statsMap.get(row.event_id) ?? { redemption_count: 0, last_redeemed_at: null };
      entry.redemption_count += 1;
      if (!entry.last_redeemed_at || row.redeemed_at > entry.last_redeemed_at) {
        entry.last_redeemed_at = row.redeemed_at;
      }
      statsMap.set(row.event_id, entry);
    }
  }

  const rows: StoreEventRow[] = eventRows.map((event) => ({
    ...event,
    participation: participationMap.get(event.id) ?? null,
    stats: statsMap.get(event.id) ?? { redemption_count: 0, last_redeemed_at: null },
  }));

  return NextResponse.json({ events: rows });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await resolveManageAuth(request);
  if (!auth.ok) return auth.response;
  const forbidden = await assertStoreAccess(auth.ctx, params.id);
  if (forbidden) return forbidden;

  let raw: PatchPayload;
  try {
    raw = (await request.json()) as PatchPayload;
  } catch {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
  if (typeof raw.event_id !== 'string' || typeof raw.is_participating !== 'boolean') {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  // updated_by は public.users.id への FK。
  // 店舗アカウント (operatorRole が null) は public.users に行を持たないため
  // operator が admin の場合のみセットし、それ以外は null にする。
  const updatedBy =
    auth.ctx.operatorRole === 'admin' ? auth.ctx.operatorId : null;

  const payload: Record<string, unknown> = {
    event_id: raw.event_id,
    store_id: params.id,
    is_participating: raw.is_participating,
    notes: nullableString(raw.notes),
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  };
  if (Object.prototype.hasOwnProperty.call(raw, 'benefit_text')) {
    payload.benefit_text = nullableString(raw.benefit_text, 500);
  }

  const { data: existing, error: findError } = await (auth.ctx.admin as any)
    .from('store_event_participations')
    .select('id')
    .eq('event_id', raw.event_id)
    .eq('store_id', params.id)
    .limit(1)
    .maybeSingle();

  if (findError) {
    if (findError.code === '42P01') {
      return NextResponse.json({ error: 'table_missing' }, { status: 501 });
    }
    console.error('[store-events] find participation error', findError);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  const mutation = existing?.id
    ? (auth.ctx.admin as any)
        .from('store_event_participations')
        .update(payload)
        .eq('id', existing.id)
    : (auth.ctx.admin as any)
        .from('store_event_participations')
        .insert(payload);

  const { data, error } = await mutation
    .select('*')
    .single();

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'table_missing' }, { status: 501 });
    }
    console.error('[store-events] update participation error', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  return NextResponse.json({ participation: data as StoreEventParticipation });
}
