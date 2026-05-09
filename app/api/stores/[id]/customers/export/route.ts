// ============================================
// GET /api/stores/[id]/customers/export
// 顧客データをCSV (BOM付UTF-8) でエクスポート。
// 認可: stores.owner_id === user.id (or admin)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import {
  CUSTOMER_IDENTITY_SELECT,
  isRealCustomerEmail,
} from '@/lib/customer-identity';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

const GENDER_LABEL: Record<string, string> = {
  female: '女性',
  male: '男性',
  other: 'その他',
  prefer_not_to_say: '未回答',
};

function escapeCsv(val: unknown): string {
  const str = val == null ? '' : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

function contentDispositionCsvFilename(storeName: string | null | undefined): string {
  const date = new Date().toISOString().split('T')[0];
  const displayName = (storeName || 'store')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80);
  const utf8Filename = `customers_${displayName}_${date}.csv`;
  const fallbackFilename = `customers_${date}.csv`;

  return `attachment; filename="${fallbackFilename}"; filename*=UTF-8''${encodeURIComponent(
    utf8Filename
  )}`;
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

  const { data: store, error: storeErr } = await admin
    .from('stores')
    .select('id, name, owner_id')
    .eq('id', params.id)
    .maybeSingle();
  if (storeErr) {
    console.error('[customers/export] fetch store error', storeErr);
    return jsonNoStore({ error: 'fetch_failed' }, { status: 500 });
  }
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

  const { data: checkIns, error: ciErr } = await admin
    .from('store_check_ins')
    .select('user_id, checked_in_at')
    .eq('store_id', params.id)
    .order('checked_in_at', { ascending: true });
  if (ciErr) {
    console.error('[customers/export] fetch check-ins error', ciErr);
    return jsonNoStore({ error: 'fetch_failed' }, { status: 500 });
  }

  const rawUserIds = Array.from(new Set((checkIns ?? []).map((row) => row.user_id)));

  const { data: initialUsersRows, error: usersErr } = await admin
    .from('users')
    .select(CUSTOMER_IDENTITY_SELECT)
    .in(
      'id',
      rawUserIds.length ? rawUserIds : ['00000000-0000-0000-0000-000000000000']
    );
  if (usersErr) {
    console.error('[customers/export] fetch users error', usersErr);
    return jsonNoStore({ error: 'fetch_failed' }, { status: 500 });
  }

  const userMap = new Map((initialUsersRows ?? []).map((u) => [u.id, u]));

  const grouped = new Map<
    string,
    { count: number; first: string; last: string; visits: string[] }
  >();
  for (const row of checkIns ?? []) {
    const customerId = row.user_id;
    const cur = grouped.get(customerId);
    if (!cur) {
      grouped.set(customerId, {
        count: 1,
        first: row.checked_in_at,
        last: row.checked_in_at,
        visits: [row.checked_in_at],
      });
    } else {
      cur.count += 1;
      cur.visits.push(row.checked_in_at);
      if (row.checked_in_at < cur.first) cur.first = row.checked_in_at;
      if (row.checked_in_at > cur.last) cur.last = row.checked_in_at;
    }
  }

  const userIds = Array.from(grouped.keys());

  const { data: memoRows, error: memoErr } = await (admin as any)
    .from('store_customer_notes')
    .select('user_id, order_notes, preference_notes, conversation_notes')
    .eq('store_id', params.id)
    .in(
      'user_id',
      userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']
    );
  if (memoErr && memoErr.code !== '42P01') {
    console.warn('[customers/export] fetch memo warning', memoErr);
  }
  const memoMap = new Map<
    string,
    {
      order_notes: string | null;
      preference_notes: string | null;
      conversation_notes: string | null;
    }
  >(
    memoErr
      ? []
      : ((memoRows ?? []) as {
          user_id: string;
          order_notes: string | null;
          preference_notes: string | null;
          conversation_notes: string | null;
        }[]).map((memo) => [memo.user_id, memo])
  );

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  type ProfileAttrs = {
    address?: string;
    age?: string;
    occupation?: string;
    gender?: string;
  };

  const headers = [
    '表示名',
    'ユーザーID',
    'メールアドレス',
    'LINE連携',
    '住所エリア',
    '年齢',
    '職業',
    '性別',
    '来店回数',
    '直近30日来店回数',
    '週あたり来店頻度',
    '初回来店日時',
    '最終来店日時',
    '注文履歴メモ',
    '好みメモ',
    '接客メモ',
  ];

  const rows = userIds.map((uid) => {
    const agg = grouped.get(uid)!;
    const u = userMap.get(uid);
    const attrs = (u?.profile_attributes ?? {}) as ProfileAttrs;
    const firstMs = new Date(agg.first).getTime();
    const periodMs = Math.max(now - firstMs, 7 * 24 * 60 * 60 * 1000);
    const perWeek =
      Math.round((agg.count / (periodMs / (7 * 24 * 60 * 60 * 1000))) * 10) / 10;
    const visit30d = agg.visits.filter(
      (t) => new Date(t).getTime() >= thirtyDaysAgo
    ).length;
    const memo = memoMap.get(uid);
    return [
      u?.line_display_name || u?.display_name || '（名前未設定）',
      uid,
      isRealCustomerEmail(u?.email) ? u?.email || '' : '',
      u?.line_user_id ? '連携済' : '未連携',
      attrs.address || '',
      attrs.age || '',
      attrs.occupation || '',
      GENDER_LABEL[attrs.gender || ''] || attrs.gender || '',
      agg.count,
      visit30d,
      perWeek,
      fmtDate(agg.first),
      fmtDate(agg.last),
      memo?.order_notes || '',
      memo?.preference_notes || '',
      memo?.conversation_notes || '',
    ];
  });

  // 最終来店日 desc
  rows.sort((a, b) => String(b[12]).localeCompare(String(a[12])));

  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ].join('\n');

  const BOM = '﻿';

  return new NextResponse(BOM + csvContent, {
    headers: {
      ...NO_STORE_HEADERS,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': contentDispositionCsvFilename(store.name),
    },
  });
}
