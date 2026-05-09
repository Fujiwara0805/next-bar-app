import { NextRequest, NextResponse } from 'next/server';
import {
  assertStoreAccess,
  resolveManageAuth,
} from '@/lib/api/manage-auth';
import type { StoreCustomerMemo } from '@/lib/types/store-customer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type MemoPayload = {
  order_notes?: unknown;
  preference_notes?: unknown;
  conversation_notes?: unknown;
};

function normalizeNote(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed.slice(0, 4000) : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  const auth = await resolveManageAuth(request);
  if (!auth.ok) return auth.response;

  const forbidden = await assertStoreAccess(auth.ctx, params.id);
  if (forbidden) return forbidden;

  let raw: MemoPayload;
  try {
    raw = (await request.json()) as MemoPayload;
  } catch {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const payload = {
    store_id: params.id,
    user_id: params.userId,
    order_notes: normalizeNote(raw.order_notes),
    preference_notes: normalizeNote(raw.preference_notes),
    conversation_notes: normalizeNote(raw.conversation_notes),
    updated_by: auth.ctx.operatorId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await (auth.ctx.admin as any)
    .from('store_customer_notes')
    .upsert(payload, { onConflict: 'store_id,user_id' })
    .select(
      'id, store_id, user_id, order_notes, preference_notes, conversation_notes, updated_at, updated_by'
    )
    .single();

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'table_missing' }, { status: 501 });
    }
    console.error('[customer-memo] save error', error);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  return NextResponse.json({ memo: data as StoreCustomerMemo });
}
