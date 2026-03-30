import type { Database } from '@/lib/supabase/types';

// ============================================
// テーブル行型エイリアス
// ============================================
export type Sponsor = Database['public']['Tables']['sponsors']['Row'];
export type SponsorContract = Database['public']['Tables']['sponsor_contracts']['Row'];
export type SponsorAdSlot = Database['public']['Tables']['sponsor_ad_slots']['Row'];
export type SponsorAdCreative = Database['public']['Tables']['sponsor_ad_creatives']['Row'];
export type SponsorImpression = Database['public']['Tables']['sponsor_impressions']['Row'];
export type SponsorReport = Database['public']['Tables']['sponsor_reports']['Row'];

// ============================================
// 広告枠タイプ
// ============================================
export type SlotType = 'modal' | 'cta_button' | 'map_icon' | 'campaign_banner';

// ============================================
// 契約プランタイプ
// ============================================
export type PlanType = '1day' | '7day' | '30day' | 'custom';

// ============================================
// 契約ステータス
// ============================================
export type ContractStatus = 'scheduled' | 'active' | 'expired' | 'cancelled';

// ============================================
// イベントタイプ
// ============================================
export type EventType = 'impression' | 'click' | 'cta_click' | 'close' | 'conversion';

// ============================================
// 配信スケジュール設定
// ============================================
export interface ScheduleConfig {
  weekdays?: number[]; // 0=日, 1=月, ..., 6=土
  start_hour?: number; // 開始時間（0-23）
  end_hour?: number;   // 終了時間（0-23）
}

// ============================================
// 表示設定
// ============================================
export interface DisplayConfig {
  show_close_button: boolean;
  auto_close_seconds: number | null;
  animation: 'slideUp' | 'fadeIn' | 'scaleUp';
  frequency_cap_per_session: number;
}

// ============================================
// アイコン位置設定
// ============================================
export interface IconPosition {
  top: string;
  left: string;
}

// ============================================
// 多言語翻訳
// ============================================
export interface CreativeTranslations {
  en?: { cta_text?: string };
  ko?: { cta_text?: string };
  zh?: { cta_text?: string };
}

// ============================================
// フロント配信用: アクティブ広告レスポンス
// ============================================
export interface ActiveAdsResponse {
  modal: ActiveAdCreative | null;
  cta_button: ActiveAdCreative | null;
  map_icons: ActiveAdCreative[];
  campaign_banner: ActiveAdCreative | null;
}

export interface ActiveAdCreative {
  creative_id: string;
  ad_slot_id: string;
  contract_id: string;
  sponsor_id: string;
  slot_type: SlotType;
  image_url: string | null;
  background_image_url: string | null;
  cta_text: string | null;
  cta_url: string | null;
  cta_color: string;
  icon_url: string | null;
  icon_position: IconPosition;
  icon_size: number;
  display_config: DisplayConfig;
  translations: CreativeTranslations;
  schedule_config: ScheduleConfig | null;
  company_name: string;
  company_logo_url: string | null;
}

// ============================================
// トラッキングイベント
// ============================================
export interface TrackEvent {
  event_type: EventType;
  creative_id: string;
  ad_slot_id: string;
  contract_id: string;
  sponsor_id: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// レポートサマリー
// ============================================
export interface ReportSummary {
  total_impressions: number;
  total_clicks: number;
  total_cta_clicks: number;
  avg_ctr: number;
  unique_users: number;
}

export interface DailyReport {
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
  unique_users: number;
}

export interface ReportResponse {
  summary: ReportSummary;
  daily: DailyReport[];
  hourly_heatmap: Record<string, Record<string, number>>;
  device_breakdown: { mobile: number; tablet: number; desktop: number };
  slot_performance: {
    slot_type: SlotType;
    impressions: number;
    clicks: number;
    ctr: number;
  }[];
}

// ============================================
// プラン名ラベル
// ============================================
export const PLAN_LABELS: Record<PlanType, string> = {
  '1day': '1日スポンサー',
  '7day': '1週間スポンサー',
  '30day': '30日スポンサー',
  custom: 'カスタム期間',
};

// ============================================
// ステータスラベル
// ============================================
export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  scheduled: '予定',
  active: '有効',
  expired: '期限切れ',
  cancelled: 'キャンセル',
};

// ============================================
// 枠タイプラベル
// ============================================
export const SLOT_TYPE_LABELS: Record<SlotType, string> = {
  modal: 'モーダル広告',
  cta_button: 'CTAボタン',
  map_icon: 'マップアイコン',
  campaign_banner: 'キャンペーンバナー',
};
