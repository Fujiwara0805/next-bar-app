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
          name: string
          description: string | null
          address: string
          latitude: number
          longitude: number
          phone: string | null
          opening_hours: Json | null
          image_url: string | null
          menu_images: Json
          is_open: boolean
          vacancy_status: 'vacant' | 'moderate' | 'crowded'
          male_ratio: number
          female_ratio: number
          last_updated: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string | null
          address: string
          latitude: number
          longitude: number
          phone?: string | null
          opening_hours?: Json | null
          image_url?: string | null
          menu_images?: Json
          is_open?: boolean
          vacancy_status?: 'vacant' | 'moderate' | 'crowded'
          male_ratio?: number
          female_ratio?: number
          last_updated?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string | null
          address?: string
          latitude?: number
          longitude?: number
          phone?: string | null
          opening_hours?: Json | null
          image_url?: string | null
          menu_images?: Json
          is_open?: boolean
          vacancy_status?: 'vacant' | 'moderate' | 'crowded'
          male_ratio?: number
          female_ratio?: number
          last_updated?: string
          created_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          store_id: string | null
          content: string
          images: Json
          latitude: number | null
          longitude: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          store_id?: string | null
          content: string
          images?: Json
          latitude?: number | null
          longitude?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          store_id?: string | null
          content?: string
          images?: Json
          latitude?: number | null
          longitude?: number | null
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
