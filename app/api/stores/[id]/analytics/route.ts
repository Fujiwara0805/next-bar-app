// ============================================
// GET /api/stores/[id]/analytics
// LINE OA配信とクーポンの効果測定用の集計を返す。
// - 直近30日分の送信数 / 配信成功 / 失敗 / クリック数
// - kind別の内訳
// - 直近30件のメッセージサマリ
// - クーポン: 発行数 / 消込数 / CVR
// - クーポン属性内訳 (age_range / gender / is_first_visit / origin_prefecture)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const WINDOW_DAYS = 30;

type Bucket = Record<string, number>;

function bump(bucket: Bucket, key: string | null | undefined) {
  const k = key ?? 'unknown';
  bucket[k] = (bucket[k] ?? 0) + 1;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const accessToken = authHeader.slice(7);
  const { id: storeId } = await params;

  const userClient = createClient<Database>(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser(accessToken);
  if (userErr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: store } = await admin
    .from('stores')
    .select('id, name, owner_id')
    .eq('id', storeId)
    .maybeSingle();
  if (!store) return NextResponse.json({ error: 'store_not_found' }, { status: 404 });
  if (store.owner_id !== user.id) {
    const { data: me } = await admin.from('users').select('role').eq('id', user.id).maybeSingle();
    if (me?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // ====== 配信メッセージ集計 ======
  const { data: rows } = await admin
    .from('store_messages')
    .select('id, kind, target_audience, sent_count, failed_count, click_count, status, created_at, body')
    .eq('store_id', storeId)
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  const messages = rows ?? [];
  const totals = messages.reduce(
    (acc, m) => {
      acc.count += 1;
      acc.sent += m.sent_count ?? 0;
      acc.failed += m.failed_count ?? 0;
      acc.clicks += m.click_count ?? 0;
      return acc;
    },
    { count: 0, sent: 0, failed: 0, clicks: 0 }
  );

  const byKind: Record<string, { count: number; sent: number; failed: number; clicks: number }> = {};
  for (const m of messages) {
    const k = m.kind ?? 'unknown';
    if (!byKind[k]) byKind[k] = { count: 0, sent: 0, failed: 0, clicks: 0 };
    byKind[k].count += 1;
    byKind[k].sent += m.sent_count ?? 0;
    byKind[k].failed += m.failed_count ?? 0;
    byKind[k].clicks += m.click_count ?? 0;
  }

  const clickRate = totals.sent > 0 ? totals.clicks / totals.sent : 0;

  // ====== クーポン集計 ======
  const { data: issueRows } = await admin
    .from('coupon_issues')
    .select(
      'id, coupon_id, issued_at, redeemed_at, age_range, gender, is_first_visit, origin_prefecture'
    )
    .eq('store_id', storeId)
    .gte('issued_at', since);

  const issues = issueRows ?? [];
  const couponTotals = issues.reduce(
    (acc, r) => {
      acc.issued += 1;
      if (r.redeemed_at) acc.redeemed += 1;
      return acc;
    },
    { issued: 0, redeemed: 0 }
  );
  const couponCVR = couponTotals.issued > 0 ? couponTotals.redeemed / couponTotals.issued : 0;

  // 属性内訳（redeemed されたもの only）
  const ageBucket: Bucket = {};
  const genderBucket: Bucket = {};
  const originBucket: Bucket = {};
  let firstVisitRedeemed = 0;
  let repeatRedeemed = 0;
  let attributeUnknown = 0;

  for (const r of issues) {
    if (!r.redeemed_at) continue;
    bump(ageBucket, r.age_range);
    bump(genderBucket, r.gender);
    bump(originBucket, r.origin_prefecture);
    if (r.is_first_visit === true) firstVisitRedeemed += 1;
    else if (r.is_first_visit === false) repeatRedeemed += 1;
    else attributeUnknown += 1;
  }

  // クーポン別集計
  const byCouponMap: Record<string, { issued: number; redeemed: number }> = {};
  for (const r of issues) {
    const key = r.coupon_id;
    if (!byCouponMap[key]) byCouponMap[key] = { issued: 0, redeemed: 0 };
    byCouponMap[key].issued += 1;
    if (r.redeemed_at) byCouponMap[key].redeemed += 1;
  }

  const couponIds = Object.keys(byCouponMap);
  let couponTitles: Record<string, string> = {};
  if (couponIds.length > 0) {
    const { data: couponRows } = await admin
      .from('store_coupons')
      .select('id, title')
      .in('id', couponIds);
    couponTitles = (couponRows ?? []).reduce<Record<string, string>>((acc, c) => {
      acc[c.id] = c.title;
      return acc;
    }, {});
  }
  const byCoupon = couponIds
    .map((id) => ({
      id,
      title: couponTitles[id] ?? '(削除済み)',
      issued: byCouponMap[id].issued,
      redeemed: byCouponMap[id].redeemed,
      cvr: byCouponMap[id].issued > 0 ? byCouponMap[id].redeemed / byCouponMap[id].issued : 0,
    }))
    .sort((a, b) => b.issued - a.issued);

  return NextResponse.json({
    ok: true,
    windowDays: WINDOW_DAYS,
    totals: { ...totals, clickRate },
    byKind,
    recent: messages.slice(0, 30),
    coupons: {
      totals: { ...couponTotals, cvr: couponCVR },
      byCoupon,
      breakdown: {
        age: ageBucket,
        gender: genderBucket,
        origin: originBucket,
        firstVisit: firstVisitRedeemed,
        repeat: repeatRedeemed,
        unknown: attributeUnknown,
      },
    },
  });
}
