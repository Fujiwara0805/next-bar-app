// ============================================
// GET /api/coupon-issues — ログインユーザーが受領した全クーポンを一覧で返す
//
// 認可: LIFF / Supabase の Bearer トークンで認証。
//       `coupon_issues.user_id === 認証ユーザー` または
//       `coupon_issues.line_user_id === users.line_user_id` の発行を集約する。
// 返却: { issues: [...] } を最新順で。各要素にクーポン本体と店舗情報を JOIN。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

export async function GET(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  const user = await authUser(request);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: me } = await admin
    .from('users')
    .select('line_user_id')
    .eq('id', user.id)
    .maybeSingle();
  const lineUserId = me?.line_user_id ?? null;

  type IssueRow = {
    id: string;
    coupon_id: string;
    store_id: string;
    redeem_code: string;
    issued_at: string;
    redeemed_at: string | null;
    line_user_id: string | null;
    user_id: string | null;
  };

  // user_id 一致分
  const byUserId = await admin
    .from('coupon_issues')
    .select('id, coupon_id, store_id, redeem_code, issued_at, redeemed_at, line_user_id, user_id')
    .eq('user_id', user.id)
    .order('issued_at', { ascending: false });

  // line_user_id 一致分 (user_id が NULL のまま残っている履歴用)
  const byLineUserId = lineUserId
    ? await admin
        .from('coupon_issues')
        .select('id, coupon_id, store_id, redeem_code, issued_at, redeemed_at, line_user_id, user_id')
        .is('user_id', null)
        .eq('line_user_id', lineUserId)
        .order('issued_at', { ascending: false })
    : { data: [] as IssueRow[], error: null };

  if (byUserId.error || byLineUserId.error) {
    return NextResponse.json(
      { error: 'fetch_failed', detail: byUserId.error?.message ?? byLineUserId.error?.message },
      { status: 500 }
    );
  }

  const merged: IssueRow[] = [
    ...((byUserId.data ?? []) as IssueRow[]),
    ...((byLineUserId.data ?? []) as IssueRow[]),
  ];

  if (merged.length === 0) {
    return NextResponse.json({ issues: [] });
  }

  const couponIds = Array.from(new Set(merged.map((m) => m.coupon_id)));
  const storeIds = Array.from(new Set(merged.map((m) => m.store_id)));

  const [{ data: coupons }, { data: stores }] = await Promise.all([
    admin
      .from('store_coupons')
      .select('id, title, body, image_url, discount_type, discount_value, valid_from, valid_until')
      .in('id', couponIds),
    admin.from('stores').select('id, name, image_urls').in('id', storeIds),
  ]);

  const couponMap = new Map((coupons ?? []).map((c) => [c.id, c]));
  const storeMap = new Map((stores ?? []).map((s) => [s.id, s]));

  const issues = merged
    .map((row: IssueRow) => {
      const coupon = couponMap.get(row.coupon_id);
      const store = storeMap.get(row.store_id);
      if (!coupon) return null;
      const validUntilMs = coupon.valid_until ? new Date(coupon.valid_until).getTime() : null;
      const isExpired = validUntilMs != null && validUntilMs < Date.now();
      const isRedeemed = !!row.redeemed_at;
      const status: 'active' | 'redeemed' | 'expired' = isRedeemed
        ? 'redeemed'
        : isExpired
        ? 'expired'
        : 'active';
      return {
        id: row.id,
        issuedAt: row.issued_at,
        redeemedAt: row.redeemed_at,
        status,
        coupon: {
          id: coupon.id,
          title: coupon.title,
          body: coupon.body,
          imageUrl: coupon.image_url,
          discountType: coupon.discount_type as 'percent' | 'amount' | 'free_item' | 'other',
          discountValue: coupon.discount_value,
          validUntil: coupon.valid_until,
        },
        store: store
          ? {
              id: store.id,
              name: store.name,
              imageUrl: Array.isArray(store.image_urls) ? store.image_urls[0] ?? null : null,
            }
          : null,
      };
    })
    .filter(Boolean);

  // 並び順: active → expired → redeemed、各グループ内は新しい順
  const rank = { active: 0, expired: 1, redeemed: 2 } as const;
  issues.sort((a, b) => {
    if (!a || !b) return 0;
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    return new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime();
  });

  return NextResponse.json({ issues });
}
