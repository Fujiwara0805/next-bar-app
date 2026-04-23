// ============================================
// GET   /api/coupon-issues/[issueId] — LIFF 顧客がクーポン詳細（redeem_code 含む）を取得
// PATCH /api/coupon-issues/[issueId] — 属性情報を更新（年代/性別/初来店/出身県）
//
// 認可方針: LIFF から呼ばれるため、Bearer トークン（Supabase auth セッション）で
// 認証し、`coupon_issues.user_id === 認証ユーザー` or
// （`user_id` が null の場合に限り）`line_user_id` 一致で解放する。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const ALLOWED_AGE = ['10s', '20s', '30s', '40s', '50s', '60s+'] as const;
const ALLOWED_GENDER = ['male', 'female', 'other', 'unspecified'] as const;
const ALLOWED_ORIGIN = ['oita', 'other'] as const;

async function authUser(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) return null;
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const client = createClient<Database>(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
  } = await client.auth.getUser(token);
  return user;
}

async function loadIssue(admin: ReturnType<typeof createClient<Database>>, issueId: string) {
  const { data: issue } = await admin
    .from('coupon_issues')
    .select(
      'id, coupon_id, store_id, user_id, line_user_id, redeem_code, issued_at, redeemed_at, age_range, gender, is_first_visit, origin_prefecture'
    )
    .eq('id', issueId)
    .maybeSingle();
  if (!issue) return null;
  return issue;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }
  const { issueId } = await params;

  const user = await authUser(request);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const issue = await loadIssue(admin, issueId);
  if (!issue) {
    return NextResponse.json({ error: 'issue_not_found' }, { status: 404 });
  }

  // 認可: user_id 一致 / または line_user_id 経由で発行 & 認証ユーザーの LINE 紐付けと一致
  let authorized = false;
  if (issue.user_id && issue.user_id === user.id) {
    authorized = true;
  } else if (issue.line_user_id) {
    const { data: me } = await admin
      .from('users')
      .select('line_user_id')
      .eq('id', user.id)
      .maybeSingle();
    if (me?.line_user_id && me.line_user_id === issue.line_user_id) {
      // 一度 user_id を紐付ける（次回以降の高速化 & 漏れ防止）
      await admin
        .from('coupon_issues')
        .update({ user_id: user.id })
        .eq('id', issueId);
      authorized = true;
    }
  }
  if (!authorized) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data: coupon } = await admin
    .from('store_coupons')
    .select(
      'id, title, body, image_url, discount_type, discount_value, conditions, valid_from, valid_until, is_active'
    )
    .eq('id', issue.coupon_id)
    .maybeSingle();
  const { data: store } = await admin
    .from('stores')
    .select('id, name, address, latitude, longitude, image_urls')
    .eq('id', issue.store_id)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    issue,
    coupon,
    store,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }
  const { issueId } = await params;

  const user = await authUser(request);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const issue = await loadIssue(admin, issueId);
  if (!issue) {
    return NextResponse.json({ error: 'issue_not_found' }, { status: 404 });
  }
  if (issue.redeemed_at) {
    return NextResponse.json({ error: 'already_redeemed' }, { status: 400 });
  }

  let authorized = false;
  if (issue.user_id && issue.user_id === user.id) {
    authorized = true;
  } else if (issue.line_user_id) {
    const { data: me } = await admin
      .from('users')
      .select('line_user_id')
      .eq('id', user.id)
      .maybeSingle();
    if (me?.line_user_id && me.line_user_id === issue.line_user_id) {
      authorized = true;
    }
  }
  if (!authorized) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: {
    age_range?: string | null;
    gender?: string | null;
    is_first_visit?: boolean | null;
    origin_prefecture?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (body.age_range !== undefined) {
    if (body.age_range === null) update.age_range = null;
    else if ((ALLOWED_AGE as readonly string[]).includes(body.age_range))
      update.age_range = body.age_range;
    else return NextResponse.json({ error: 'invalid_age_range' }, { status: 400 });
  }
  if (body.gender !== undefined) {
    if (body.gender === null) update.gender = null;
    else if ((ALLOWED_GENDER as readonly string[]).includes(body.gender))
      update.gender = body.gender;
    else return NextResponse.json({ error: 'invalid_gender' }, { status: 400 });
  }
  if (body.is_first_visit !== undefined) {
    if (body.is_first_visit === null) update.is_first_visit = null;
    else if (typeof body.is_first_visit === 'boolean')
      update.is_first_visit = body.is_first_visit;
    else return NextResponse.json({ error: 'invalid_is_first_visit' }, { status: 400 });
  }
  if (body.origin_prefecture !== undefined) {
    if (body.origin_prefecture === null) update.origin_prefecture = null;
    else if ((ALLOWED_ORIGIN as readonly string[]).includes(body.origin_prefecture))
      update.origin_prefecture = body.origin_prefecture;
    else
      return NextResponse.json(
        { error: 'invalid_origin_prefecture' },
        { status: 400 }
      );
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 });
  }

  // user_id が null の場合はあわせて紐付ける
  if (!issue.user_id) {
    update.user_id = user.id;
  }

  const { error } = await admin
    .from('coupon_issues')
    .update(update)
    .eq('id', issueId);
  if (error) {
    return NextResponse.json(
      { error: 'update_failed', message: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
