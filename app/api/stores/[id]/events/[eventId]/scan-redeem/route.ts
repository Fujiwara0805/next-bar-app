// ============================================
// POST /api/stores/[id]/events/[eventId]/scan-redeem
// 店舗スタッフが顧客の会員証QR (/c?u=..&t=..&s=..) をスキャンして、
// 当該イベントの特典を「その会員に紐付けて」消し込む（C5: per-user 消込）。
//
// 会員証スキャンと同様に:
//   - store_check_ins に来店記録を残す（来店履歴・顧客データに反映）
//   - store_event_benefit_redemptions に user_id 付きで消込を記録
//     → 運営のイベント管理で「どの顧客がいつ消し込んだか」を把握できる
//
// 1会員1イベント1回（uq_sebr_event_user）。重複時は already_redeemed を返す。
// Bearer認証 = 店舗オーナー / 店舗アカウント本体 / admin。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  parseCustomerCheckInPayload,
  verifyCustomerCheckInToken,
} from '@/lib/qr/signature';
import { CUSTOMER_IDENTITY_SELECT } from '@/lib/customer-identity';
import type { Database } from '@/lib/supabase/types';
import type { ProfileAttrs } from '@/lib/types/store-customer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** user_id 列が未作成の環境を検出（マイグレーション未適用時のフォールバック用） */
function isMissingColumn(error: { code?: string; message?: string } | null) {
  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    /user_id/.test(error?.message ?? '')
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; eventId: string } }
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

  // 認可: 1) 運営オーナー  2) 店舗アカウント本体  3) admin ロール
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

  // 参加中のイベントのみ消込可能
  const { data: participation } = await (admin as any)
    .from('store_event_participations')
    .select('id, is_participating')
    .eq('store_id', params.id)
    .eq('event_id', params.eventId)
    .maybeSingle();
  if (!participation || !participation.is_participating) {
    return NextResponse.json({ error: 'not_participating' }, { status: 400 });
  }

  // 顧客QRトークン検証
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

  const now = new Date().toISOString();

  // 来店記録（会員証スキャンと同様。同日同店の重複は 23505 で許容）
  const { error: checkInErr } = await admin.from('store_check_ins').insert({
    user_id: customer.id,
    store_id: store.id,
    source: 'qr_scan',
  });
  if (checkInErr && checkInErr.code !== '23505') {
    console.warn('[scan-redeem] check-in insert warning', checkInErr);
  }

  const createdBy = isStoreSelf || isOwner ? operator.id : operator.id;

  // 特典消込（user_id 付き）。1会員1イベント1回（uq_sebr_event_user）。
  const insertWithUser = await (admin as any)
    .from('store_event_benefit_redemptions')
    .insert({
      event_id: params.eventId,
      store_id: params.id,
      user_id: customer.id,
      redeemed_at: now,
      created_by: createdBy,
    })
    .select('id, redeemed_at')
    .single();

  const userDisplayName =
    customer.line_display_name || customer.display_name || 'ゲスト';
  const customerInfo = {
    user_id: customer.id,
    display_name: userDisplayName,
    avatar_url: customer.line_picture_url || customer.avatar_url || null,
    line_linked: !!customer.line_user_id,
    attributes: (customer.profile_attributes ?? {}) as ProfileAttrs,
  };

  if (insertWithUser.error) {
    const err = insertWithUser.error;
    // 重複 = この会員は既に当該イベントを消込済み
    if (err.code === '23505') {
      return NextResponse.json(
        { error: 'already_redeemed', customer: customerInfo },
        { status: 409 }
      );
    }
    // user_id 列が未作成（マイグレーション未適用）の場合は匿名消込にフォールバック
    if (isMissingColumn(err)) {
      const fallback = await (admin as any)
        .from('store_event_benefit_redemptions')
        .insert({
          event_id: params.eventId,
          store_id: params.id,
          redeemed_at: now,
          created_by: createdBy,
        })
        .select('id, redeemed_at')
        .single();
      if (fallback.error) {
        if (fallback.error.code === '42P01') {
          return NextResponse.json({ error: 'table_missing' }, { status: 501 });
        }
        console.error('[scan-redeem] fallback insert error', fallback.error);
        return NextResponse.json({ error: 'save_failed' }, { status: 500 });
      }
      return NextResponse.json({
        ok: true,
        per_user: false,
        redemption: fallback.data,
        customer: customerInfo,
      });
    }
    if (err.code === '42P01') {
      return NextResponse.json({ error: 'table_missing' }, { status: 501 });
    }
    console.error('[scan-redeem] insert error', err);
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    per_user: true,
    redemption: insertWithUser.data,
    customer: customerInfo,
  });
}
