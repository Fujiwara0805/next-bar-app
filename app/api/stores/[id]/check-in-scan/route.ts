// ============================================
// POST /api/stores/[id]/check-in-scan
// 店舗スタッフが顧客マイページのQR (/c?u=..&t=..&s=..) をスキャンして
// その顧客の来店をチェックインとして記録する（Phase 11）。
// Bearer認証 = 店舗オーナー or admin。Body = { u, t, s } 顧客トークン。
// スタンプは 12時間ローリング窓で distinct 店舗数をカウント（既存 /api/check-in 踏襲）。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  parseCustomerCheckInPayload,
  verifyCustomerCheckInToken,
} from '@/lib/qr/signature';
import {
  snapshotEventStampPre,
  finalizeEventStamp,
} from '@/lib/check-in/event-stamp';
import { autoRedeemElectronicCoupons } from '@/lib/check-in/coupon-redeem';
import { CUSTOMER_IDENTITY_SELECT } from '@/lib/customer-identity';
import type { Database } from '@/lib/supabase/types';
import type { ProfileAttrs, StoreCustomerMemo } from '@/lib/types/store-customer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const accessToken = authHeader.slice(7);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const payload = parseCustomerCheckInPayload(rawBody);
  if (!payload) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const anon = createClient<Database>(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user: operator },
    error: userErr,
  } = await anon.auth.getUser(accessToken);
  if (userErr || !operator) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: store } = await admin
    .from('stores')
    .select('id, name, owner_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!store) {
    return NextResponse.json({ error: 'store_not_found' }, { status: 404 });
  }

  // 認可: 1) 運営オーナー  2) admin ロール  3) 店舗アカウント本体 (auth.id === stores.id)
  const isOwner = store.owner_id === operator.id;
  const isStoreSelf = store.id === operator.id;
  if (!isOwner && !isStoreSelf) {
    const { data: operatorRow } = await admin
      .from('users')
      .select('role')
      .eq('id', operator.id)
      .maybeSingle();
    if (operatorRow?.role !== 'admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  const verify = verifyCustomerCheckInToken(payload);
  if (!verify.ok) {
    const code = verify.reason === 'expired' ? 'token_expired' : 'invalid_token';
    return NextResponse.json({ error: code }, { status: 403 });
  }

  const { data: customer } = await admin
    .from('users')
    .select(CUSTOMER_IDENTITY_SELECT)
    .eq('id', payload.u)
    .maybeSingle();
  if (!customer) {
    return NextResponse.json({ error: 'customer_not_found' }, { status: 404 });
  }
  if (customer.role && customer.role !== 'customer' && customer.role !== 'user') {
    return NextResponse.json({ error: 'customer_only' }, { status: 403 });
  }

  // セルフチェックイン(store-checkin)と同条件: プロフィール(住所・年齢・職業・性別)必須。
  // 店スキャン・セルフのどちらの来店経路でも会員の属性が揃ってから記録する。
  const attrs = (customer.profile_attributes ?? {}) as ProfileAttrs;
  const profileComplete = Boolean(
    attrs.address?.trim() &&
      attrs.age?.trim() &&
      attrs.occupation?.trim() &&
      attrs.gender?.trim()
  );
  if (!profileComplete) {
    return NextResponse.json({ error: 'profile_incomplete' }, { status: 403 });
  }

  const now = new Date();
  const stampPre = await snapshotEventStampPre(admin, customer.id, store.id, now);

  const { error: insertErr } = await admin.from('store_check_ins').insert({
    user_id: customer.id,
    store_id: store.id,
    source: 'qr_scan',
  });

  const isDuplicateRow = insertErr?.code === '23505';
  if (insertErr && !isDuplicateRow) {
    console.error('[check-in-scan] insert error:', insertErr);
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  const eventStamp = stampPre
    ? await finalizeEventStamp(admin, customer.id, stampPre, now)
    : null;

  // 電子クーポンの自動消込：会員証QRを1回スキャンするだけで「スタンプ獲得」と
  // 「クーポン消込」が同時に完了する。ロジックは店舗QR経路（store-checkin）と共通化。
  const couponRedeemedCount = await autoRedeemElectronicCoupons(
    admin,
    customer.id,
    store.id,
    { createdBy: operator.id, now }
  );

  const userDisplayName =
    customer.line_display_name || customer.display_name || 'ゲスト';

  const { data: customerCheckIns } = await admin
    .from('store_check_ins')
    .select('checked_in_at')
    .eq('store_id', store.id)
    .eq('user_id', customer.id)
    .order('checked_in_at', { ascending: false });

  const { data: memoRow, error: memoErr } = await (admin as any)
    .from('store_customer_notes')
    .select(
      'id, store_id, user_id, order_notes, preference_notes, conversation_notes, updated_at, updated_by'
    )
    .eq('store_id', store.id)
    .eq('user_id', customer.id)
    .maybeSingle();
  if (memoErr && memoErr.code !== '42P01' && memoErr.code !== 'PGRST116') {
    console.warn('[check-in-scan] fetch memo warning', memoErr);
  }

  return NextResponse.json({
    storeId: store.id,
    storeName: store.name,
    userId: customer.id,
    userDisplayName,
    customer: {
      user_id: customer.id,
      display_name: userDisplayName,
      avatar_url: customer.line_picture_url || customer.avatar_url || null,
      line_linked: !!customer.line_user_id,
      visit_count: customerCheckIns?.length ?? 1,
      last_visit_at: customerCheckIns?.[0]?.checked_in_at ?? now.toISOString(),
      previous_visit_at: customerCheckIns?.[1]?.checked_in_at ?? null,
      attributes: (customer.profile_attributes ?? {}) as ProfileAttrs,
      memo: memoErr ? null : ((memoRow ?? null) as StoreCustomerMemo | null),
    },
    eventStamp,
    couponRedeemed: couponRedeemedCount,
  });
}
