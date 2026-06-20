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
  /** イベント総費用（円・運営入力）。費用対効果(ROI)算出に使用 */
  cost_total: number | null;
  /** 公式LINEで告知する電子クーポン番号（例: #1111）。会員証スキャン消込の照合用 */
  redemption_code?: string | null;
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
  /** per-user 消込（会員証スキャン）の場合の対象会員 */
  user_id?: string | null;
  /** per-user 消込の表示名（API 側で付与） */
  customer_name?: string | null;
};
