import { NextRequest, NextResponse } from 'next/server';
import {
  assertPlatformAdmin,
  resolveManageAuth,
} from '@/lib/api/manage-auth';
import type { PlatformEvent, PlatformEventStatus } from '@/lib/types/platform-event';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type EventPayload = {
  title?: unknown;
  organizer_name?: unknown;
  description?: unknown;
  area_label?: unknown;
  start_at?: unknown;
  end_at?: unknown;
  image_url?: unknown;
  external_url?: unknown;
  status?: unknown;
  stamp_enabled?: unknown;
  stamp_goal?: unknown;
  stamp_reward_text?: unknown;
  cost_total?: unknown;
  redemption_code?: unknown;
};

/** スタンプゴール: 1〜20 の整数にクランプ（不正値は既定3） */
function parseStampGoal(value: unknown): number {
  const n =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return 3;
  return Math.min(20, Math.max(1, Math.round(n)));
}

/** イベント費用: 0以上の整数（円）。未入力/不正は null */
function parseCost(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

const STATUSES: PlatformEventStatus[] = ['draft', 'published', 'archived'];

function nullableString(value: unknown, max = 2000): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function nullableIso(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const trimmed = value.trim();
  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), -9, 0, 0, 0)).toISOString();
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function nullableEndIso(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const trimmed = value.trim();
  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 14, 59, 59, 999)).toISOString();
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function parsePayload(raw: EventPayload) {
  const title = nullableString(raw.title, 120);
  if (!title) return null;
  const status =
    typeof raw.status === 'string' && STATUSES.includes(raw.status as PlatformEventStatus)
      ? (raw.status as PlatformEventStatus)
      : 'draft';
  return {
    title,
    organizer_name: nullableString(raw.organizer_name, 120),
    description: nullableString(raw.description, 4000),
    area_label: nullableString(raw.area_label, 120),
    start_at: nullableIso(raw.start_at),
    end_at: nullableEndIso(raw.end_at),
    image_url: nullableString(raw.image_url, 1000),
    external_url: nullableString(raw.external_url, 1000),
    status,
    stamp_enabled: raw.stamp_enabled === false ? false : true,
    stamp_goal: parseStampGoal(raw.stamp_goal),
    stamp_reward_text: nullableString(raw.stamp_reward_text, 200),
    cost_total: parseCost(raw.cost_total),
    redemption_code: nullableString(raw.redemption_code, 40),
  };
}

/** redemption_code 列が未作成(マイグレーション未適用)の環境を検出 */
function isMissingRedemptionCodeColumn(
  error: { code?: string; message?: string } | null
) {
  return (
    !!error &&
    (error.code === '42703' || error.code === 'PGRST204') &&
    /redemption_code/.test(error.message ?? '')
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const auth = await resolveManageAuth(request);
  if (!auth.ok) return auth.response;
  const forbidden = await assertPlatformAdmin(auth.ctx);
  if (forbidden) return forbidden;

  let raw: EventPayload;
  try {
    raw = (await request.json()) as EventPayload;
  } catch {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
  const payload = parsePayload(raw);
  if (!payload) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const updateRow = { ...payload, updated_at: new Date().toISOString() };
  let { data, error } = await (auth.ctx.admin as any)
    .from('platform_events')
    .update(updateRow)
    .eq('id', params.eventId)
    .select('*')
    .single();
  // redemption_code 列が未作成なら除外して再試行（マイグレーション前でも動作）
  if (error && isMissingRedemptionCodeColumn(error)) {
    const { redemption_code: _omit, ...withoutCode } = updateRow;
    ({ data, error } = await (auth.ctx.admin as any)
      .from('platform_events')
      .update(withoutCode)
      .eq('id', params.eventId)
      .select('*')
      .single());
  }
  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'table_missing' }, { status: 501 });
    }
    console.error('[platform-events] update error', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
  return NextResponse.json({ event: data as PlatformEvent });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const auth = await resolveManageAuth(request);
  if (!auth.ok) return auth.response;
  const forbidden = await assertPlatformAdmin(auth.ctx);
  if (forbidden) return forbidden;

  const { error } = await (auth.ctx.admin as any)
    .from('platform_events')
    .delete()
    .eq('id', params.eventId);
  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'table_missing' }, { status: 501 });
    }
    console.error('[platform-events] delete error', error);
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
