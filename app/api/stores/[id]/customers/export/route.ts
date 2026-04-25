// ============================================
// GET /api/stores/[id]/customers/export
// 顧客データをCSV (BOM付UTF-8) でエクスポート。
// 認可: stores.owner_id === user.id (or admin)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

export async function GET(
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

  const isOwner = store.owner_id === operator.id;
  if (!isOwner) {
    const { data: operatorRow } = await admin
      .from('users')
      .select('role')
      .eq('id', operator.id)
      .maybeSingle();
    if (operatorRow?.role !== 'admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  const { data: checkIns } = await admin
    .from('store_check_ins')
    .select('user_id, checked_in_at')
    .eq('store_id', params.id)
    .order('checked_in_at', { ascending: true });

  const grouped = new Map<
    string,
    { count: number; first: string; last: string; visits: string[] }
  >();
  for (const row of checkIns ?? []) {
    const cur = grouped.get(row.user_id);
    if (!cur) {
      grouped.set(row.user_id, {
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

  const { data: usersRows } = await admin
    .from('users')
    .select('id, display_name, line_display_name, line_user_id, email, profile_attributes')
    .in('id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']);
  const userMap = new Map((usersRows ?? []).map((u) => [u.id, u]));

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
    const isLineEmail = (u?.email || '').endsWith('@line.nikenme.local');
    return [
      u?.line_display_name || u?.display_name || '（名前未設定）',
      uid,
      isLineEmail ? '' : u?.email || '',
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
    ];
  });

  // 最終来店日 desc
  rows.sort((a, b) => String(b[12]).localeCompare(String(a[12])));

  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ].join('\n');

  const BOM = '﻿';
  const date = new Date().toISOString().split('T')[0];
  const safeStoreName = (store.name || 'store').replace(/[^A-Za-z0-9一-龯ぁ-んァ-ヶー]/g, '_');

  return new NextResponse(BOM + csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="customers_${safeStoreName}_${date}.csv"`,
    },
  });
}
