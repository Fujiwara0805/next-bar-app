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
          vacancy_status: 'vacant' | 'moderate' | 'full' | 'closed'
          status_message: string | null
          male_ratio: number
          female_ratio: number
          last_updated: string
          created_at: string
          updated_at: string
          google_place_id: string | null
          google_rating: number | null
          google_reviews_count: number | null
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
          vacancy_status?: 'vacant' | 'moderate' | 'full' | 'closed'
          status_message?: string | null
          male_ratio?: number
          female_ratio?: number
          last_updated?: string
          created_at?: string
          updated_at?: string
          google_place_id?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
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
          vacancy_status?: 'vacant' | 'moderate' | 'full' | 'closed'
          status_message?: string | null
          male_ratio?: number
          female_ratio?: number
          last_updated?: string
          created_at?: string
          updated_at?: string
          google_place_id?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
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
