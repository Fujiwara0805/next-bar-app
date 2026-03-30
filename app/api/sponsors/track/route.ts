import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { EventType } from '@/lib/sponsors/types';

const VALID_EVENT_TYPES: EventType[] = [
  'impression', 'click', 'cta_click', 'close', 'conversion',
];

// Simple in-memory rate limiting (resets on cold start)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 100) return false;
  entry.count++;
  return true;
}

function detectDeviceTypeFromUA(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) return 'mobile';
  return 'desktop';
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { events, session_id, timestamp } = body;

    if (!Array.isArray(events) || events.length === 0 || events.length > 50) {
      return NextResponse.json(
        { error: 'events must be an array of 1-50 items' },
        { status: 400 }
      );
    }

    if (!session_id || typeof session_id !== 'string') {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get('user-agent') || '';
    const referrer = request.headers.get('referer') || '';
    const deviceType = detectDeviceTypeFromUA(userAgent);

    const rows = [];
    for (const event of events) {
      if (!event.event_type || !VALID_EVENT_TYPES.includes(event.event_type)) {
        continue; // Skip invalid events
      }

      rows.push({
        ad_slot_id: event.ad_slot_id || null,
        creative_id: event.creative_id || null,
        contract_id: event.contract_id || null,
        sponsor_id: event.sponsor_id || null,
        event_type: event.event_type,
        session_id,
        user_agent: userAgent,
        referrer,
        device_type: deviceType,
        metadata: event.metadata || {},
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No valid events' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from('sponsor_impressions')
      .insert(rows);

    if (error) {
      console.error('[sponsors/track] Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to record events' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, count: rows.length });
  } catch (err) {
    console.error('[sponsors/track] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
