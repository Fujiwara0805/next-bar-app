// ============================================
// POST /api/store-checkin
// 店舗QR (店内設置のポスター) を客がLIFFで読み取った後の
// セルフチェックイン受付エンドポイント (Phase 2-B 双方向QR)。
//
// 認証: LIFF id_token (Bearer)。
// 検証: 店舗座標との Haversine 距離がジオフェンス内か (50m基準、
//       GPS精度に応じた動的閾値)。
// 結果: 既存 /api/stores/[id]/check-in-scan と同形式のレスポンスを返し、
//       UI を共通化する。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyLineIdToken } from '@/lib/line/verify-id-token';
import { haversineMeters, effectiveGeofenceThreshold } from '@/lib/geo/distance';
import {
  snapshotPreInsertWindow,
  aggregatePostInsert,
} from '@/lib/check-in/aggregate';
import type { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BASE_GEOFENCE_M = 50;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type RequestBody = {
  storeId?: unknown;
  lat?: unknown;
  lng?: unknown;
  accuracy?: unknown;
};

function parseBody(raw: unknown): {
  storeId: string;
  lat: number;
  lng: number;
  accuracy: number | null;
} | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as RequestBody;
  if (typeof r.storeId !== 'string' || r.storeId.length === 0) return null;
  if (typeof r.lat !== 'number' || !Number.isFinite(r.lat)) return null;
  if (typeof r.lng !== 'number' || !Number.isFinite(r.lng)) return null;
  if (r.lat < -90 || r.lat > 90) return null;
  if (r.lng < -180 || r.lng > 180) return null;
  const accuracy =
    typeof r.accuracy === 'number' && Number.isFinite(r.accuracy) && r.accuracy >= 0
      ? r.accuracy
      : null;
  return { storeId: r.storeId, lat: r.lat, lng: r.lng, accuracy };
}

export async function POST(request: NextRequest) {
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
  const body = parseBody(rawBody);
  if (!body) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  // LINE id_token 検証
  let lineUserId: string;
  try {
    const verified = await verifyLineIdToken(idToken);
    lineUserId = verified.sub;
  } catch (err) {
    console.warn('[store-checkin] id_token verify failed:', (err as Error).message);
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // LINE userId → users テーブルルックアップ
  const { data: customer } = await admin
    .from('users')
    .select('id, role, display_name, line_display_name, profile_attributes')
    .eq('line_user_id', lineUserId)
    .maybeSingle();
  if (!customer) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
  }
  if (customer.role && customer.role !== 'customer' && customer.role !== 'user') {
    return NextResponse.json({ error: 'customer_only' }, { status: 403 });
  }

  // プロフィール必須項目チェック (既存の /mypage/qr と同条件)
  const attrs = (customer.profile_attributes ?? {}) as {
    address?: string;
    age?: string;
    occupation?: string;
    gender?: string;
  };
  const profileComplete = Boolean(
    attrs.address?.trim() &&
      attrs.age?.trim() &&
      attrs.occupation?.trim() &&
      attrs.gender?.trim()
  );
  if (!profileComplete) {
    return NextResponse.json({ error: 'profile_incomplete' }, { status: 403 });
  }

  // 店舗ルックアップ
  const { data: store } = await admin
    .from('stores')
    .select('id, name, latitude, longitude')
    .eq('id', body.storeId)
    .maybeSingle();
  if (!store) {
    return NextResponse.json({ error: 'store_not_found' }, { status: 404 });
  }
  if (store.latitude == null || store.longitude == null) {
    return NextResponse.json({ error: 'store_no_location' }, { status: 422 });
  }

  // ジオフェンス検証
  const distanceM = haversineMeters(
    Number(store.latitude),
    Number(store.longitude),
    body.lat,
    body.lng
  );
  const threshold = effectiveGeofenceThreshold(BASE_GEOFENCE_M, body.accuracy);
  if (distanceM > threshold) {
    return NextResponse.json(
      {
        error: 'out_of_range',
        distanceM: Math.round(distanceM),
        thresholdM: Math.round(threshold),
      },
      { status: 403 }
    );
  }

  // INSERT 前のスタンプ状態をスナップショット
  const now = new Date();
  const pre = await snapshotPreInsertWindow(admin, customer.id, store.id, now);

  // INSERT (重複は 23505 で許容: 既存窓内に同店スタンプ済み)
  const { error: insertErr } = await admin.from('store_check_ins').insert({
    user_id: customer.id,
    store_id: store.id,
    source: 'store_qr',
    check_in_lat: body.lat,
    check_in_lng: body.lng,
    check_in_distance_m: Math.round(distanceM),
    check_in_accuracy_m:
      body.accuracy != null ? Math.round(body.accuracy) : null,
  });

  const isDuplicateRow = insertErr?.code === '23505';
  if (insertErr && !isDuplicateRow) {
    console.error('[store-checkin] insert error:', insertErr);
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  // 集計
  const aggregate = await aggregatePostInsert(
    admin,
    customer.id,
    pre.cutoffIso,
    pre.wasAlreadyStamped,
    now
  );

  const userDisplayName =
    customer.line_display_name || customer.display_name || 'ゲスト';

  return NextResponse.json({
    storeId: store.id,
    storeName: store.name,
    userId: customer.id,
    userDisplayName,
    source: 'store_qr',
    distanceM: Math.round(distanceM),
    thresholdM: Math.round(threshold),
    ...aggregate,
  });
}
