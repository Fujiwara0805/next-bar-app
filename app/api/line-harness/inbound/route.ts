// ============================================
// POST /api/line-harness/inbound
//
// LINE Harness が Webhook OUT で送ってくるイベントを受け取り、NIKENME+ 側に反映する。
//   - 認証: Authorization: Bearer ${LINE_HARNESS_INBOUND_SECRET}
//   - 反映先:
//       step.sent / step.failed → store_messages に kind='step' で1件INSERT
//       tag.changed             → users.tags (将来) or line_oa_subscribers.tags に反映
//       inbox.message           → 当面はログ出力のみ
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type StepEvent = {
  type: 'step.sent' | 'step.failed';
  storeId?: string | null;
  lineUserId?: string;
  scenarioId?: string;
  stepId?: string;
  body?: string;
  errorMessage?: string | null;
  sentAt?: string;
};

type TagEvent = {
  type: 'tag.changed';
  lineUserId: string;
  added?: string[];
  removed?: string[];
};

type InboxEvent = {
  type: 'inbox.message';
  lineUserId: string;
  preview?: string;
  receivedAt?: string;
};

type InboundEvent = StepEvent | TagEvent | InboxEvent | { type: string };

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.LINE_HARNESS_INBOUND_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  return auth.slice(7).trim() === secret;
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let payload: { events?: InboundEvent[] } | InboundEvent;
  try {
    payload = (await request.json()) as { events?: InboundEvent[] } | InboundEvent;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const events: InboundEvent[] = Array.isArray((payload as { events?: InboundEvent[] }).events)
    ? (payload as { events: InboundEvent[] }).events
    : [payload as InboundEvent];

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: Array<{ type: string; ok: boolean; reason?: string }> = [];

  for (const ev of events) {
    try {
      if (ev.type === 'step.sent' || ev.type === 'step.failed') {
        const step = ev as StepEvent;
        const storeId = step.storeId ?? null;
        // store_messages は store_id NOT NULL のため、紐づかないステップ配信は記録できない。
        // 将来 schema 拡張するまではログのみで終わる。
        if (!storeId) {
          results.push({ type: ev.type, ok: true, reason: 'no_store_id_skipped' });
          continue;
        }
        const status = step.type === 'step.sent' ? 'sent' : 'failed';
        const { error } = await admin.from('store_messages').insert({
          store_id: storeId,
          kind: 'step',
          body: step.body ?? '',
          target_audience: 'line_harness',
          sent_count: status === 'sent' ? 1 : 0,
          failed_count: status === 'failed' ? 1 : 0,
          status,
          error_message: step.errorMessage ?? null,
        });
        results.push({ type: ev.type, ok: !error, reason: error?.message });
      } else if (ev.type === 'tag.changed') {
        const tag = ev as TagEvent;
        // 当面は subscribers レベルのフラグだけ反映 (新ロール導入は後フェーズ)
        const tagsAdded = new Set(tag.added ?? []);
        const updates: Record<string, unknown> = {};
        if (tagsAdded.has('vacancy_optin')) updates.vacancy_notify_opt_in = true;
        const tagsRemoved = new Set(tag.removed ?? []);
        if (tagsRemoved.has('vacancy_optin')) updates.vacancy_notify_opt_in = false;
        if (Object.keys(updates).length === 0) {
          results.push({ type: ev.type, ok: true, reason: 'no_actionable_tag' });
          continue;
        }
        const { error } = await admin
          .from('line_oa_subscribers')
          .update(updates)
          .eq('line_user_id', tag.lineUserId);
        results.push({ type: ev.type, ok: !error, reason: error?.message });
      } else if (ev.type === 'inbox.message') {
        // 1:1 メッセージは LINE Harness 側 Inbox で運用するため、当面はログのみ
        console.info('[line-harness inbound] inbox message received');
        results.push({ type: ev.type, ok: true });
      } else {
        results.push({ type: ev.type, ok: true, reason: 'unhandled_type' });
      }
    } catch (err) {
      results.push({
        type: ev.type,
        ok: false,
        reason: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
