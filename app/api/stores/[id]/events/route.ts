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

  const rows: StoreEventRow[] = eventRows.map((event) => ({
    ...event,
    participation: participationMap.get(event.id) ?? null,
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

  const payload = {
    event_id: raw.event_id,
    store_id: params.id,
    is_participating: raw.is_participating,
    notes: nullableString(raw.notes),
    updated_by: auth.ctx.operatorId,
    updated_at: new Date().toISOString(),
  };

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
