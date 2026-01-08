export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string
          avatar_url: string | null
          bio: string | null
          phone: string | null
          is_business: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name: string
          avatar_url?: string | null
          bio?: string | null
          phone?: string | null
          is_business?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string
          avatar_url?: string | null
          bio?: string | null
          phone?: string | null
          is_business?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      stores: {
        Row: {
          id: string
          owner_id: string
          email: string
          name: string
          description: string | null
          address: string
          latitude: number
          longitude: number
          phone: string | null
          website_url: string | null
          opening_hours: Json | null
          business_hours: Json | null
          regular_holiday: string | null
          budget_min: number | null
          budget_max: number | null
          payment_methods: string[] | null
          facilities: string[] | null
          image_urls: string[] | null
          is_open: boolean
          vacancy_status: 'vacant' | 'open' | 'full' | 'closed'
          status_message: string | null
          male_ratio: number
          female_ratio: number
          last_updated: string
          created_at: string
          updated_at: string
          google_place_id: string | null
          google_rating: number | null
          google_reviews_count: number | null
          // ============================================
          // 臨時休業（manual_closed）関連のカラム
          // ============================================
          /** 臨時休業フラグ。trueの場合、Google Maps APIの結果に関わらず閉店扱い */
          manual_closed: boolean
          /** 閉店理由。'manual'=臨時休業、'business_hours'=営業時間外 */
          closed_reason: 'manual' | 'business_hours' | null
          /** 臨時休業の理由（店主が入力） */
          manual_close_reason: string | null
          /** 臨時休業を設定した日時 */
          manual_closed_at: string | null
          /** 再開予定日時（任意） */
          estimated_reopen_at: string | null
          /** 最後にis_openをチェックした日時（キャッシュ用） */
          last_is_open_check_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          email: string
          name: string
          description?: string | null
          address: string
          latitude: number
          longitude: number
          phone?: string | null
          website_url?: string | null
          opening_hours?: Json | null
          business_hours?: Json | null
          regular_holiday?: string | null
          budget_min?: number | null
          budget_max?: number | null
          payment_methods?: string[] | null
          facilities?: string[] | null
          image_urls?: string[] | null
          is_open?: boolean
          vacancy_status?: 'vacant' | 'open' | 'full' | 'closed'
          status_message?: string | null
          male_ratio?: number
          female_ratio?: number
          last_updated?: string
          created_at?: string
          updated_at?: string
          google_place_id?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
          // 臨時休業関連（すべてオプショナル）
          manual_closed?: boolean
          closed_reason?: 'manual' | 'business_hours' | null
          manual_close_reason?: string | null
          manual_closed_at?: string | null
          estimated_reopen_at?: string | null
          last_is_open_check_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          email?: string
          name?: string
          description?: string | null
          address?: string
          latitude?: number
          longitude?: number
          phone?: string | null
          website_url?: string | null
          opening_hours?: Json | null
          business_hours?: Json | null
          regular_holiday?: string | null
          budget_min?: number | null
          budget_max?: number | null
          payment_methods?: string[] | null
          facilities?: string[] | null
          image_urls?: string[] | null
          is_open?: boolean
          vacancy_status?: 'vacant' | 'open' | 'full' | 'closed'
          status_message?: string | null
          male_ratio?: number
          female_ratio?: number
          last_updated?: string
          created_at?: string
          updated_at?: string
          google_place_id?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
          // 臨時休業関連（すべてオプショナル）
          manual_closed?: boolean
          closed_reason?: 'manual' | 'business_hours' | null
          manual_close_reason?: string | null
          manual_closed_at?: string | null
          estimated_reopen_at?: string | null
          last_is_open_check_at?: string | null
        }
      }
      quick_reservations: {
        Row: {
          id: string
          store_id: string
          user_id: string | null
          caller_name: string | null
          caller_phone: string
          party_size: number
          arrival_time: string
          status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'expired'
          call_sid: string | null
          confirmed_at: string | null
          rejection_reason: string | null
          notes: string | null
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          user_id?: string | null
          caller_name?: string | null
          caller_phone: string
          party_size: number
          arrival_time: string
          status?: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'expired'
          call_sid?: string | null
          confirmed_at?: string | null
          rejection_reason?: string | null
          notes?: string | null
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          user_id?: string | null
          caller_name?: string | null
          caller_phone?: string
          party_size?: number
          arrival_time?: string
          status?: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'expired'
          call_sid?: string | null
          confirmed_at?: string | null
          rejection_reason?: string | null
          notes?: string | null
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}

// 営業時間の型定義
export type BusinessHours = {
  [key in 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday']?: {
    open: string;
    close: string;
    closed?: boolean;
  };
};

// ============================================
// 臨時休業関連の型定義
// ============================================

/** 閉店理由の型 */
export type ClosedReason = 'manual' | 'business_hours' | null;

/** 表示用ステータスのタイプ */
export type DisplayStatusType = 'open' | 'closed_manual' | 'closed_hours';

/** フロントエンド表示用のステータス情報 */
export interface DisplayStatus {
  /** 日本語ラベル */
  label: string;
  /** 英語ラベル */
  labelEn: string;
  /** ステータスタイプ */
  type: DisplayStatusType;
  /** 表示色（Tailwind色またはHex） */
  color: string;
  /** アイコン名（lucide-react等） */
  icon: string;
}

/** 臨時休業の詳細情報 */
export interface ManualCloseDetails {
  /** 臨時休業の理由 */
  reason: string | null;
  /** 臨時休業開始日時 */
  closed_at: string | null;
  /** 再開予定日時 */
  estimated_reopen_at: string | null;
}

/**
 * 表示用ステータスを取得するユーティリティ関数
 */
export function getDisplayStatus(
  isOpen: boolean,
  vacancyStatus: 'vacant' | 'open' | 'full' | 'closed',
  manualClosed: boolean,
  closedReason: ClosedReason
): DisplayStatus {
  // 臨時休業中
  if (manualClosed || closedReason === 'manual') {
    return {
      label: '臨時休業',
      labelEn: 'Temporarily Closed',
      type: 'closed_manual',
      color: '#ef4444', // red-500
      icon: 'pause-circle',
    };
  }

  // 営業時間外による閉店
  if (!isOpen || vacancyStatus === 'closed') {
    return {
      label: '営業時間外',
      labelEn: 'Closed',
      type: 'closed_hours',
      color: '#6b7280', // gray-500
      icon: 'clock',
    };
  }

  // 営業中のステータス
  const statusMap: Record<string, Omit<DisplayStatus, 'type'>> = {
    vacant: {
      label: '空席あり',
      labelEn: 'Available',
      color: '#22c55e', // green-500
      icon: 'check-circle',
    },
    full: {
      label: '満席',
      labelEn: 'Full',
      color: '#ef4444', // red-500
      icon: 'x-circle',
    },
    open: {
      label: '営業中',
      labelEn: 'Open',
      color: '#f59e0b', // amber-500
      icon: 'minus-circle',
    },
  };

  const status = statusMap[vacancyStatus] || statusMap.vacant;

  return {
    ...status,
    type: 'open',
  };
}