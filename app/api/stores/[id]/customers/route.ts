// ============================================
// GET /api/stores/[id]/customers
// 店舗の来店顧客データを集計して返す。
// 認可: stores.owner_id === user.id (or admin)
// 集計: store_check_ins を user_id 単位でグルーピングし、
//       来店回数 / 初回来店日 / 最終来店日 / 過去30日来店数 を算出。
//       users から display_name / avatar / profile_attributes を join。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { CUSTOMER_IDENTITY_SELECT } from '@/lib/customer-identity';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

import type {
  StoreCustomerMemo,
  StoreCustomerRow,
  ProfileAttrs,
} from '@/lib/types/store-customer';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

function jsonNoStore(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonNoStore({ error: 'server_misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonNoStore({ error: 'unauthorized' }, { status: 401 });
  }
  const accessToken = authHeader.slice(7);

  const anon = createClient<Database>(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user: operator },
    error: userErr,
  } = await anon.auth.getUser(accessToken);
  if (userErr || !operator) {
    return jsonNoStore({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: store } = await admin
    .from('stores')
    .select('id, owner_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!store) {
    return jsonNoStore({ error: 'store_not_found' }, { status: 404 });
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
      return jsonNoStore({ error: 'forbidden' }, { status: 403 });
    }
  }

  // 全チェックイン取得
  const { data: checkIns, error: ciErr } = await admin
    .from('store_check_ins')
    .select('user_id, checked_in_at')
    .eq('store_id', params.id)
    .order('checked_in_at', { ascending: true });
  if (ciErr) {
    console.error('[customers] fetch check-ins error', ciErr);
    return jsonNoStore({ error: 'fetch_failed' }, { status: 500 });
  }

  if (!checkIns || checkIns.length === 0) {
    return jsonNoStore({ customers: [] satisfies StoreCustomerRow[] });
  }

  const rawUserIds = Array.from(new Set(checkIns.map((row) => row.user_id)));

  // ユーザー属性取得。端末IDでの統合はせず、チェックインした user_id のみを表示する。
  const { data: initialUsersRows } = await admin
    .from('users')
    .select(CUSTOMER_IDENTITY_SELECT)
    .in('id', rawUserIds);

  const userMap = new Map((initialUsersRows ?? []).map((u) => [u.id, u]));

  // store_check_ins.user_id 単位で集計する。
  // 同一端末でも、LINEログインとメールログインは別顧客として扱う。
  type Aggregate = {
    visits: string[];
    first: string;
    last: string;
  };
  const grouped = new Map<string, Aggregate>();
  for (const row of checkIns) {
    const customerId = row.user_id;
    const cur = grouped.get(customerId);
    if (!cur) {
      grouped.set(customerId, {
        visits: [row.checked_in_at],
        first: row.checked_in_at,
        last: row.checked_in_at,
      });
    } else {
      cur.visits.push(row.checked_in_at);
      if (row.checked_in_at < cur.first) cur.first = row.checked_in_at;
      if (row.checked_in_at > cur.last) cur.last = row.checked_in_at;
    }
  }

  const userIds = Array.from(grouped.keys());

  let memoMap = new Map<string, StoreCustomerMemo>();
  const { data: memoRows, error: memoErr } = await (admin as any)
    .from('store_customer_notes')
    .select(
      'id, store_id, user_id, order_notes, preference_notes, conversation_notes, updated_at, updated_by'
    )
    .eq('store_id', params.id)
    .in('user_id', userIds);
  if (memoErr && memoErr.code !== '42P01') {
    console.warn('[customers] fetch memo warning', memoErr);
  }
  if (!memoErr && memoRows) {
    memoMap = new Map(
      (memoRows as StoreCustomerMemo[]).map((memo) => [memo.user_id, memo])
    );
  }

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const customers: StoreCustomerRow[] = userIds.map((uid) => {
    const agg = grouped.get(uid)!;
    const u = userMap.get(uid);
    const attrs = (u?.profile_attributes ?? {}) as ProfileAttrs;
    const visit_count = agg.visits.length;
    const visit_count_30d = agg.visits.filter(
      (t) => new Date(t).getTime() >= thirtyDaysAgo
    ).length;
    const firstMs = new Date(agg.first).getTime();
    const periodMs = Math.max(now - firstMs, 7 * 24 * 60 * 60 * 1000);
    const visits_per_week =
      Math.round((visit_count / (periodMs / (7 * 24 * 60 * 60 * 1000))) * 10) /
      10;

    return {
      user_id: uid,
      display_name:
        u?.line_display_name || u?.display_name || '（名前未設定）',
      avatar_url: u?.line_picture_url || u?.avatar_url || null,
      line_linked: !!u?.line_user_id,
      visit_count,
      first_visit_at: agg.first,
      last_visit_at: agg.last,
      visit_count_30d,
      visits_per_week,
      attributes: attrs,
      memo: memoMap.get(uid) ?? null,
    };
  });

  // 最終来店日 desc
  customers.sort(
    (a, b) =>
      new Date(b.last_visit_at).getTime() - new Date(a.last_visit_at).getTime()
  );

  return jsonNoStore({ customers });
}
