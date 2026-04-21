// ============================================
// POST /api/line/webhook
// LINE Messaging API Webhook 受信エンドポイント
// ============================================
//
// 処理するイベント:
//  - follow   : OA友だち登録 → line_oa_subscribers 追加／復活
//  - unfollow : ブロック/解除 → unfollowed_at 更新
//  - message (location) : 位置情報送信 → latest_latitude/longitude 更新
//
// 署名検証 `X-Line-Signature` は必須。raw bodyで照合するためJSON.parseは検証後に行う。

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { verifyWebhookSignature, isMessagingConfigured } from '@/lib/line/messaging';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type LineEventBase = {
  type: string;
  source?: { userId?: string; type?: string };
  timestamp?: number;
};
type LineFollowEvent = LineEventBase & { type: 'follow' };
type LineUnfollowEvent = LineEventBase & { type: 'unfollow' };
type LineMessageEvent = LineEventBase & {
  type: 'message';
  message?:
    | { type: 'location'; latitude: number; longitude: number }
    | { type: 'text'; text: string }
    | { type: string };
};

type LineEvent = LineFollowEvent | LineUnfollowEvent | LineMessageEvent;

type LineWebhookBody = {
  destination?: string;
  events?: LineEvent[];
};

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }
  if (!isMessagingConfigured()) {
    // Messaging APIが未設定なら受け取るだけで黙って 200 を返す（LINE側リトライ防止）
    return NextResponse.json({ ok: true, skipped: 'not_configured' });
  }

  const signature = request.headers.get('x-line-signature');
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let body: LineWebhookBody;
  try {
    body = JSON.parse(raw) as LineWebhookBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const events = body.events ?? [];
  if (events.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: Array<{ type: string; ok: boolean; reason?: string }> = [];

  for (const ev of events) {
    const lineUserId = ev.source?.userId;
    if (!lineUserId) {
      results.push({ type: ev.type, ok: false, reason: 'missing_user_id' });
      continue;
    }

    try {
      if (ev.type === 'follow') {
        const { error } = await admin
          .from('line_oa_subscribers')
          .upsert(
            {
              line_user_id: lineUserId,
              followed_at: new Date().toISOString(),
              unfollowed_at: null,
            },
            { onConflict: 'line_user_id' }
          );
        results.push({ type: 'follow', ok: !error, reason: error?.message });
      } else if (ev.type === 'unfollow') {
        const { error } = await admin
          .from('line_oa_subscribers')
          .update({ unfollowed_at: new Date().toISOString() })
          .eq('line_user_id', lineUserId);
        results.push({ type: 'unfollow', ok: !error, reason: error?.message });
      } else if (ev.type === 'message') {
        const msg = ev.message;
        if (msg && msg.type === 'location' && 'latitude' in msg && 'longitude' in msg) {
          const { error } = await admin
            .from('line_oa_subscribers')
            .upsert(
              {
                line_user_id: lineUserId,
                latest_latitude: msg.latitude,
                latest_longitude: msg.longitude,
                latest_location_at: new Date().toISOString(),
              },
              { onConflict: 'line_user_id' }
            );
          results.push({ type: 'message.location', ok: !error, reason: error?.message });
        } else {
          results.push({ type: `message.${msg?.type ?? 'unknown'}`, ok: true, reason: 'ignored' });
        }
      } else {
        results.push({ type: (ev as LineEventBase).type, ok: true, reason: 'ignored' });
      }
    } catch (err) {
      results.push({
        type: (ev as LineEventBase).type,
        ok: false,
        reason: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
