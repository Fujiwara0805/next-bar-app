import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
    }

    const { storeId, endpoint, p256dh, auth } = await request.json();
    if (!storeId || !endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Bearer 認証: 店舗アカウント本体 (auth.id === stores.id) または 運営オーナー (stores.owner_id) のみ許可
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const accessToken = authHeader.slice(7);

    const anon = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const {
      data: { user: operator },
    } = await anon.auth.getUser(accessToken);
    if (!operator) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: store } = await admin
      .from('stores')
      .select('id, owner_id')
      .eq('id', storeId)
      .maybeSingle();
    if (!store) {
      return NextResponse.json({ error: 'store_not_found' }, { status: 404 });
    }
    if (store.id !== operator.id && store.owner_id !== operator.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // Service Role で upsert (RLS バイパス。認可は上で済ませている)
    const { error } = await admin
      .from('push_subscriptions')
      .upsert(
        { store_id: storeId, endpoint, p256dh, auth },
        { onConflict: 'store_id,endpoint' }
      );

    if (error) {
      console.error('Push subscribe error:', error);
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push subscribe error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
