export type PlatformEventStatus = 'draft' | 'published' | 'archived';

export type PlatformEvent = {
  id: string;
  title: string;
  organizer_name: string | null;
  description: string | null;
  area_label: string | null;
  start_at: string | null;
  end_at: string | null;
  image_url: string | null;
  external_url: string | null;
  status: PlatformEventStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StoreEventParticipation = {
  id: string;
  event_id: string;
  store_id: string;
  is_participating: boolean;
  notes: string | null;
  updated_by: string | null;
  updated_at: string;
  event?: PlatformEvent;
};

export type StoreEventRow = PlatformEvent & {
  participation: StoreEventParticipation | null;
};
