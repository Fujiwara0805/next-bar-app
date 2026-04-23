// ============================================
// GET  /api/stores/[id]/coupons        — クーポン一覧（店舗オーナー/admin）
// POST /api/stores/[id]/coupons        — クーポン新規作成
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const ALLOWED_DISCOUNT_TYPES = ['percent', 'amount', 'free_item', 'other'] as const;
type DiscountType = (typeof ALLOWED_DISCOUNT_TYPES)[number];

const MAX_TITLE = 60;
const MAX_BODY = 400;
const MAX_CONDITIONS = 300;

type AuthCtx = {
  admin: ReturnType<typeof createClient<Database>>;
  userId: string;
};

async function authorize(
  request: NextRequest,
  storeId: string
): Promise<{ error: NextResponse } | AuthCtx> {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return { error: NextResponse.json({ error: 'server_misconfigured' }, { status: 500 }) };
  }
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }
  const token = authHeader.slice(7);
  const userClient = createClient<Database>(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser(token);
  if (error || !user) {
    return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }
  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: store } = await admin
    .from('stores')
    .select('id, owner_id')
    .eq('id', storeId)
    .maybeSingle();
  if (!store) {
    return { error: NextResponse.json({ error: 'store_not_found' }, { status: 404 }) };
  }
  if (store.owner_id !== user.id) {
    const { data: me } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (me?.role !== 'admin') {
      return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
    }
  }
  return { admin, userId: user.id };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storeId } = await params;
  const auth = await authorize(request, storeId);
  if ('error' in auth) return auth.error;

  const { data: coupons } = await auth.admin
    .from('store_coupons')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  const ids = (coupons ?? []).map((c) => c.id);
  let issuedCounts: Record<string, number> = {};
  let redeemedCounts: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: issues } = await auth.admin
      .from('coupon_issues')
      .select('coupon_id, redeemed_at')
      .in('coupon_id', ids);
    for (const row of issues ?? []) {
      const cid = row.coupon_id as string;
      issuedCounts[cid] = (issuedCounts[cid] ?? 0) + 1;
      if (row.redeemed_at) redeemedCounts[cid] = (redeemedCounts[cid] ?? 0) + 1;
    }
  }

  const enriched = (coupons ?? []).map((c) => ({
    ...c,
    issued_count: issuedCounts[c.id] ?? 0,
    redeemed_count: redeemedCounts[c.id] ?? 0,
  }));

  return NextResponse.json({ ok: true, coupons: enriched });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storeId } = await params;
  const auth = await authorize(request, storeId);
  if ('error' in auth) return auth.error;

  let body: {
    title?: string;
    body?: string | null;
    image_url?: string | null;
    discount_type?: DiscountType;
    discount_value?: number | null;
    conditions?: string | null;
    valid_from?: string | null;
    valid_until?: string;
    max_issues?: number | null;
    max_per_user?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const title = (body.title ?? '').trim();
  if (!title || title.length > MAX_TITLE) {
    return NextResponse.json({ error: 'invalid_title' }, { status: 400 });
  }
  const bodyText = body.body?.trim() || null;
  if (bodyText && bodyText.length > MAX_BODY) {
    return NextResponse.json({ error: 'invalid_body_text' }, { status: 400 });
  }
  const conditions = body.conditions?.trim() || null;
  if (conditions && conditions.length > MAX_CONDITIONS) {
    return NextResponse.json({ error: 'invalid_conditions' }, { status: 400 });
  }
  const discountType = body.discount_type;
  if (!discountType || !ALLOWED_DISCOUNT_TYPES.includes(discountType)) {
    return NextResponse.json({ error: 'invalid_discount_type' }, { status: 400 });
  }
  if (!body.valid_until) {
    return NextResponse.json({ error: 'invalid_valid_until' }, { status: 400 });
  }
  const validUntil = new Date(body.valid_until);
  if (Number.isNaN(validUntil.getTime())) {
    return NextResponse.json({ error: 'invalid_valid_until' }, { status: 400 });
  }
  const validFrom = body.valid_from ? new Date(body.valid_from) : null;
  if (validFrom && Number.isNaN(validFrom.getTime())) {
    return NextResponse.json({ error: 'invalid_valid_from' }, { status: 400 });
  }
  if (validFrom && validFrom > validUntil) {
    return NextResponse.json({ error: 'invalid_date_range' }, { status: 400 });
  }

  const maxIssues =
    body.max_issues == null
      ? null
      : typeof body.max_issues === 'number' && body.max_issues > 0
      ? Math.floor(body.max_issues)
      : null;
  const maxPerUser =
    typeof body.max_per_user === 'number' && body.max_per_user > 0
      ? Math.floor(body.max_per_user)
      : 1;

  const { data: created, error: insertErr } = await auth.admin
    .from('store_coupons')
    .insert({
      store_id: storeId,
      title,
      body: bodyText,
      image_url: body.image_url?.trim() || null,
      discount_type: discountType,
      discount_value:
        typeof body.discount_value === 'number' ? body.discount_value : null,
      conditions,
      valid_from: validFrom ? validFrom.toISOString() : null,
      valid_until: validUntil.toISOString(),
      max_issues: maxIssues,
      max_per_user: maxPerUser,
      is_active: true,
    })
    .select()
    .single();

  if (insertErr || !created) {
    return NextResponse.json(
      { error: 'insert_failed', message: insertErr?.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, coupon: created });
}
