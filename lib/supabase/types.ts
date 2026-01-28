// ============================================
// 型定義(lib/supabase/types.ts)
// ============================================

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
      // ============================================
      // キャンペーンマスタテーブル
      // ============================================
      campaigns: {
        Row: {
          id: string
          name: string
          description: string | null
          start_date: string
          end_date: string
          is_active: boolean
          region: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          start_date: string
          end_date: string
          is_active?: boolean
          region?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          start_date?: string
          end_date?: string
          is_active?: boolean
          region?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      // ============================================
      // ボーナスクリック記録テーブル
      // ============================================
      bonus_clicks: {
        Row: {
          id: string
          coupon_usage_id: string | null
          store_id: string
          click_type: 'instagram' | 'google_review' | 'additional_bonus'
          session_id: string | null
          user_agent: string | null
          referrer: string | null
          clicked_at: string
        }
        Insert: {
          id?: string
          coupon_usage_id?: string | null
          store_id: string
          click_type: 'instagram' | 'google_review' | 'additional_bonus'
          session_id?: string | null
          user_agent?: string | null
          referrer?: string | null
          clicked_at?: string
        }
        Update: {
          id?: string
          coupon_usage_id?: string | null
          store_id?: string
          click_type?: 'instagram' | 'google_review' | 'additional_bonus'
          session_id?: string | null
          user_agent?: string | null
          referrer?: string | null
          clicked_at?: string
        }
      }
      // ============================================
      // クーポン利用記録テーブル（参照用）
      // ============================================
      coupon_usages: {
        Row: {
          id: string
          store_id: string
          store_name: string
          session_id: string
          user_id: string | null
          is_first_visit: boolean
          is_local_resident: boolean
          user_agent: string | null
          referrer: string | null
          used_at: string
        }
        Insert: {
          id?: string
          store_id: string
          store_name: string
          session_id: string
          user_id?: string | null
          is_first_visit?: boolean
          is_local_resident?: boolean
          user_agent?: string | null
          referrer?: string | null
          used_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          store_name?: string
          session_id?: string
          user_id?: string | null
          is_first_visit?: boolean
          is_local_resident?: boolean
          user_agent?: string | null
          referrer?: string | null
          used_at?: string
        }
      }
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
          // ============================================
          // クーポン関連のカラム
          // ============================================
          /** クーポンタイトル */
          coupon_title: string | null
          /** クーポン説明 */
          coupon_description: string | null
          /** クーポン割引タイプ */
          coupon_discount_type: 'percentage' | 'fixed' | 'free_item' | null
          /** クーポン割引値 */
          coupon_discount_value: number | null
          /** クーポン利用条件 */
          coupon_conditions: string | null
          /** クーポン開始日時 */
          coupon_start_date: string | null
          /** クーポン有効期限 */
          coupon_expiry_date: string | null
          /** クーポン画像URL */
          coupon_image_url: string | null
          /** クーポン有効フラグ */
          coupon_is_active: boolean
          /** クーポン最大利用回数 */
          coupon_max_uses: number | null
          /** クーポン現在の利用回数 */
          coupon_current_uses: number
          /** クーポンコード */
          coupon_code: string | null
          /** クーポンバーコードURL */
          coupon_barcode_url: string | null
          /** InstagramのURL */
          instagram_url: string | null
          // ============================================
          // キャンペーン関連のカラム
          // ============================================
          /** キャンペーン実施フラグ */
          has_campaign: boolean
          /** キャンペーンID（マスタ参照） */
          campaign_id: string | null
          /** キャンペーン名 */
          campaign_name: string | null
          /** キャンペーン開始日時 */
          campaign_start_date: string | null
          /** キャンペーン終了日時 */
          campaign_end_date: string | null
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
          // クーポン関連（すべてオプショナル）
          coupon_title?: string | null
          coupon_description?: string | null
          coupon_discount_type?: 'percentage' | 'fixed' | 'free_item' | null
          coupon_discount_value?: number | null
          coupon_conditions?: string | null
          coupon_start_date?: string | null
          coupon_expiry_date?: string | null
          coupon_image_url?: string | null
          coupon_is_active?: boolean
          coupon_max_uses?: number | null
          coupon_current_uses?: number
          coupon_code?: string | null
          coupon_barcode_url?: string | null
          instagram_url?: string | null
          // キャンペーン関連（すべてオプショナル）
          has_campaign?: boolean
          campaign_id?: string | null
          campaign_name?: string | null
          campaign_start_date?: string | null
          campaign_end_date?: string | null
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
          // クーポン関連（すべてオプショナル）
          coupon_title?: string | null
          coupon_description?: string | null
          coupon_discount_type?: 'percentage' | 'fixed' | 'free_item' | null
          coupon_discount_value?: number | null
          coupon_conditions?: string | null
          coupon_start_date?: string | null
          coupon_expiry_date?: string | null
          coupon_image_url?: string | null
          coupon_is_active?: boolean
          coupon_max_uses?: number | null
          coupon_current_uses?: number
          coupon_code?: string | null
          coupon_barcode_url?: string | null
          instagram_url?: string | null
          // キャンペーン関連（すべてオプショナル）
          has_campaign?: boolean
          campaign_id?: string | null
          campaign_name?: string | null
          campaign_start_date?: string | null
          campaign_end_date?: string | null
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
          // ============================================
          // 来店管理関連のカラム
          // ============================================
          /** 店舗名（キャッシュ用） */
          store_name: string | null
          /** 来店日時。値があれば来店済み */
          arrived_at: string | null
          /** ノーショー（無断キャンセル）日時 */
          no_show_at: string | null
          /** キャンセル日時 */
          cancelled_at: string | null
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
          // 来店管理関連（すべてオプショナル）
          store_name?: string | null
          arrived_at?: string | null
          no_show_at?: string | null
          cancelled_at?: string | null
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
          // 来店管理関連（すべてオプショナル）
          store_name?: string | null
          arrived_at?: string | null
          no_show_at?: string | null
          cancelled_at?: string | null
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}

// ============================================
// 予約ステータス関連の型定義
// ============================================

/** 予約ステータス */
export type ReservationStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'expired';

/** 来店ステータス */
export type ArrivalStatus = 'not_arrived' | 'arrived' | 'no_show';

/**
 * 来店ステータスを取得するユーティリティ関数
 */
export function getArrivalStatus(
  arrivedAt: string | null,
  noShowAt: string | null
): ArrivalStatus {
  if (arrivedAt) return 'arrived';
  if (noShowAt) return 'no_show';
  return 'not_arrived';
}

/**
 * 来店ステータスの表示情報
 */
export interface ArrivalStatusDisplay {
  label: string;
  labelEn: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/**
 * 来店ステータスの表示情報を取得
 */
export function getArrivalStatusDisplay(status: ArrivalStatus): ArrivalStatusDisplay {
  const statusMap: Record<ArrivalStatus, ArrivalStatusDisplay> = {
    not_arrived: {
      label: '未来店',
      labelEn: 'Not Arrived',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
    },
    arrived: {
      label: '来店済',
      labelEn: 'Arrived',
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-300',
    },
    no_show: {
      label: '無断キャンセル',
      labelEn: 'No Show',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
  };

  return statusMap[status];
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
// クーポン関連の型定義
// ============================================

/** クーポン割引タイプ */
export type CouponDiscountType = 'percentage' | 'fixed' | 'free_item' | null;

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