import { NextRequest, NextResponse } from 'next/server';
import {
  assertStoreAccess,
  resolveManageAuth,
} from '@/lib/api/manage-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PaperCouponRow = {
  id: string;
  event_id: string;
  store_id: string;
  distributed_count: number;
  redeemed_count: number;
  notes: string | null;
  reported_at: string | null;
  updated_at: string;
};

const SELECT = 'id, event_id, store_id, distributed_count, redeemed_count, notes, reported_at, updated_at';

/** 0以上の整数にクランプ（不正は0） */
function parseCount(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

// 自店の紙クーポン報告を取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; eventId: string } }
) {
  const auth = await resolveManageAuth(request);
  if (!auth.ok) return auth.response;
  const forbidden = await assertStoreAccess(auth.ctx, params.id);
  if (forbidden) return forbidden;

  const { data, error } = await (auth.ctx.admin as any)
    .from('store_event_paper_coupons')
    .select(SELECT)
    .eq('store_id', params.id)
    .eq('event_id', params.eventId)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ report: null });
    console.error('[paper-coupons] fetch error', error);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
  return NextResponse.json({ report: (data ?? null) as PaperCouponRow | null });
}

// 自店の紙クーポン配布/使用枚数を登録・更新（upsert）
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; eventId: string } }
) {
  const auth = await resolveManageAuth(request);
  if (!auth.ok) return auth.response;
  const forbidden = await assertStoreAccess(auth.ctx, params.id);
  if (forbidden) return forbidden;

  let raw: { distributed_count?: unknown; redeemed_count?: unknown; notes?: unknown };
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const distributed = parseCount(raw.distributed_count);
  const redeemed = parseCount(raw.redeemed_count);
  // 使用枚数は配布枚数を超えない
  const redeemedClamped = Math.min(redeemed, distributed);
  const notes =
    typeof raw.notes === 'string' && raw.notes.trim()
      ? raw.notes.trim().slice(0, 500)
      : null;

  const now = new Date().toISOString();
  const updatedBy = auth.ctx.operatorId;

  const { data, error } = await (auth.ctx.admin as any)
    .from('store_event_paper_coupons')
    .upsert(
      {
        event_id: params.eventId,
        store_id: params.id,
        distributed_count: distributed,
        redeemed_count: redeemedClamped,
        notes,
        reported_at: now,
        updated_by: updatedBy,
        updated_at: now,
      },
      { onConflict: 'event_id,store_id' }
    )
    .select(SELECT)
    .single();

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'table_missing' }, { status: 501 });
    }
    console.error('[paper-coupons] upsert error', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
  return NextResponse.json({ report: data as PaperCouponRow });
}
