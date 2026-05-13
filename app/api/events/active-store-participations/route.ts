import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type ActiveEvent = {
  id: string;
  title: string;
  image_url: string | null;
  start_at: string | null;
  end_at: string | null;
};

function isEventActive(event: ActiveEvent, now = Date.now()): boolean {
  const startTime = event.start_at ? new Date(event.start_at).getTime() : null;
  const endTime = event.end_at ? new Date(event.end_at).getTime() : null;

  if (startTime !== null && (!Number.isFinite(startTime) || startTime > now)) return false;
  if (endTime !== null && (!Number.isFinite(endTime) || endTime < now)) return false;
  return true;
}

export async function GET() {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ participations: [] });
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, cache: 'no-store' as RequestCache }),
    },
  });

  const { data: events, error: eventError } = await (admin as any)
    .from('platform_events')
    .select('id, title, image_url, start_at, end_at')
    .eq('status', 'published');

  if (eventError) {
    if (eventError.code !== '42P01') {
      console.warn('[active-store-participations] fetch events warning', eventError);
    }
    return NextResponse.json({ participations: [] });
  }

  const activeEvents = ((events ?? []) as ActiveEvent[]).filter((event) => isEventActive(event));
  const eventMap = new Map(activeEvents.map((event) => [event.id, event]));
  const activeEventIds = activeEvents.map((event) => event.id);

  if (activeEventIds.length === 0) {
    return NextResponse.json({ participations: [] });
  }

  const { data: rows, error: participationError } = await (admin as any)
    .from('store_event_participations')
    .select('store_id, event_id')
    .eq('is_participating', true)
    .in('event_id', activeEventIds);

  if (participationError) {
    if (participationError.code !== '42P01') {
      console.warn('[active-store-participations] fetch participations warning', participationError);
    }
    return NextResponse.json({ participations: [] });
  }

  const participations = ((rows ?? []) as { store_id: string; event_id: string }[])
    .map((row) => {
      const event = eventMap.get(row.event_id);
      if (!event) return null;
      return {
        store_id: row.store_id,
        event_id: row.event_id,
        event,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ participations });
}
