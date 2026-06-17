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
  stamp_enabled: boolean;
  stamp_goal: number;
  stamp_reward_text: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StoreEventParticipation = {
  id: string;
  event_id: string;
  store_id: string;
  is_participating: boolean;
  benefit_text: string | null;
  notes: string | null;
  updated_by: string | null;
  updated_at: string;
  event?: PlatformEvent;
};

export type StoreEventBenefitStats = {
  redemption_count: number;
  last_redeemed_at: string | null;
};

export type StoreEventRow = PlatformEvent & {
  participation: StoreEventParticipation | null;
  stats?: StoreEventBenefitStats;
};

export type StoreEventBenefitRedemption = {
  id: string;
  event_id: string;
  store_id: string;
  redeemed_at: string;
  created_by: string | null;
  created_at: string;
};
