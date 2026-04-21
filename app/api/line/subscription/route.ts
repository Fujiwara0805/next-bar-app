// ============================================
// GET / PATCH /api/line/subscription
// LIFF側から「空席通知を受け取る」設定を読み書きするエンドポイント。
// 認証は LIFF id_token (Authorization: Bearer <token>) で行う。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { verifyLineIdToken } from '@/lib/line/verify-id-token';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEFAULT_RADIUS_KM = 1.5;
const MIN_RADIUS_KM = 0.5;
const MAX_RADIUS_KM = 5;

type SubscriptionPayload = {
  lineUserId: string;
  optIn: boolean;
  radiusKm: number | null;
  centerLatitude: number | null;
  centerLongitude: number | null;
  areaLabel: string | null;
  latestLatitude: number | null;
  latestLongitude: number | null;
  latestLocationAt: string | null;
  updatedAt: string | null;
};

async function resolveLineUserId(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const idToken = auth.slice(7).trim();
  if (!idToken) return null;
  try {
    const payload = await verifyLineIdToken(idToken);
    return payload.sub;
  } catch (err) {
    console.warn('[line/subscription] id_token verify failed:', err);
    return null;
  }
}

function toPayload(row: Database['public']['Tables']['line_oa_subscribers']['Row']): SubscriptionPayload {
  return {
    lineUserId: row.line_user_id,
    optIn: row.vacancy_notify_opt_in,
    radiusKm: row.vacancy_notify_radius_km ?? DEFAULT_RADIUS_KM,
    centerLatitude: row.notify_center_latitude,
    centerLongitude: row.notify_center_longitude,
    areaLabel: row.notify_area_label,
    latestLatitude: row.latest_latitude,
    latestLongitude: row.latest_longitude,
    latestLocationAt: row.latest_location_at,
    updatedAt: row.notify_updated_at,
  };
}

export async function GET(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }
  const lineUserId = await resolveLineUserId(request);
  if (!lineUserId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data } = await admin
    .from('line_oa_subscribers')
    .select('*')
    .eq('line_user_id', lineUserId)
    .maybeSingle();

  if (!data) {
    // 未フォロー状態: OAを友だち追加していないケース → UI側で「まずOA友だち追加」と案内するためのフラグを返す
    return NextResponse.json({
      ok: true,
      exists: false,
      subscription: null,
      defaultRadiusKm: DEFAULT_RADIUS_KM,
      minRadiusKm: MIN_RADIUS_KM,
      maxRadiusKm: MAX_RADIUS_KM,
    });
  }
  return NextResponse.json({
    ok: true,
    exists: true,
    subscription: toPayload(data),
    defaultRadiusKm: DEFAULT_RADIUS_KM,
    minRadiusKm: MIN_RADIUS_KM,
    maxRadiusKm: MAX_RADIUS_KM,
  });
}

type PatchBody = {
  optIn?: boolean;
  radiusKm?: number | null;
  centerLatitude?: number | null;
  centerLongitude?: number | null;
  areaLabel?: string | null;
};

export async function PATCH(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }
  const lineUserId = await resolveLineUserId(request);
  if (!lineUserId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const update: Database['public']['Tables']['line_oa_subscribers']['Update'] = {
    notify_updated_at: new Date().toISOString(),
  };

  if (typeof body.optIn === 'boolean') {
    update.vacancy_notify_opt_in = body.optIn;
  }
  if (body.radiusKm !== undefined) {
    if (body.radiusKm === null) {
      update.vacancy_notify_radius_km = null;
    } else {
      const n = Number(body.radiusKm);
      if (!Number.isFinite(n) || n < MIN_RADIUS_KM || n > MAX_RADIUS_KM) {
        return NextResponse.json({ error: 'invalid_radius' }, { status: 400 });
      }
      update.vacancy_notify_radius_km = n;
    }
  }
  if (body.centerLatitude !== undefined) {
    if (body.centerLatitude === null) {
      update.notify_center_latitude = null;
    } else {
      const n = Number(body.centerLatitude);
      if (!Number.isFinite(n) || n < -90 || n > 90) {
        return NextResponse.json({ error: 'invalid_latitude' }, { status: 400 });
      }
      update.notify_center_latitude = n;
    }
  }
  if (body.centerLongitude !== undefined) {
    if (body.centerLongitude === null) {
      update.notify_center_longitude = null;
    } else {
      const n = Number(body.centerLongitude);
      if (!Number.isFinite(n) || n < -180 || n > 180) {
        return NextResponse.json({ error: 'invalid_longitude' }, { status: 400 });
      }
      update.notify_center_longitude = n;
    }
  }
  if (body.areaLabel !== undefined) {
    if (body.areaLabel === null || body.areaLabel === '') {
      update.notify_area_label = null;
    } else {
      const label = String(body.areaLabel).slice(0, 64);
      update.notify_area_label = label;
    }
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // レコードが既にあれば更新。なければupsertで新規作成（follow webhookが未着のケースに備える）。
  const { data, error } = await admin
    .from('line_oa_subscribers')
    .upsert(
      {
        line_user_id: lineUserId,
        ...update,
      },
      { onConflict: 'line_user_id' }
    )
    .select('*')
    .maybeSingle();

  if (error || !data) {
    console.error('[line/subscription] upsert failed', error);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, subscription: toPayload(data) });
}
