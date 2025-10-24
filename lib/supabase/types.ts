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
          image_url: string | null
          menu_images: Json
          is_open: boolean
          vacancy_status: 'vacant' | 'moderate' | 'full' | 'closed'
          status_message: string | null
          male_ratio: number
          female_ratio: number
          last_updated: string
          created_at: string
          updated_at: string
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
          image_url?: string | null
          menu_images?: Json
          is_open?: boolean
          vacancy_status?: 'vacant' | 'moderate' | 'full' | 'closed'
          status_message?: string | null
          male_ratio?: number
          female_ratio?: number
          last_updated?: string
          created_at?: string
          updated_at?: string
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
          image_url?: string | null
          menu_images?: Json
          is_open?: boolean
          vacancy_status?: 'vacant' | 'moderate' | 'full' | 'closed'
          status_message?: string | null
          male_ratio?: number
          female_ratio?: number
          last_updated?: string
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
