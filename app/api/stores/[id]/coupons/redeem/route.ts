// ============================================
// POST /api/stores/[id]/coupons/redeem
// 6桁コード消込 API（店舗オーナー / admin 限定）
//
// フロー:
//   1. Bearer認証 → 店舗オーナー（or admin）検証
//   2. 6桁コードを `coupon_issues.redeem_code` で検索（store_id一致）
//   3. 既に redeemed_at があれば 409 / クーポン無効なら 400 / 有効期限切れなら 400
//   4. coupon_redemptions insert + coupon_issues.redeemed_at / redeemed_by_user_id 更新（トランザクション）
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { isValidRedeemCode, normalizeRedeemCode } from '@/lib/coupons/signature';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }
  const { id: storeId } = await params;

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const token = authHeader.slice(7);

  const userClient = createClient<Database>(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser(token);
  if (userErr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { code?: string; amountUsed?: number; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const rawCode = typeof body.code === 'string' ? body.code : '';
  const code = normalizeRedeemCode(rawCode);
  if (!isValidRedeemCode(code)) {
    return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: store } = await admin
    .from('stores')
    .select('id, owner_id, name')
    .eq('id', storeId)
    .maybeSingle();
  if (!store) {
    return NextResponse.json({ error: 'store_not_found' }, { status: 404 });
  }
  if (store.owner_id !== user.id) {
    const { data: me } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (me?.role !== 'admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  // store_id 一致 & redeem_code 一致で検索
  const { data: issue } = await admin
    .from('coupon_issues')
    .select(
      'id, coupon_id, store_id, redeem_code, redeemed_at, user_id, line_user_id'
    )
    .eq('store_id', storeId)
    .eq('redeem_code', code)
    .maybeSingle();

  if (!issue) {
    return NextResponse.json({ error: 'code_not_found' }, { status: 404 });
  }
  if (issue.redeemed_at) {
    return NextResponse.json(
      { error: 'already_redeemed', redeemedAt: issue.redeemed_at },
      { status: 409 }
    );
  }

  // クーポン有効性チェック
  const { data: coupon } = await admin
    .from('store_coupons')
    .select('id, title, is_active, valid_from, valid_until, discount_type, discount_value')
    .eq('id', issue.coupon_id)
    .maybeSingle();
  if (!coupon) {
    return NextResponse.json({ error: 'coupon_not_found' }, { status: 404 });
  }
  if (!coupon.is_active) {
    return NextResponse.json({ error: 'coupon_inactive' }, { status: 400 });
  }
  const now = Date.now();
  if (coupon.valid_from && new Date(coupon.valid_from).getTime() > now) {
    return NextResponse.json({ error: 'coupon_not_started' }, { status: 400 });
  }
  if (new Date(coupon.valid_until).getTime() < now) {
    return NextResponse.json({ error: 'coupon_expired' }, { status: 400 });
  }

  const redeemedAt = new Date().toISOString();
  const amountUsed =
    typeof body.amountUsed === 'number' && body.amountUsed >= 0
      ? Math.floor(body.amountUsed)
      : null;
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) : null;

  // 1. coupon_issues を先に更新（redeemed_at が null の行のみ更新する条件で race 対策）
  const { data: updatedIssue, error: updateErr } = await admin
    .from('coupon_issues')
    .update({
      redeemed_at: redeemedAt,
      redeemed_by_user_id: user.id,
    })
    .eq('id', issue.id)
    .is('redeemed_at', null)
    .select('id, redeemed_at')
    .maybeSingle();

  if (updateErr) {
    return NextResponse.json(
      { error: 'update_failed', message: updateErr.message },
      { status: 500 }
    );
  }
  if (!updatedIssue) {
    // 同時消込（他端末で先に消し込まれた）
    return NextResponse.json({ error: 'already_redeemed' }, { status: 409 });
  }

  // 2. coupon_redemptions insert
  const { error: insertErr } = await admin.from('coupon_redemptions').insert({
    issue_id: issue.id,
    store_id: storeId,
    redeemed_at: redeemedAt,
    redeemed_by_user_id: user.id,
    amount_used: amountUsed,
    notes: notes || null,
  });
  if (insertErr) {
    // ロールバック: redeemed_at を戻す
    await admin
      .from('coupon_issues')
      .update({ redeemed_at: null, redeemed_by_user_id: null })
      .eq('id', issue.id);
    return NextResponse.json(
      { error: 'redemption_failed', message: insertErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    issueId: issue.id,
    couponTitle: coupon.title,
    discountType: coupon.discount_type,
    discountValue: coupon.discount_value,
    redeemedAt,
  });
}
