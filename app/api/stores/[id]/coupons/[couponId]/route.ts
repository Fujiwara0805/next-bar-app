// ============================================
// PATCH  /api/stores/[id]/coupons/[couponId] — クーポン更新（is_active / 値変更）
// DELETE /api/stores/[id]/coupons/[couponId] — クーポンアーカイブ（物理削除は行わない）
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const MAX_TITLE = 60;
const MAX_BODY = 400;
const MAX_CONDITIONS = 300;

async function authorize(request: NextRequest, storeId: string) {
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; couponId: string }> }
) {
  const { id: storeId, couponId } = await params;
  const auth = await authorize(request, storeId);
  if ('error' in auth) return auth.error;

  let body: {
    title?: string;
    body?: string | null;
    image_url?: string | null;
    discount_value?: number | null;
    conditions?: string | null;
    valid_from?: string | null;
    valid_until?: string;
    max_issues?: number | null;
    max_per_user?: number;
    is_active?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.title === 'string') {
    const t = body.title.trim();
    if (!t || t.length > MAX_TITLE) {
      return NextResponse.json({ error: 'invalid_title' }, { status: 400 });
    }
    update.title = t;
  }
  if (body.body !== undefined) {
    const t = body.body?.trim() || null;
    if (t && t.length > MAX_BODY) {
      return NextResponse.json({ error: 'invalid_body_text' }, { status: 400 });
    }
    update.body = t;
  }
  if (body.image_url !== undefined) {
    update.image_url = body.image_url?.trim() || null;
  }
  if (body.discount_value !== undefined) {
    update.discount_value =
      typeof body.discount_value === 'number' ? body.discount_value : null;
  }
  if (body.conditions !== undefined) {
    const c = body.conditions?.trim() || null;
    if (c && c.length > MAX_CONDITIONS) {
      return NextResponse.json({ error: 'invalid_conditions' }, { status: 400 });
    }
    update.conditions = c;
  }
  if (body.valid_until !== undefined) {
    const d = new Date(body.valid_until);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: 'invalid_valid_until' }, { status: 400 });
    }
    update.valid_until = d.toISOString();
  }
  if (body.valid_from !== undefined) {
    if (body.valid_from === null) {
      update.valid_from = null;
    } else {
      const d = new Date(body.valid_from);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'invalid_valid_from' }, { status: 400 });
      }
      update.valid_from = d.toISOString();
    }
  }
  if (body.max_issues !== undefined) {
    if (body.max_issues === null) {
      update.max_issues = null;
    } else if (typeof body.max_issues === 'number' && body.max_issues > 0) {
      update.max_issues = Math.floor(body.max_issues);
    } else {
      return NextResponse.json({ error: 'invalid_max_issues' }, { status: 400 });
    }
  }
  if (body.max_per_user !== undefined) {
    if (typeof body.max_per_user !== 'number' || body.max_per_user <= 0) {
      return NextResponse.json({ error: 'invalid_max_per_user' }, { status: 400 });
    }
    update.max_per_user = Math.floor(body.max_per_user);
  }
  if (typeof body.is_active === 'boolean') update.is_active = body.is_active;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 });
  }

  update.updated_at = new Date().toISOString();

  const { data: updated, error: updateErr } = await auth.admin
    .from('store_coupons')
    .update(update)
    .eq('id', couponId)
    .eq('store_id', storeId)
    .select()
    .maybeSingle();

  if (updateErr) {
    return NextResponse.json(
      { error: 'update_failed', message: updateErr.message },
      { status: 500 }
    );
  }
  if (!updated) {
    return NextResponse.json({ error: 'coupon_not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, coupon: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; couponId: string }> }
) {
  const { id: storeId, couponId } = await params;
  const auth = await authorize(request, storeId);
  if ('error' in auth) return auth.error;

  // 配信済（coupon_issues が存在する）ものは物理削除せず is_active=false にソフト削除
  const { count } = await auth.admin
    .from('coupon_issues')
    .select('id', { count: 'exact', head: true })
    .eq('coupon_id', couponId);

  if ((count ?? 0) > 0) {
    const { error } = await auth.admin
      .from('store_coupons')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', couponId)
      .eq('store_id', storeId);
    if (error) {
      return NextResponse.json(
        { error: 'archive_failed', message: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, archived: true });
  }

  const { error: delErr } = await auth.admin
    .from('store_coupons')
    .delete()
    .eq('id', couponId)
    .eq('store_id', storeId);
  if (delErr) {
    return NextResponse.json(
      { error: 'delete_failed', message: delErr.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, archived: false });
}
