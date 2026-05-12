// ============================================
// POST /api/platform/stores
// 運営アカウント (platform) が新規店舗を作成する。
// クライアント側で supabase.auth.signUp を呼ぶと、新規ユーザーの
// セッションが一瞬発生して onAuthStateChange のレースで管理者の
// 認証状態 / Cookie が汚染されるため、必ずサーバーサイドで実施する。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

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
};

function jsonNoStore(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...NO_STORE_HEADERS, ...(init?.headers ?? {}) },
  });
}

type CreateStorePayload = {
  email: string;
  password: string;
  name: string;
  description?: string | null;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string | null;
  website_url?: string | null;
  business_hours?: string | null;
  regular_holiday?: string | null;
  structured_business_hours?: unknown;
  budget_min?: number | null;
  budget_max?: number | null;
  payment_methods?: string[];
  facilities?: string[];
  store_category?: string;
  is_open?: boolean;
  vacancy_status?: string;
  image_urls?: string[];
  google_place_id?: string | null;
  google_rating?: number | null;
  google_reviews_count?: number | null;
};

export async function POST(request: NextRequest) {
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

  // 認可: operator が admin ロールであること
  const { data: operatorRow } = await admin
    .from('users')
    .select('role')
    .eq('id', operator.id)
    .maybeSingle();
  if (operatorRow?.role !== 'admin') {
    return jsonNoStore({ error: 'forbidden' }, { status: 403 });
  }

  let payload: CreateStorePayload;
  try {
    payload = (await request.json()) as CreateStorePayload;
  } catch {
    return jsonNoStore({ error: 'invalid_json' }, { status: 400 });
  }

  const email = payload.email?.trim();
  const password = payload.password;
  const name = payload.name?.trim();
  const address = payload.address?.trim();

  if (!email || !password || password.length < 6 || !name || !address) {
    return jsonNoStore({ error: 'invalid_payload' }, { status: 400 });
  }
  if (
    typeof payload.latitude !== 'number' ||
    typeof payload.longitude !== 'number' ||
    Number.isNaN(payload.latitude) ||
    Number.isNaN(payload.longitude)
  ) {
    return jsonNoStore({ error: 'invalid_coordinates' }, { status: 400 });
  }

  // 1) 認証ユーザーを admin API で作成 (email confirm 済み)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      store_name: name,
      account_type: 'store',
    },
  });

  if (createErr || !created.user) {
    const message = createErr?.message ?? 'auth_create_failed';
    const isDuplicate =
      message.toLowerCase().includes('already') ||
      message.toLowerCase().includes('registered') ||
      message.toLowerCase().includes('exists');
    return jsonNoStore(
      { error: isDuplicate ? 'email_already_registered' : 'auth_create_failed', message },
      { status: isDuplicate ? 409 : 500 }
    );
  }

  const newStoreUserId = created.user.id;

  // 2) stores テーブルへ挿入
  const insertRow = {
    id: newStoreUserId,
    owner_id: operator.id,
    email,
    name,
    description: payload.description ?? null,
    address,
    latitude: payload.latitude,
    longitude: payload.longitude,
    phone: payload.phone ?? null,
    website_url: payload.website_url ?? null,
    business_hours: payload.business_hours ?? '',
    regular_holiday: payload.regular_holiday ?? null,
    structured_business_hours: payload.structured_business_hours ?? null,
    budget_min: payload.budget_min ?? null,
    budget_max: payload.budget_max ?? null,
    payment_methods: payload.payment_methods ?? [],
    facilities: payload.facilities ?? [],
    store_category: payload.store_category ?? 'bar',
    is_open: payload.is_open ?? false,
    vacancy_status: payload.vacancy_status ?? 'closed',
    male_ratio: 0,
    female_ratio: 0,
    image_urls: payload.image_urls ?? [],
    google_place_id: payload.google_place_id ?? null,
    google_rating: payload.google_rating ?? null,
    google_reviews_count: payload.google_reviews_count ?? null,
  };

  const { error: storeErr } = await admin
    .from('stores')
    .insert(insertRow as never);

  if (storeErr) {
    // auth ユーザーは作成されたが stores 挿入に失敗 → auth ユーザーを巻き戻し
    await admin.auth.admin.deleteUser(newStoreUserId).catch((err) => {
      console.error('[platform/stores] rollback delete user failed', err);
    });
    console.error('[platform/stores] insert store failed', storeErr);
    return jsonNoStore(
      { error: 'store_insert_failed', message: storeErr.message },
      { status: 500 }
    );
  }

  return jsonNoStore({ id: newStoreUserId }, { status: 201 });
}
