export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bonus_clicks: {
        Row: {
          additional_bonus_text: string | null
          click_type: string
          clicked_at: string | null
          coupon_usage_id: string | null
          google_place_id: string | null
          id: string
          instagram_url: string | null
          referrer: string | null
          session_id: string | null
          store_id: string
          store_name: string | null
          user_agent: string | null
        }
        Insert: {
          additional_bonus_text?: string | null
          click_type: string
          clicked_at?: string | null
          coupon_usage_id?: string | null
          google_place_id?: string | null
          id?: string
          instagram_url?: string | null
          referrer?: string | null
          session_id?: string | null
          store_id: string
          store_name?: string | null
          user_agent?: string | null
        }
        Update: {
          additional_bonus_text?: string | null
          click_type?: string
          clicked_at?: string | null
          coupon_usage_id?: string | null
          google_place_id?: string | null
          id?: string
          instagram_url?: string | null
          referrer?: string | null
          session_id?: string | null
          store_id?: string
          store_name?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      coupon_usages: {
        Row: {
          age_group: string | null
          campaign_id: string | null
          campaign_name: string | null
          coupon_additional_bonus: string | null
          coupon_code: string | null
          coupon_conditions: string | null
          coupon_discount_type: string | null
          coupon_discount_value: number | null
          coupon_id: string | null
          coupon_title: string | null
          created_at: string
          gender: string | null
          id: string
          ip_address: unknown
          is_first_visit: boolean
          is_local_resident: boolean
          referrer: string | null
          session_id: string | null
          store_id: string
          store_name: string
          used_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          age_group?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          coupon_additional_bonus?: string | null
          coupon_code?: string | null
          coupon_conditions?: string | null
          coupon_discount_type?: string | null
          coupon_discount_value?: number | null
          coupon_id?: string | null
          coupon_title?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          ip_address?: unknown
          is_first_visit: boolean
          is_local_resident: boolean
          referrer?: string | null
          session_id?: string | null
          store_id: string
          store_name?: string
          used_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          age_group?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          coupon_additional_bonus?: string | null
          coupon_code?: string | null
          coupon_conditions?: string | null
          coupon_discount_type?: string | null
          coupon_discount_value?: number | null
          coupon_id?: string | null
          coupon_title?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          ip_address?: unknown
          is_first_visit?: boolean
          is_local_resident?: boolean
          referrer?: string | null
          session_id?: string | null
          store_id?: string
          store_name?: string
          used_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ogori_drinks: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          sort_order: number | null
          store_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price: number
          sort_order?: number | null
          store_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          sort_order?: number | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ogori_drinks_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      ogori_price_options: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          store_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          store_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ogori_price_options_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      ogori_tickets: {
        Row: {
          amount: number
          created_at: string | null
          drink_id: string | null
          drink_name: string | null
          id: string
          purchaser_id: string | null
          status: string | null
          store_id: string
          stripe_payment_id: string | null
          used_at: string | null
          used_by: string | null
          used_drink_id: string | null
          used_drink_name: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          drink_id?: string | null
          drink_name?: string | null
          id?: string
          purchaser_id?: string | null
          status?: string | null
          store_id: string
          stripe_payment_id?: string | null
          used_at?: string | null
          used_by?: string | null
          used_drink_id?: string | null
          used_drink_name?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          drink_id?: string | null
          drink_name?: string | null
          id?: string
          purchaser_id?: string | null
          status?: string | null
          store_id?: string
          stripe_payment_id?: string | null
          used_at?: string | null
          used_by?: string | null
          used_drink_id?: string | null
          used_drink_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ogori_tickets_purchaser_id_fkey"
            columns: ["purchaser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ogori_tickets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ogori_tickets_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string
          email: string
          id: string
          is_business: boolean | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name: string
          email: string
          id: string
          is_business?: boolean | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string
          email?: string
          id?: string
          is_business?: boolean | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          store_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          store_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          store_id?: string
        }
        Relationships: []
      }
      quick_reservations: {
        Row: {
          arrival_time: string
          arrived_at: string | null
          call_sid: string | null
          caller_name: string | null
          caller_phone: string
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string | null
          deleted_at: string | null
          expires_at: string
          id: string
          no_show_at: string | null
          notes: string | null
          party_size: number
          rejection_reason: string | null
          status: string
          store_id: string
          store_name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          arrival_time: string
          arrived_at?: string | null
          call_sid?: string | null
          caller_name?: string | null
          caller_phone: string
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          expires_at: string
          id?: string
          no_show_at?: string | null
          notes?: string | null
          party_size?: number
          rejection_reason?: string | null
          status?: string
          store_id: string
          store_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          arrival_time?: string
          arrived_at?: string | null
          call_sid?: string | null
          caller_name?: string | null
          caller_phone?: string
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          expires_at?: string
          id?: string
          no_show_at?: string | null
          notes?: string | null
          party_size?: number
          rejection_reason?: string | null
          status?: string
          store_id?: string
          store_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_reservations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_ad_creatives: {
        Row: {
          ad_slot_id: string
          background_image_url: string | null
          created_at: string
          cta_color: string
          cta_text: string | null
          cta_url: string | null
          custom_css: Json | null
          display_config: Json
          icon_position: Json | null
          icon_size: number
          icon_url: string | null
          id: string
          image_url: string | null
          is_active: boolean
          translations: Json
          updated_at: string
          version: number
        }
        Insert: {
          ad_slot_id: string
          background_image_url?: string | null
          created_at?: string
          cta_color?: string
          cta_text?: string | null
          cta_url?: string | null
          custom_css?: Json | null
          display_config?: Json
          icon_position?: Json | null
          icon_size?: number
          icon_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          translations?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          ad_slot_id?: string
          background_image_url?: string | null
          created_at?: string
          cta_color?: string
          cta_text?: string | null
          cta_url?: string | null
          custom_css?: Json | null
          display_config?: Json
          icon_position?: Json | null
          icon_size?: number
          icon_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          translations?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_ad_creatives_ad_slot_id_fkey"
            columns: ["ad_slot_id"]
            isOneToOne: false
            referencedRelation: "sponsor_ad_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_ad_slots: {
        Row: {
          contract_id: string
          created_at: string
          display_priority: number
          id: string
          is_enabled: boolean
          schedule_config: Json
          slot_type: string
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          display_priority?: number
          id?: string
          is_enabled?: boolean
          schedule_config?: Json
          slot_type: string
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          display_priority?: number
          id?: string
          is_enabled?: boolean
          schedule_config?: Json
          slot_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_ad_slots_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "sponsor_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_contracts: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          end_date: string
          id: string
          notes: string | null
          plan_type: string
          price: number | null
          sponsor_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          end_date: string
          id?: string
          notes?: string | null
          plan_type: string
          price?: number | null
          sponsor_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          end_date?: string
          id?: string
          notes?: string | null
          plan_type?: string
          price?: number | null
          sponsor_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_contracts_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_impressions: {
        Row: {
          ad_slot_id: string | null
          contract_id: string | null
          created_at: string
          creative_id: string | null
          device_type: string | null
          event_type: string
          geo_data: Json | null
          id: string
          metadata: Json
          referrer: string | null
          session_id: string | null
          sponsor_id: string | null
          user_agent: string | null
        }
        Insert: {
          ad_slot_id?: string | null
          contract_id?: string | null
          created_at?: string
          creative_id?: string | null
          device_type?: string | null
          event_type: string
          geo_data?: Json | null
          id?: string
          metadata?: Json
          referrer?: string | null
          session_id?: string | null
          sponsor_id?: string | null
          user_agent?: string | null
        }
        Update: {
          ad_slot_id?: string | null
          contract_id?: string | null
          created_at?: string
          creative_id?: string | null
          device_type?: string | null
          event_type?: string
          geo_data?: Json | null
          id?: string
          metadata?: Json
          referrer?: string | null
          session_id?: string | null
          sponsor_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_impressions_ad_slot_id_fkey"
            columns: ["ad_slot_id"]
            isOneToOne: false
            referencedRelation: "sponsor_ad_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_impressions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "sponsor_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_impressions_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "sponsor_ad_creatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_impressions_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_reports: {
        Row: {
          clicks_count: number
          contract_id: string
          created_at: string
          cta_clicks_count: number
          ctr: number
          device_breakdown: Json
          hourly_breakdown: Json
          id: string
          impressions_count: number
          report_date: string
          slot_breakdown: Json
          sponsor_id: string
          unique_users_count: number
        }
        Insert: {
          clicks_count?: number
          contract_id: string
          created_at?: string
          cta_clicks_count?: number
          ctr?: number
          device_breakdown?: Json
          hourly_breakdown?: Json
          id?: string
          impressions_count?: number
          report_date: string
          slot_breakdown?: Json
          sponsor_id: string
          unique_users_count?: number
        }
        Update: {
          clicks_count?: number
          contract_id?: string
          created_at?: string
          cta_clicks_count?: number
          ctr?: number
          device_breakdown?: Json
          hourly_breakdown?: Json
          id?: string
          impressions_count?: number
          report_date?: string
          slot_breakdown?: Json
          sponsor_id?: string
          unique_users_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_reports_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "sponsor_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_reports_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          company_logo_url: string | null
          company_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          notes: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          company_logo_url?: string | null
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          company_logo_url?: string | null
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_applications: {
        Row: {
          address: string
          admin_notes: string | null
          budget_max: number | null
          budget_min: number | null
          business_hours: string | null
          contact_email: string
          created_at: string | null
          description: string | null
          facilities: string[] | null
          id: string
          image_urls: string[] | null
          latitude: number | null
          longitude: number | null
          payment_methods: string[] | null
          phone: string | null
          regular_holiday: string | null
          remarks: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          store_category: string
          store_name: string
          terms_agreed: boolean
          updated_at: string | null
        }
        Insert: {
          address: string
          admin_notes?: string | null
          budget_max?: number | null
          budget_min?: number | null
          business_hours?: string | null
          contact_email: string
          created_at?: string | null
          description?: string | null
          facilities?: string[] | null
          id?: string
          image_urls?: string[] | null
          latitude?: number | null
          longitude?: number | null
          payment_methods?: string[] | null
          phone?: string | null
          regular_holiday?: string | null
          remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          store_category?: string
          store_name: string
          terms_agreed?: boolean
          updated_at?: string | null
        }
        Update: {
          address?: string
          admin_notes?: string | null
          budget_max?: number | null
          budget_min?: number | null
          business_hours?: string | null
          contact_email?: string
          created_at?: string | null
          description?: string | null
          facilities?: string[] | null
          id?: string
          image_urls?: string[] | null
          latitude?: number | null
          longitude?: number | null
          payment_methods?: string[] | null
          phone?: string | null
          regular_holiday?: string | null
          remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          store_category?: string
          store_name?: string
          terms_agreed?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      stores: {
        Row: {
          address: string
          budget_max: number | null
          budget_min: number | null
          business_hours: Json | null
          campaign_end_date: string | null
          campaign_id: string | null
          campaign_name: string | null
          campaign_start_date: string | null
          closed_reason: string | null
          coupon_additional_bonus: string | null
          coupon_barcode_url: string | null
          coupon_code: string | null
          coupon_conditions: string | null
          coupon_current_uses: number | null
          coupon_description: string | null
          coupon_discount_type: string | null
          coupon_discount_value: number | null
          coupon_expiry_date: string | null
          coupon_image_url: string | null
          coupon_is_active: boolean | null
          coupon_is_campaign: boolean | null
          coupon_max_uses: number | null
          coupon_start_date: string | null
          coupon_title: string | null
          created_at: string | null
          description: string | null
          email: string
          facilities: string[] | null
          female_ratio: number | null
          google_place_id: string | null
          google_rating: number | null
          google_reviews_count: number | null
          has_campaign: boolean | null
          id: string
          image_urls: string[] | null
          is_open: boolean | null
          last_is_open_check_at: string | null
          last_updated: string | null
          latitude: number
          longitude: number
          male_ratio: number | null
          manual_closed: boolean | null
          manual_closed_at: string | null
          name: string
          ogori_enabled: boolean | null
          owner_id: string
          payment_methods: string[] | null
          phone: string | null
          regular_holiday: string | null
          status_message: string | null
          store_category: string
          structured_business_hours: Json | null
          updated_at: string | null
          vacancy_status: string | null
          vacant_seats: number | null
          website_url: string | null
        }
        Insert: {
          address: string
          budget_max?: number | null
          budget_min?: number | null
          business_hours?: Json | null
          campaign_end_date?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          campaign_start_date?: string | null
          closed_reason?: string | null
          coupon_additional_bonus?: string | null
          coupon_barcode_url?: string | null
          coupon_code?: string | null
          coupon_conditions?: string | null
          coupon_current_uses?: number | null
          coupon_description?: string | null
          coupon_discount_type?: string | null
          coupon_discount_value?: number | null
          coupon_expiry_date?: string | null
          coupon_image_url?: string | null
          coupon_is_active?: boolean | null
          coupon_is_campaign?: boolean | null
          coupon_max_uses?: number | null
          coupon_start_date?: string | null
          coupon_title?: string | null
          created_at?: string | null
          description?: string | null
          email?: string
          facilities?: string[] | null
          female_ratio?: number | null
          google_place_id?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
          has_campaign?: boolean | null
          id?: string
          image_urls?: string[] | null
          is_open?: boolean | null
          last_is_open_check_at?: string | null
          last_updated?: string | null
          latitude: number
          longitude: number
          male_ratio?: number | null
          manual_closed?: boolean | null
          manual_closed_at?: string | null
          name: string
          ogori_enabled?: boolean | null
          owner_id: string
          payment_methods?: string[] | null
          phone?: string | null
          regular_holiday?: string | null
          status_message?: string | null
          store_category?: string
          structured_business_hours?: Json | null
          updated_at?: string | null
          vacancy_status?: string | null
          vacant_seats?: number | null
          website_url?: string | null
        }
        Update: {
          address?: string
          budget_max?: number | null
          budget_min?: number | null
          business_hours?: Json | null
          campaign_end_date?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          campaign_start_date?: string | null
          closed_reason?: string | null
          coupon_additional_bonus?: string | null
          coupon_barcode_url?: string | null
          coupon_code?: string | null
          coupon_conditions?: string | null
          coupon_current_uses?: number | null
          coupon_description?: string | null
          coupon_discount_type?: string | null
          coupon_discount_value?: number | null
          coupon_expiry_date?: string | null
          coupon_image_url?: string | null
          coupon_is_active?: boolean | null
          coupon_is_campaign?: boolean | null
          coupon_max_uses?: number | null
          coupon_start_date?: string | null
          coupon_title?: string | null
          created_at?: string | null
          description?: string | null
          email?: string
          facilities?: string[] | null
          female_ratio?: number | null
          google_place_id?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
          has_campaign?: boolean | null
          id?: string
          image_urls?: string[] | null
          is_open?: boolean | null
          last_is_open_check_at?: string | null
          last_updated?: string | null
          latitude?: number
          longitude?: number
          male_ratio?: number | null
          manual_closed?: boolean | null
          manual_closed_at?: string | null
          name?: string
          ogori_enabled?: boolean | null
          owner_id?: string
          payment_methods?: string[] | null
          phone?: string | null
          regular_holiday?: string | null
          status_message?: string | null
          store_category?: string
          structured_business_hours?: Json | null
          updated_at?: string | null
          vacancy_status?: string | null
          vacant_seats?: number | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      coupon_usage_daily_stats: {
        Row: {
          first_visit_count: number | null
          local_resident_count: number | null
          repeat_visit_count: number | null
          store_id: string | null
          total_usages: number | null
          usage_date: string | null
          visitor_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usage_monthly_stats: {
        Row: {
          first_visit_count: number | null
          first_visit_percentage: number | null
          local_resident_count: number | null
          local_resident_percentage: number | null
          repeat_visit_count: number | null
          store_id: string | null
          total_usages: number | null
          usage_month: string | null
          visitor_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      aggregate_sponsor_daily_reports: { Args: never; Returns: undefined }
      check_coupon_duplicate: {
        Args: {
          p_coupon_id: string
          p_device_fingerprint: string
          p_session_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      check_coupon_duplicate_usage: {
        Args: {
          p_minutes_threshold?: number
          p_session_id: string
          p_store_id: string
        }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      record_coupon_usage: {
        Args: {
          p_is_first_visit?: boolean
          p_is_local_resident?: boolean
          p_referrer?: string
          p_session_id: string
          p_store_id: string
          p_user_agent?: string
          p_user_id?: string
        }
        Returns: Json
      }
      update_sponsor_contract_statuses: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

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
