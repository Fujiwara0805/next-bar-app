// ============================================
// GET /api/line/track?mid=<store_messages.id>&u=<relative_url>
//
// LINEメッセージ内リンクのクリック追跡。
// store_messages.click_count を +1 してから `u` に指定された同一オリジン相対パスへリダイレクトする。
// 不正/欠落パラメータでも必ず安全にリダイレクトする（ユーザー体験を壊さないため）。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function safeRedirectTarget(raw: string | null, origin: string): string {
  if (!raw) return `${origin}/`;
  if (!raw.startsWith('/') || raw.startsWith('//')) return `${origin}/`;
  return `${origin}${raw}`;
}

export async function GET(request: NextRequest) {
  const mid = request.nextUrl.searchParams.get('mid');
  const u = request.nextUrl.searchParams.get('u');
  const origin = request.nextUrl.origin;
  const target = safeRedirectTarget(u, origin);

  if (mid && UUID_RE.test(mid) && supabaseUrl && serviceRoleKey) {
    try {
      const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: current } = await admin
        .from('store_messages')
        .select('click_count')
        .eq('id', mid)
        .maybeSingle();
      if (current) {
        await admin
          .from('store_messages')
          .update({ click_count: (current.click_count ?? 0) + 1 })
          .eq('id', mid);
      }
    } catch (err) {
      console.warn('[line/track] click increment failed', err);
    }
  }

  return NextResponse.redirect(target, 302);
}
