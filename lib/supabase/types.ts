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
      coupon_issues: {
        Row: {
          age_range: string | null
          coupon_id: string
          gender: string | null
          id: string
          is_first_visit: boolean | null
          issued_at: string
          line_user_id: string | null
          message_id: string | null
          origin_prefecture: string | null
          redeem_code: string
          redeemed_at: string | null
          redeemed_by_user_id: string | null
          store_id: string
          user_id: string | null
        }
        Insert: {
          age_range?: string | null
          coupon_id: string
          gender?: string | null
          id?: string
          is_first_visit?: boolean | null
          issued_at?: string
          line_user_id?: string | null
          message_id?: string | null
          origin_prefecture?: string | null
          redeem_code: string
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
          store_id: string
          user_id?: string | null
        }
        Update: {
          age_range?: string | null
          coupon_id?: string
          gender?: string | null
          id?: string
          is_first_visit?: boolean | null
          issued_at?: string
          line_user_id?: string | null
          message_id?: string | null
          origin_prefecture?: string | null
          redeem_code?: string
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
          store_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_issues_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "store_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_issues_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "store_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_issues_redeemed_by_user_id_fkey"
            columns: ["redeemed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_issues_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_issues_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          amount_used: number | null
          id: string
          issue_id: string
          notes: string | null
          redeemed_at: string
          redeemed_by_user_id: string | null
          store_id: string
        }
        Insert: {
          amount_used?: number | null
          id?: string
          issue_id: string
          notes?: string | null
          redeemed_at?: string
          redeemed_by_user_id?: string | null
          store_id: string
        }
        Update: {
          amount_used?: number | null
          id?: string
          issue_id?: string
          notes?: string | null
          redeemed_at?: string
          redeemed_by_user_id?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: true
            referencedRelation: "coupon_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_redeemed_by_user_id_fkey"
            columns: ["redeemed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      line_oa_subscribers: {
        Row: {
          daily_notify_count: number
          daily_notify_date: string | null
          display_name: string | null
          followed_at: string
          language: string | null
          last_vacancy_sent_at: string | null
          latest_latitude: number | null
          latest_location_at: string | null
          latest_longitude: number | null
          line_user_id: string
          notify_area_label: string | null
          notify_center_latitude: number | null
          notify_center_longitude: number | null
          notify_updated_at: string | null
          picture_url: string | null
          unfollowed_at: string | null
          user_id: string | null
          vacancy_notify_opt_in: boolean
          vacancy_notify_radius_km: number | null
          vacancy_sent_count: number
        }
        Insert: {
          daily_notify_count?: number
          daily_notify_date?: string | null
          display_name?: string | null
          followed_at?: string
          language?: string | null
          last_vacancy_sent_at?: string | null
          latest_latitude?: number | null
          latest_location_at?: string | null
          latest_longitude?: number | null
          line_user_id: string
          notify_area_label?: string | null
          notify_center_latitude?: number | null
          notify_center_longitude?: number | null
          notify_updated_at?: string | null
          picture_url?: string | null
          unfollowed_at?: string | null
          user_id?: string | null
          vacancy_notify_opt_in?: boolean
          vacancy_notify_radius_km?: number | null
          vacancy_sent_count?: number
        }
        Update: {
          daily_notify_count?: number
          daily_notify_date?: string | null
          display_name?: string | null
          followed_at?: string
          language?: string | null
          last_vacancy_sent_at?: string | null
          latest_latitude?: number | null
          latest_location_at?: string | null
          latest_longitude?: number | null
          line_user_id?: string
          notify_area_label?: string | null
          notify_center_latitude?: number | null
          notify_center_longitude?: number | null
          notify_updated_at?: string | null
          picture_url?: string | null
          unfollowed_at?: string | null
          user_id?: string | null
          vacancy_notify_opt_in?: boolean
          vacancy_notify_radius_km?: number | null
          vacancy_sent_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "line_oa_subscribers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lottery_rounds: {
        Row: {
          executed_at: string | null
          executed_by: string | null
          gift_amount_jpy: number
          gift_type: string
          id: string
          target_date: string
          winner_count: number
        }
        Insert: {
          executed_at?: string | null
          executed_by?: string | null
          gift_amount_jpy?: number
          gift_type?: string
          id?: string
          target_date: string
          winner_count?: number
        }
        Update: {
          executed_at?: string | null
          executed_by?: string | null
          gift_amount_jpy?: number
          gift_type?: string
          id?: string
          target_date?: string
          winner_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "lottery_rounds_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "users"
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stamp_rally_entries: {
        Row: {
          created_at: string
          email: string
          entry_date: string
          gift_memo: string | null
          gift_sent_at: string | null
          id: string
          lottery_round_id: string | null
          status: string
          user_id: string
          visited_store_ids: string[]
          won_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          entry_date: string
          gift_memo?: string | null
          gift_sent_at?: string | null
          id?: string
          lottery_round_id?: string | null
          status?: string
          user_id: string
          visited_store_ids: string[]
          won_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          entry_date?: string
          gift_memo?: string | null
          gift_sent_at?: string | null
          id?: string
          lottery_round_id?: string | null
          status?: string
          user_id?: string
          visited_store_ids?: string[]
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stamp_rally_entries_lottery_round_id_fkey"
            columns: ["lottery_round_id"]
            isOneToOne: false
            referencedRelation: "lottery_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stamp_rally_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      store_check_ins: {
        Row: {
          check_in_accuracy_m: number | null
          check_in_distance_m: number | null
          check_in_lat: number | null
          check_in_lng: number | null
          checked_in_at: string
          id: string
          source: string
          store_id: string
          user_id: string
          visit_date: string
        }
        Insert: {
          check_in_accuracy_m?: number | null
          check_in_distance_m?: number | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          checked_in_at?: string
          id?: string
          source?: string
          store_id: string
          user_id: string
          visit_date?: string
        }
        Update: {
          check_in_accuracy_m?: number | null
          check_in_distance_m?: number | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          checked_in_at?: string
          id?: string
          source?: string
          store_id?: string
          user_id?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_check_ins_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_check_ins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      store_coupons: {
        Row: {
          body: string | null
          conditions: string | null
          created_at: string
          discount_type: string
          discount_value: number | null
          id: string
          image_url: string | null
          is_active: boolean
          max_issues: number | null
          max_per_user: number
          store_id: string
          title: string
          updated_at: string
          valid_from: string | null
          valid_until: string
        }
        Insert: {
          body?: string | null
          conditions?: string | null
          created_at?: string
          discount_type: string
          discount_value?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_issues?: number | null
          max_per_user?: number
          store_id: string
          title: string
          updated_at?: string
          valid_from?: string | null
          valid_until: string
        }
        Update: {
          body?: string | null
          conditions?: string | null
          created_at?: string
          discount_type?: string
          discount_value?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_issues?: number | null
          max_per_user?: number
          store_id?: string
          title?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_coupons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_crowd_reports: {
        Row: {
          distance_m: number | null
          id: string
          is_valid: boolean
          report_type: string
          reported_at: string
          source: string
          store_id: string
          user_id: string | null
          user_lat: number | null
          user_lng: number | null
        }
        Insert: {
          distance_m?: number | null
          id?: string
          is_valid?: boolean
          report_type: string
          reported_at?: string
          source?: string
          store_id: string
          user_id?: string | null
          user_lat?: number | null
          user_lng?: number | null
        }
        Update: {
          distance_m?: number | null
          id?: string
          is_valid?: boolean
          report_type?: string
          reported_at?: string
          source?: string
          store_id?: string
          user_id?: string | null
          user_lat?: number | null
          user_lng?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "store_crowd_reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_crowd_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      store_messages: {
        Row: {
          body: string
          click_count: number
          created_at: string
          error_message: string | null
          failed_count: number
          id: string
          kind: string
          sender_user_id: string | null
          sent_count: number
          status: string
          store_id: string
          target_audience: string
          target_radius_km: number | null
        }
        Insert: {
          body: string
          click_count?: number
          created_at?: string
          error_message?: string | null
          failed_count?: number
          id?: string
          kind: string
          sender_user_id?: string | null
          sent_count?: number
          status?: string
          store_id: string
          target_audience: string
          target_radius_km?: number | null
        }
        Update: {
          body?: string
          click_count?: number
          created_at?: string
          error_message?: string | null
          failed_count?: number
          id?: string
          kind?: string
          sender_user_id?: string | null
          sent_count?: number
          status?: string
          store_id?: string
          target_audience?: string
          target_radius_km?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "store_messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_messages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string
          budget_max: number | null
          budget_min: number | null
          business_hours: Json | null
          closed_reason: string | null
          created_at: string | null
          description: string | null
          email: string
          facilities: string[] | null
          female_ratio: number | null
          google_place_id: string | null
          google_rating: number | null
          google_reviews_count: number | null
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
          closed_reason?: string | null
          created_at?: string | null
          description?: string | null
          email?: string
          facilities?: string[] | null
          female_ratio?: number | null
          google_place_id?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
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
          closed_reason?: string | null
          created_at?: string | null
          description?: string | null
          email?: string
          facilities?: string[] | null
          female_ratio?: number | null
          google_place_id?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          latitude: number
          longitude: number
          p256dh: string
          updated_at: string | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          latitude: number
          longitude: number
          p256dh: string
          updated_at?: string | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          latitude?: number
          longitude?: number
          p256dh?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string
          email: string
          id: string
          line_display_name: string | null
          line_linked_at: string | null
          line_picture_url: string | null
          line_user_id: string | null
          phone: string | null
          profile_attributes: Json
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name: string
          email: string
          id: string
          line_display_name?: string | null
          line_linked_at?: string | null
          line_picture_url?: string | null
          line_user_id?: string | null
          phone?: string | null
          profile_attributes?: Json
          role?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string
          email?: string
          id?: string
          line_display_name?: string | null
          line_linked_at?: string | null
          line_picture_url?: string | null
          line_user_id?: string | null
          phone?: string | null
          profile_attributes?: Json
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aggregate_sponsor_daily_reports: { Args: never; Returns: undefined }
      bump_line_oa_daily_count: {
        Args: { p_users: string[] }
        Returns: undefined
      }
      is_platform_admin: { Args: never; Returns: boolean }
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

export type BusinessHours = {
  [key in 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday']?: {
    open: string;
    close: string;
    closed?: boolean;
  };
};
