import type { Database } from '@/lib/supabase/types';

export type ActiveStoreEvent = {
  id: string;
  title: string;
  image_url: string | null;
  start_at: string | null;
  end_at: string | null;
};

export type EventAwareStore = Database['public']['Tables']['stores']['Row'] & {
  active_event?: ActiveStoreEvent | null;
  active_event_ids?: string[];
};

export type ActiveStoreParticipation = {
  store_id: string;
  event_id: string;
  event: ActiveStoreEvent;
};

export async function fetchActiveStoreParticipations(): Promise<ActiveStoreParticipation[]> {
  const res = await fetch('/api/events/active-store-participations', { cache: 'no-store' });
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({}));
  return Array.isArray(json.participations) ? json.participations : [];
}

export function attachActiveEvents<T extends { id: string }>(
  stores: T[],
  participations: ActiveStoreParticipation[]
): Array<T & { active_event?: ActiveStoreEvent | null; active_event_ids?: string[] }> {
  const eventMap = new Map<string, ActiveStoreEvent[]>();
  participations.forEach((participation) => {
    const current = eventMap.get(participation.store_id) ?? [];
    current.push(participation.event);
    eventMap.set(participation.store_id, current);
  });

  return stores.map((store) => {
    const events = eventMap.get(store.id) ?? [];
    return {
      ...store,
      active_event: events[0] ?? null,
      active_event_ids: events.map((event) => event.id),
    };
  });
}
