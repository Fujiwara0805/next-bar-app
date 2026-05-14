import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import type { StoreEventRow } from '@/lib/types/platform-event';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ events: [] });
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, cache: 'no-store' as RequestCache }),
    },
  });

  const { data, error } = await (admin as any)
    .from('store_event_participations')
    .select('*, event:platform_events(*)')
    .eq('store_id', params.id)
    .eq('is_participating', true)
    .eq('event.status', 'published')
    .order('updated_at', { ascending: false });

  if (error) {
    if (error.code !== '42P01') {
      console.warn('[public-store-events] fetch warning', error);
    }
    return NextResponse.json({ events: [] });
  }

  const events: StoreEventRow[] = ((data ?? []) as any[])
    .filter((row) => row.event)
    .map((row) => ({
      ...row.event,
      participation: {
        id: row.id,
        event_id: row.event_id,
        store_id: row.store_id,
        is_participating: row.is_participating,
        benefit_text: row.benefit_text ?? null,
        notes: row.notes,
        updated_by: row.updated_by,
        updated_at: row.updated_at,
      },
    }));

  return NextResponse.json({ events });
}
