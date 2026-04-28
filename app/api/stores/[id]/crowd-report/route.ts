// ============================================
// /api/stores/[id]/crowd-report
//
// Phase 1-A 「いま空いてる？」報告ボタン用エンドポイント。
//
// POST: 客がLIFFで送る混雑状況の自己報告を記録する。
//   - 認証: LIFF id_token (Bearer)
//   - Body: { reportType: 'vacant'|'open'|'busy'|'full', lat, lng, accuracy? }
//   - 検証: ジオフェンス200m / 同一ユーザー×店舗 10分1回
//
// GET: 直近30分の有効報告を時間減衰付きで集計し、混雑度サマリを返す。
//   - 認証不要 (誰でも閲覧可)
//   - レスポンス: { aggregate: CrowdAggregate }
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyLineIdToken } from '@/lib/line/verify-id-token';
import { haversineMeters } from '@/lib/geo/distance';
import {
  aggregateCrowdReports,
  CROWD_STATUSES,
  type CrowdStatus,
  WINDOW_MINUTES,
} from '@/lib/crowd/aggregate';
import type { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GEOFENCE_M = 200;
const RATE_LIMIT_MINUTES = 10;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type PostBody = {
  reportType: CrowdStatus;
  lat: number;
  lng: number;
  accuracy: number | null;
};

function parsePostBody(raw: unknown): PostBody | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const reportType = r.reportType;
  if (typeof reportType !== 'string') return null;
  if (!CROWD_STATUSES.includes(reportType as CrowdStatus)) return null;
  if (typeof r.lat !== 'number' || !Number.isFinite(r.lat)) return null;
  if (typeof r.lng !== 'number' || !Number.isFinite(r.lng)) return null;
  if (r.lat < -90 || r.lat > 90) return null;
  if (r.lng < -180 || r.lng > 180) return null;
  const accuracy =
    typeof r.accuracy === 'number' && Number.isFinite(r.accuracy) && r.accuracy >= 0
      ? r.accuracy
      : null;
  return {
    reportType: reportType as CrowdStatus,
    lat: r.lat,
    lng: r.lng,
    accuracy,
  };
}

async function fetchAggregateForStore(
  admin: ReturnType<typeof createClient<Database>>,
  storeId: string,
  now: Date
) {
  const cutoff = new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000);
  const { data: reports } = await admin
    .from('store_crowd_reports')
    .select('report_type, reported_at')
    .eq('store_id', storeId)
    .eq('is_valid', true)
    .gte('reported_at', cutoff.toISOString())
    .order('reported_at', { ascending: false });
  return aggregateCrowdReports(reports ?? [], now);
}

// ----------------------------------------------------------------
// GET: 集計取得 (公開)
// ----------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }
  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const aggregate = await fetchAggregateForStore(admin, params.id, new Date());
  return NextResponse.json({ aggregate });
}

// ----------------------------------------------------------------
// POST: 報告投稿 (LIFF id_token 認証)
// ----------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const idToken = authHeader.slice(7);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
  const body = parsePostBody(rawBody);
  if (!body) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  // LINE id_token 検証
  let lineUserId: string;
  try {
    const verified = await verifyLineIdToken(idToken);
    lineUserId = verified.sub;
  } catch (err) {
    console.warn(
      '[crowd-report] id_token verify failed:',
      (err as Error).message
    );
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ユーザー解決 (匿名扱いでも報告は受け付けるが、レート制限のため user_id を解決する)
  const { data: customer } = await admin
    .from('users')
    .select('id, role')
    .eq('line_user_id', lineUserId)
    .maybeSingle();
  if (!customer) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
  }
  if (customer.role && customer.role !== 'customer' && customer.role !== 'user') {
    return NextResponse.json({ error: 'customer_only' }, { status: 403 });
  }

  // 店舗ルックアップ
  const { data: store } = await admin
    .from('stores')
    .select('id, latitude, longitude')
    .eq('id', params.id)
    .maybeSingle();
  if (!store) {
    return NextResponse.json({ error: 'store_not_found' }, { status: 404 });
  }
  if (store.latitude == null || store.longitude == null) {
    return NextResponse.json({ error: 'store_no_location' }, { status: 422 });
  }

  // ジオフェンス200m
  const distanceM = haversineMeters(
    Number(store.latitude),
    Number(store.longitude),
    body.lat,
    body.lng
  );
  if (distanceM > GEOFENCE_M) {
    return NextResponse.json(
      {
        error: 'out_of_range',
        distanceM: Math.round(distanceM),
        thresholdM: GEOFENCE_M,
      },
      { status: 403 }
    );
  }

  // レート制限: 同一ユーザー×同一店舗で 10分1回まで
  const rateCutoff = new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000);
  const { data: recent } = await admin
    .from('store_crowd_reports')
    .select('id, reported_at')
    .eq('store_id', store.id)
    .eq('user_id', customer.id)
    .gte('reported_at', rateCutoff.toISOString())
    .limit(1)
    .maybeSingle();
  if (recent) {
    return NextResponse.json(
      {
        error: 'rate_limited',
        retryAfterMinutes: RATE_LIMIT_MINUTES,
        lastReportedAt: recent.reported_at,
      },
      { status: 429 }
    );
  }

  // INSERT
  const { error: insertErr } = await admin.from('store_crowd_reports').insert({
    store_id: store.id,
    user_id: customer.id,
    report_type: body.reportType,
    user_lat: body.lat,
    user_lng: body.lng,
    distance_m: Math.round(distanceM),
    is_valid: true,
    source: 'manual',
  });
  if (insertErr) {
    console.error('[crowd-report] insert error:', insertErr);
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  // 報告後の集計を返す (UI即時反映用)
  const aggregate = await fetchAggregateForStore(admin, store.id, new Date());

  return NextResponse.json({
    ok: true,
    distanceM: Math.round(distanceM),
    aggregate,
  });
}
