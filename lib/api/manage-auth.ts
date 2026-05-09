import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export type ManageAuthContext = {
  admin: SupabaseClient<Database>;
  operatorId: string;
  operatorRole: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function envMissingResponse() {
  return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
}

export function hasSupabaseServerEnv() {
  return Boolean(supabaseUrl && serviceRoleKey && anonKey);
}

export async function resolveManageAuth(
  request: NextRequest
): Promise<{ ok: true; ctx: ManageAuthContext } | { ok: false; response: NextResponse }> {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return { ok: false, response: envMissingResponse() };
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    };
  }
  const accessToken = authHeader.slice(7);

  const anon = createClient<Database>(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error,
  } = await anon.auth.getUser(accessToken);
  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    };
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: operatorRow } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  return {
    ok: true,
    ctx: {
      admin,
      operatorId: user.id,
      operatorRole: operatorRow?.role ?? null,
    },
  };
}

export async function assertPlatformAdmin(ctx: ManageAuthContext) {
  if (ctx.operatorRole !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return null;
}

export async function assertStoreAccess(
  ctx: ManageAuthContext,
  storeId: string
): Promise<NextResponse | null> {
  const { data: store, error } = await ctx.admin
    .from('stores')
    .select('id, owner_id')
    .eq('id', storeId)
    .maybeSingle();
  if (error) {
    console.error('[manage-auth] fetch store error', error);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
  if (!store) {
    return NextResponse.json({ error: 'store_not_found' }, { status: 404 });
  }

  const isOwner = store.owner_id === ctx.operatorId;
  const isStoreSelf = store.id === ctx.operatorId;
  const isAdmin = ctx.operatorRole === 'admin';
  if (!isOwner && !isStoreSelf && !isAdmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return null;
}
