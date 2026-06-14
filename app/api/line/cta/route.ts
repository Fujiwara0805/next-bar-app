// ============================================
// GET /api/line/cta?source=<surface>&ref=<id>
//
// 転換装置（PV→LINE友だち化フック）のクリック計測 + 友だち追加URLへのリダイレクト。
// クリックを line_cta_clicks に記録してから、LINE公式アカウントの友だち追加URLへ 302。
// source別クリック数 × 友だち週次純増 で「PV→友だち転換率」を読む（metagame §9）。
//
// 友だち追加URL (NEXT_PUBLIC_LINE_ADD_FRIEND_URL) 未設定/不正でも、必ず安全に
// 自サイトトップへ戻す（CTAは本来 env 未設定時に非表示だが、防御的にフォールバック）。
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADD_FRIEND_URL = process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL;

// 計測ノイズ防止のため source はホワイトリスト化。未知値は 'unknown' に丸める。
const ALLOWED_SOURCES = new Set(['map', 'store_detail', 'store_page', 'event']);

// オープンリダイレクト防止: LINEドメインのみ許可。
const ADD_FRIEND_RE = /^https:\/\/(lin\.ee|line\.me|liff\.line\.me)\//;

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const rawSource = request.nextUrl.searchParams.get('source') ?? '';
  const source = ALLOWED_SOURCES.has(rawSource) ? rawSource : 'unknown';
  const rawRef = request.nextUrl.searchParams.get('ref');
  const ref = rawRef ? rawRef.slice(0, 64) : null;

  // クリックを計測（失敗してもリダイレクトは止めない）。
  if (supabaseUrl && serviceRoleKey) {
    try {
      const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      await admin.from('line_cta_clicks').insert({ source, ref });
    } catch (err) {
      console.warn('[line/cta] click log failed', err);
    }
  }

  const target =
    ADD_FRIEND_URL && ADD_FRIEND_RE.test(ADD_FRIEND_URL) ? ADD_FRIEND_URL : `${origin}/`;

  return NextResponse.redirect(target, 302);
}
