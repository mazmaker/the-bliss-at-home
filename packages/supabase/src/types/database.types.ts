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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line: string
          created_at: string | null
          customer_id: string
          district: string | null
          id: string
          is_default: boolean | null
          label: string
          latitude: number | null
          longitude: number | null
          phone: string
          province: string
          recipient_name: string
          subdistrict: string | null
          updated_at: string | null
          zipcode: string
        }
        Insert: {
          address_line: string
          created_at?: string | null
          customer_id: string
          district?: string | null
          id?: string
          is_default?: boolean | null
          label: string
          latitude?: number | null
          longitude?: number | null
          phone: string
          province: string
          recipient_name: string
          subdistrict?: string | null
          updated_at?: string | null
          zipcode: string
        }
        Update: {
          address_line?: string
          created_at?: string | null
          customer_id?: string
          district?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          latitude?: number | null
          longitude?: number | null
          phone?: string
          province?: string
          recipient_name?: string
          subdistrict?: string | null
          updated_at?: string | null
          zipcode?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_code: string
          bank_name: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          is_verified: boolean | null
          staff_id: string
          updated_at: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          bank_code: string
          bank_name: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          staff_id: string
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_code?: string
          bank_name?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          staff_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_settings: {
        Row: {
          admin_contact_email: string | null
          admin_contact_line_id: string | null
          admin_contact_phone: string | null
          auto_email_reminder: boolean | null
          auto_line_reminder: boolean | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          bank_transfer_enabled: boolean | null
          cash_payment_enabled: boolean | null
          check_mailing_address: string | null
          check_payable_to: string | null
          check_payment_enabled: boolean | null
          created_at: string | null
          created_by: string | null
          due_day_type: string
          due_day_value: number
          due_months_after: number
          due_soon_days: number
          due_soon_message: string | null
          enable_late_fee: boolean | null
          id: string
          is_active: boolean | null
          late_fee_fixed_amount: number | null
          late_fee_percentage: number | null
          late_fee_type: string | null
          office_address: string | null
          office_hours: string | null
          overdue_days: number
          overdue_message: string | null
          reminder_frequency_days: number | null
          updated_at: string | null
          updated_by: string | null
          urgent_days: number
          urgent_message: string | null
          warning_days: number
          warning_message: string | null
        }
        Insert: {
          admin_contact_email?: string | null
          admin_contact_line_id?: string | null
          admin_contact_phone?: string | null
          auto_email_reminder?: boolean | null
          auto_line_reminder?: boolean | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_transfer_enabled?: boolean | null
          cash_payment_enabled?: boolean | null
          check_mailing_address?: string | null
          check_payable_to?: string | null
          check_payment_enabled?: boolean | null
          created_at?: string | null
          created_by?: string | null
          due_day_type?: string
          due_day_value?: number
          due_months_after?: number
          due_soon_days?: number
          due_soon_message?: string | null
          enable_late_fee?: boolean | null
          id?: string
          is_active?: boolean | null
          late_fee_fixed_amount?: number | null
          late_fee_percentage?: number | null
          late_fee_type?: string | null
          office_address?: string | null
          office_hours?: string | null
          overdue_days?: number
          overdue_message?: string | null
          reminder_frequency_days?: number | null
          updated_at?: string | null
          updated_by?: string | null
          urgent_days?: number
          urgent_message?: string | null
          warning_days?: number
          warning_message?: string | null
        }
        Update: {
          admin_contact_email?: string | null
          admin_contact_line_id?: string | null
          admin_contact_phone?: string | null
          auto_email_reminder?: boolean | null
          auto_line_reminder?: boolean | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_transfer_enabled?: boolean | null
          cash_payment_enabled?: boolean | null
          check_mailing_address?: string | null
          check_payable_to?: string | null
          check_payment_enabled?: boolean | null
          created_at?: string | null
          created_by?: string | null
          due_day_type?: string
          due_day_value?: number
          due_months_after?: number
          due_soon_days?: number
          due_soon_message?: string | null
          enable_late_fee?: boolean | null
          id?: string
          is_active?: boolean | null
          late_fee_fixed_amount?: number | null
          late_fee_percentage?: number | null
          late_fee_type?: string | null
          office_address?: string | null
          office_hours?: string | null
          overdue_days?: number
          overdue_message?: string | null
          reminder_frequency_days?: number | null
          updated_at?: string | null
          updated_by?: string | null
          urgent_days?: number
          urgent_message?: string | null
          warning_days?: number
          warning_message?: string | null
        }
        Relationships: []
      }
      booking_addons: {
        Row: {
          addon_id: string
          booking_id: string
          created_at: string | null
          id: string
          price_per_unit: number
          quantity: number | null
          total_price: number
        }
        Insert: {
          addon_id: string
          booking_id: string
          created_at?: string | null
          id?: string
          price_per_unit: number
          quantity?: number | null
          total_price: number
        }
        Update: {
          addon_id?: string
          booking_id?: string
          created_at?: string | null
          id?: string
          price_per_unit?: number
          quantity?: number | null
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "service_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_addons_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_services: {
        Row: {
          booking_id: string
          created_at: string
          duration: number
          extended_at: string | null
          id: string
          is_extension: boolean | null
          original_booking_service_id: string | null
          price: number
          recipient_index: number
          recipient_name: string | null
          service_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          duration: number
          extended_at?: string | null
          id?: string
          is_extension?: boolean | null
          original_booking_service_id?: string | null
          price: number
          recipient_index?: number
          recipient_name?: string | null
          service_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          duration?: number
          extended_at?: string | null
          id?: string
          is_extension?: boolean | null
          original_booking_service_id?: string | null
          price?: number
          recipient_index?: number
          recipient_name?: string | null
          service_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_services_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_booking_services_original"
            columns: ["original_booking_service_id"]
            isOneToOne: false
            referencedRelation: "booking_services"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          address: string | null
          admin_notes: string | null
          base_price: number
          booking_date: string
          booking_number: string
          booking_time: string
          cancellation_reason: string | null
          cancellation_type: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string | null
          customer_id: string | null
          customer_notes: string | null
          discount_amount: number | null
          duration: number
          extension_count: number | null
          final_price: number
          hotel_id: string | null
          hotel_room_number: string | null
          id: string
          is_hotel_booking: boolean | null
          is_multi_service: boolean
          last_extended_at: string | null
          latitude: number | null
          longitude: number | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          points_discount: number | null
          points_earned: number | null
          points_redeemed: number | null
          promotion_id: string | null
          provider_preference: string | null
          recipient_count: number | null
          refund_amount: number | null
          refund_percentage: number | null
          refund_status: string | null
          reschedule_count: number | null
          service_format: string | null
          service_id: string
          staff_earnings: number | null
          staff_id: string | null
          staff_notes: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          total_extensions_price: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          base_price: number
          booking_date: string
          booking_number?: string
          booking_time: string
          cancellation_reason?: string | null
          cancellation_type?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          discount_amount?: number | null
          duration: number
          extension_count?: number | null
          final_price: number
          hotel_id?: string | null
          hotel_room_number?: string | null
          id?: string
          is_hotel_booking?: boolean | null
          is_multi_service?: boolean
          last_extended_at?: string | null
          latitude?: number | null
          longitude?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          points_discount?: number | null
          points_earned?: number | null
          points_redeemed?: number | null
          promotion_id?: string | null
          provider_preference?: string | null
          recipient_count?: number | null
          refund_amount?: number | null
          refund_percentage?: number | null
          refund_status?: string | null
          reschedule_count?: number | null
          service_format?: string | null
          service_id: string
          staff_earnings?: number | null
          staff_id?: string | null
          staff_notes?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_extensions_price?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          base_price?: number
          booking_date?: string
          booking_number?: string
          booking_time?: string
          cancellation_reason?: string | null
          cancellation_type?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          discount_amount?: number | null
          duration?: number
          extension_count?: number | null
          final_price?: number
          hotel_id?: string | null
          hotel_room_number?: string | null
          id?: string
          is_hotel_booking?: boolean | null
          is_multi_service?: boolean
          last_extended_at?: string | null
          latitude?: number | null
          longitude?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          points_discount?: number | null
          points_earned?: number | null
          points_redeemed?: number | null
          promotion_id?: string | null
          provider_preference?: string | null
          recipient_count?: number | null
          refund_amount?: number | null
          refund_percentage?: number | null
          refund_status?: string | null
          reschedule_count?: number | null
          service_format?: string | null
          service_id?: string
          staff_earnings?: number | null
          staff_id?: string | null
          staff_notes?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_extensions_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_notifications: {
        Row: {
          booking_id: string
          channel: string
          created_at: string | null
          error_message: string | null
          id: string
          recipient_id: string
          recipient_type: string
          sent_at: string | null
          status: string
        }
        Insert: {
          booking_id: string
          channel: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          recipient_id: string
          recipient_type: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          booking_id?: string
          channel?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          recipient_id?: string
          recipient_type?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_policy_settings: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          max_reschedules_per_booking: number | null
          policy_description_en: string | null
          policy_description_th: string | null
          policy_title_en: string | null
          policy_title_th: string | null
          refund_processing_days: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_reschedules_per_booking?: number | null
          policy_description_en?: string | null
          policy_description_th?: string | null
          policy_title_en?: string | null
          policy_title_th?: string | null
          refund_processing_days?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_reschedules_per_booking?: number | null
          policy_description_en?: string | null
          policy_description_th?: string | null
          policy_title_en?: string | null
          policy_title_th?: string | null
          refund_processing_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cancellation_policy_tiers: {
        Row: {
          can_cancel: boolean | null
          can_reschedule: boolean | null
          created_at: string | null
          id: string
          is_active: boolean | null
          label_en: string | null
          label_th: string | null
          max_hours_before: number | null
          min_hours_before: number
          refund_percentage: number | null
          reschedule_fee: number | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          can_cancel?: boolean | null
          can_reschedule?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label_en?: string | null
          label_th?: string | null
          max_hours_before?: number | null
          min_hours_before: number
          refund_percentage?: number | null
          reschedule_fee?: number | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          can_cancel?: boolean | null
          can_reschedule?: boolean | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label_en?: string | null
          label_th?: string | null
          max_hours_before?: number | null
          min_hours_before?: number
          refund_percentage?: number | null
          reschedule_fee?: number | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      coupon_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          promotion_id: string
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          promotion_id: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          promotion_id?: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_codes_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_points: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          lifetime_earned: number | null
          lifetime_expired: number | null
          lifetime_redeemed: number | null
          total_points: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          lifetime_earned?: number | null
          lifetime_expired?: number | null
          lifetime_redeemed?: number | null
          total_points?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          lifetime_earned?: number | null
          lifetime_expired?: number | null
          lifetime_redeemed?: number | null
          total_points?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_points_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string | null
          date_of_birth: string | null
          full_name: string
          id: string
          last_booking_date: string | null
          phone: string
          preferences: Json | null
          profile_id: string | null
          status: Database["public"]["Enums"]["customer_status"] | null
          total_bookings: number | null
          total_spent: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          full_name: string
          id?: string
          last_booking_date?: string | null
          phone: string
          preferences?: Json | null
          profile_id?: string | null
          status?: Database["public"]["Enums"]["customer_status"] | null
          total_bookings?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          full_name?: string
          id?: string
          last_booking_date?: string | null
          phone?: string
          preferences?: Json | null
          profile_id?: string | null
          status?: Database["public"]["Enums"]["customer_status"] | null
          total_bookings?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      extension_acknowledgments: {
        Row: {
          acknowledged_at: string | null
          booking_service_id: string
          created_at: string | null
          id: string
          job_id: string
          staff_profile_id: string
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          booking_service_id: string
          created_at?: string | null
          id?: string
          job_id: string
          staff_profile_id: string
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          booking_service_id?: string
          created_at?: string | null
          id?: string
          job_id?: string
          staff_profile_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extension_acknowledgments_booking_service_id_fkey"
            columns: ["booking_service_id"]
            isOneToOne: false
            referencedRelation: "booking_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extension_acknowledgments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_bookings: {
        Row: {
          booking_date: string
          booking_number: string
          created_at: string | null
          created_by_hotel: boolean | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          duration: number
          hotel_id: string
          id: string
          notes: string | null
          payment_status: string
          room_number: string | null
          service_category: string
          service_date: string
          service_name: string
          service_time: string
          staff_name: string | null
          status: string
          total_price: number
          updated_at: string | null
        }
        Insert: {
          booking_date: string
          booking_number: string
          created_at?: string | null
          created_by_hotel?: boolean | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          duration: number
          hotel_id: string
          id?: string
          notes?: string | null
          payment_status?: string
          room_number?: string | null
          service_category: string
          service_date: string
          service_name: string
          service_time: string
          staff_name?: string | null
          status?: string
          total_price: number
          updated_at?: string | null
        }
        Update: {
          booking_date?: string
          booking_number?: string
          created_at?: string | null
          created_by_hotel?: boolean | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          duration?: number
          hotel_id?: string
          id?: string
          notes?: string | null
          payment_status?: string
          room_number?: string | null
          service_category?: string
          service_date?: string
          service_name?: string
          service_time?: string
          staff_name?: string | null
          status?: string
          total_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_bookings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_credit_notifications: {
        Row: {
          bill_id: string | null
          channel: string
          created_at: string | null
          hotel_id: string
          id: string
          notification_type: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          bill_id?: string | null
          channel: string
          created_at?: string | null
          hotel_id: string
          id?: string
          notification_type: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          bill_id?: string | null
          channel?: string
          created_at?: string | null
          hotel_id?: string
          id?: string
          notification_type?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_credit_notifications_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "monthly_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_credit_notifications_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_invoices: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string | null
          due_date: string
          hotel_id: string
          id: string
          invoice_number: string
          issued_date: string
          paid_date: string | null
          period_end: string
          period_start: string
          period_type: string
          status: string
          total_bookings: number
          total_revenue: number
          updated_at: string | null
        }
        Insert: {
          commission_amount?: number
          commission_rate: number
          created_at?: string | null
          due_date: string
          hotel_id: string
          id?: string
          invoice_number: string
          issued_date: string
          paid_date?: string | null
          period_end: string
          period_start: string
          period_type: string
          status?: string
          total_bookings?: number
          total_revenue?: number
          updated_at?: string | null
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          due_date?: string
          hotel_id?: string
          id?: string
          invoice_number?: string
          issued_date?: string
          paid_date?: string | null
          period_end?: string
          period_start?: string
          period_type?: string
          status?: string
          total_bookings?: number
          total_revenue?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_invoices_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_payments: {
        Row: {
          amount: number
          created_at: string | null
          hotel_id: string
          id: string
          invoice_id: string | null
          invoice_number: string | null
          notes: string | null
          payment_date: string
          payment_method: string
          status: string
          transaction_ref: string
          updated_at: string | null
          verified_by: string | null
          verified_date: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          hotel_id: string
          id?: string
          invoice_id?: string | null
          invoice_number?: string | null
          notes?: string | null
          payment_date: string
          payment_method: string
          status?: string
          transaction_ref: string
          updated_at?: string | null
          verified_by?: string | null
          verified_date?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          hotel_id?: string
          id?: string
          invoice_id?: string | null
          invoice_number?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          status?: string
          transaction_ref?: string
          updated_at?: string | null
          verified_by?: string | null
          verified_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_payments_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "hotel_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          address: string
          auth_user_id: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          commission_rate: number
          contact_person: string
          created_at: string | null
          credit_cycle_day: number | null
          credit_days: number | null
          credit_start_date: string | null
          description: string | null
          discount_rate: number
          email: string
          hotel_slug: string | null
          id: string
          last_login: string | null
          latitude: number | null
          login_email: string | null
          login_enabled: boolean | null
          longitude: number | null
          name_en: string
          name_th: string
          password_change_required: boolean | null
          password_reset_expires_at: string | null
          password_reset_token: string | null
          phone: string
          rating: number | null
          recommended_sales_staff: string | null
          settings: Json | null
          status: string
          tax_id: string | null
          temporary_password: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address: string
          auth_user_id?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          commission_rate?: number
          contact_person: string
          created_at?: string | null
          credit_cycle_day?: number | null
          credit_days?: number | null
          credit_start_date?: string | null
          description?: string | null
          discount_rate?: number
          email: string
          hotel_slug?: string | null
          id?: string
          last_login?: string | null
          latitude?: number | null
          login_email?: string | null
          login_enabled?: boolean | null
          longitude?: number | null
          name_en: string
          name_th: string
          password_change_required?: boolean | null
          password_reset_expires_at?: string | null
          password_reset_token?: string | null
          phone: string
          rating?: number | null
          recommended_sales_staff?: string | null
          settings?: Json | null
          status?: string
          tax_id?: string | null
          temporary_password?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string
          auth_user_id?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          commission_rate?: number
          contact_person?: string
          created_at?: string | null
          credit_cycle_day?: number | null
          credit_days?: number | null
          credit_start_date?: string | null
          description?: string | null
          discount_rate?: number
          email?: string
          hotel_slug?: string | null
          id?: string
          last_login?: string | null
          latitude?: number | null
          login_email?: string | null
          login_enabled?: boolean | null
          longitude?: number | null
          name_en?: string
          name_th?: string
          password_change_required?: boolean | null
          password_reset_expires_at?: string | null
          password_reset_token?: string | null
          phone?: string
          rating?: number | null
          recommended_sales_staff?: string | null
          settings?: Json | null
          status?: string
          tax_id?: string | null
          temporary_password?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      job_ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_id: string
          id: string
          job_id: string
          rating: number
          staff_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          job_id: string
          rating: number
          staff_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          job_id?: string
          rating?: number
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_ratings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_ratings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_ratings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          accepted_at: string | null
          address: string
          amount: number
          booking_id: string | null
          cancellation_reason: string | null
          cancellation_type: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string | null
          customer_avatar_url: string | null
          customer_id: string | null
          customer_name: string
          customer_notes: string | null
          customer_phone: string | null
          distance_km: number | null
          duration_minutes: number
          hotel_id: string | null
          hotel_name: string | null
          id: string
          job_index: number | null
          latitude: number | null
          longitude: number | null
          payment_status:
            | Database["public"]["Enums"]["job_payment_status"]
            | null
          room_number: string | null
          scheduled_date: string
          scheduled_time: string
          service_elapsed_minutes: number | null
          service_name: string
          service_name_en: string | null
          staff_earnings: number
          staff_id: string | null
          staff_notes: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"] | null
          total_duration_minutes: number | null
          total_jobs: number | null
          total_staff_earnings: number | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          address: string
          amount?: number
          booking_id?: string | null
          cancellation_reason?: string | null
          cancellation_type?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_avatar_url?: string | null
          customer_id?: string | null
          customer_name: string
          customer_notes?: string | null
          customer_phone?: string | null
          distance_km?: number | null
          duration_minutes?: number
          hotel_id?: string | null
          hotel_name?: string | null
          id?: string
          job_index?: number | null
          latitude?: number | null
          longitude?: number | null
          payment_status?:
            | Database["public"]["Enums"]["job_payment_status"]
            | null
          room_number?: string | null
          scheduled_date: string
          scheduled_time: string
          service_elapsed_minutes?: number | null
          service_name: string
          service_name_en?: string | null
          staff_earnings?: number
          staff_id?: string | null
          staff_notes?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          total_duration_minutes?: number | null
          total_jobs?: number | null
          total_staff_earnings?: number | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          address?: string
          amount?: number
          booking_id?: string | null
          cancellation_reason?: string | null
          cancellation_type?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_avatar_url?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_notes?: string | null
          customer_phone?: string | null
          distance_km?: number | null
          duration_minutes?: number
          hotel_id?: string | null
          hotel_name?: string | null
          id?: string
          job_index?: number | null
          latitude?: number | null
          longitude?: number | null
          payment_status?:
            | Database["public"]["Enums"]["job_payment_status"]
            | null
          room_number?: string | null
          scheduled_date?: string
          scheduled_time?: string
          service_elapsed_minutes?: number | null
          service_name?: string
          service_name_en?: string | null
          staff_earnings?: number
          staff_id?: string | null
          staff_notes?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          total_duration_minutes?: number | null
          total_jobs?: number | null
          total_staff_earnings?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_bills: {
        Row: {
          bill_number: string
          created_at: string | null
          due_date: string | null
          hotel_id: string
          id: string
          month: number
          paid_at: string | null
          period_end: string
          period_start: string
          status: string | null
          total_amount: number | null
          total_base_price: number | null
          total_bookings: number | null
          total_discount: number | null
          updated_at: string | null
          year: number
        }
        Insert: {
          bill_number: string
          created_at?: string | null
          due_date?: string | null
          hotel_id: string
          id?: string
          month: number
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: string | null
          total_amount?: number | null
          total_base_price?: number | null
          total_bookings?: number | null
          total_discount?: number | null
          updated_at?: string | null
          year: number
        }
        Update: {
          bill_number?: string
          created_at?: string | null
          due_date?: string | null
          hotel_id?: string
          id?: string
          month?: number
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: string | null
          total_amount?: number | null
          total_base_price?: number | null
          total_bookings?: number | null
          total_discount?: number | null
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          card_brand: string
          card_expiry_month: number
          card_expiry_year: number
          card_last_digits: string
          cardholder_name: string
          created_at: string | null
          customer_id: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          omise_card_id: string
          omise_customer_id: string | null
          updated_at: string | null
        }
        Insert: {
          card_brand: string
          card_expiry_month: number
          card_expiry_year: number
          card_last_digits: string
          cardholder_name: string
          created_at?: string | null
          customer_id: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          omise_card_id: string
          omise_customer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          card_brand?: string
          card_expiry_month?: number
          card_expiry_year?: number
          card_last_digits?: string
          cardholder_name?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          omise_card_id?: string
          omise_customer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_jobs: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          job_id: string
          payout_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          id?: string
          job_id: string
          payout_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          job_id?: string
          payout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_jobs_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          bank_account_id: string | null
          carry_forward_amount: number | null
          created_at: string | null
          gross_earnings: number
          id: string
          is_carry_forward: boolean | null
          net_amount: number
          notes: string | null
          payout_round: string | null
          period_end: string
          period_start: string
          platform_fee: number
          staff_id: string
          status: Database["public"]["Enums"]["payout_status"] | null
          total_jobs: number
          transfer_reference: string | null
          transfer_slip_url: string | null
          transferred_at: string | null
          updated_at: string | null
        }
        Insert: {
          bank_account_id?: string | null
          carry_forward_amount?: number
          created_at?: string | null
          gross_earnings?: number
          id?: string
          is_carry_forward?: boolean
          net_amount?: number
          notes?: string | null
          payout_round?: string | null
          period_end: string
          period_start: string
          platform_fee?: number
          staff_id: string
          status?: Database["public"]["Enums"]["payout_status"] | null
          total_jobs?: number
          transfer_reference?: string | null
          transfer_slip_url?: string | null
          transferred_at?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_account_id?: string | null
          carry_forward_amount?: number
          created_at?: string | null
          gross_earnings?: number
          id?: string
          is_carry_forward?: boolean
          net_amount?: number
          notes?: string | null
          payout_round?: string | null
          period_end?: string
          period_start?: string
          platform_fee?: number
          staff_id?: string
          status?: Database["public"]["Enums"]["payout_status"] | null
          total_jobs?: number
          transfer_reference?: string | null
          transfer_slip_url?: string | null
          transferred_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_notifications: {
        Row: {
          created_at: string | null
          id: string
          notification_type: string
          payout_round: string
          period_month: string
          staff_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notification_type: string
          payout_round: string
          period_month: string
          staff_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notification_type?: string
          payout_round?: string
          period_month?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_notifications_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          balance_after: number
          booking_id: string | null
          created_at: string | null
          customer_id: string
          description: string | null
          expired: boolean | null
          expires_at: string | null
          id: string
          points: number
          type: string
          warning_sent: boolean | null
        }
        Insert: {
          balance_after: number
          booking_id?: string | null
          created_at?: string | null
          customer_id: string
          description?: string | null
          expired?: boolean | null
          expires_at?: string | null
          id?: string
          points: number
          type: string
          warning_sent?: boolean | null
        }
        Update: {
          balance_after?: number
          booking_id?: string | null
          created_at?: string | null
          customer_id?: string
          description?: string | null
          expired?: boolean | null
          expires_at?: string | null
          id?: string
          points?: number
          type?: string
          warning_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          hotel_id: string | null
          id: string
          language: string
          line_display_name: string | null
          line_picture_url: string | null
          line_user_id: string | null
          metadata: Json | null
          phone: string | null
          refund_policy_accepted_at: string | null
          refund_policy_version: string | null
          role: string
          status: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          hotel_id?: string | null
          id?: string
          language?: string
          line_display_name?: string | null
          line_picture_url?: string | null
          line_user_id?: string | null
          metadata?: Json | null
          phone?: string | null
          refund_policy_accepted_at?: string | null
          refund_policy_version?: string | null
          role?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          hotel_id?: string | null
          id?: string
          language?: string
          line_display_name?: string | null
          line_picture_url?: string | null
          line_user_id?: string | null
          metadata?: Json | null
          phone?: string | null
          refund_policy_accepted_at?: string | null
          refund_policy_version?: string | null
          role?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_usage: {
        Row: {
          booking_id: string | null
          created_at: string | null
          discount_amount: number
          id: string
          promotion_id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          discount_amount: number
          id?: string
          promotion_id: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          discount_amount?: number
          id?: string
          promotion_id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_usage_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          applies_to: string | null
          auto_generate_code: boolean | null
          code: string
          code_length: number | null
          code_prefix: string | null
          created_at: string | null
          description_en: string | null
          description_th: string | null
          discount_type: string
          discount_value: number
          end_date: string
          id: string
          image_url: string | null
          max_discount: number | null
          min_order_amount: number | null
          name_en: string
          name_th: string
          start_date: string
          status: string | null
          target_categories: string[] | null
          target_services: string[] | null
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          usage_limit_per_user: number | null
        }
        Insert: {
          applies_to?: string | null
          auto_generate_code?: boolean | null
          code: string
          code_length?: number | null
          code_prefix?: string | null
          created_at?: string | null
          description_en?: string | null
          description_th?: string | null
          discount_type: string
          discount_value: number
          end_date: string
          id?: string
          image_url?: string | null
          max_discount?: number | null
          min_order_amount?: number | null
          name_en: string
          name_th: string
          start_date: string
          status?: string | null
          target_categories?: string[] | null
          target_services?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          usage_limit_per_user?: number | null
        }
        Update: {
          applies_to?: string | null
          auto_generate_code?: boolean | null
          code?: string
          code_length?: number | null
          code_prefix?: string | null
          created_at?: string | null
          description_en?: string | null
          description_th?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string
          id?: string
          image_url?: string | null
          max_discount?: number | null
          min_order_amount?: number | null
          name_en?: string
          name_th?: string
          start_date?: string
          status?: string | null
          target_categories?: string[] | null
          target_services?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          usage_limit_per_user?: number | null
        }
        Relationships: []
      }
      receipt_sequences: {
        Row: {
          current_seq: number
          date_key: string
          prefix: string
        }
        Insert: {
          current_seq?: number
          date_key: string
          prefix: string
        }
        Update: {
          current_seq?: number
          date_key?: string
          prefix?: string
        }
        Relationships: []
      }
      refund_transactions: {
        Row: {
          booking_id: string
          completed_at: string | null
          created_at: string | null
          credit_note_number: string | null
          error_message: string | null
          id: string
          initiated_by: string | null
          omise_refund_id: string | null
          payment_transaction_id: string | null
          reason: string | null
          refund_amount: number
          refund_percentage: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          booking_id: string
          completed_at?: string | null
          created_at?: string | null
          credit_note_number?: string | null
          error_message?: string | null
          id?: string
          initiated_by?: string | null
          omise_refund_id?: string | null
          payment_transaction_id?: string | null
          reason?: string | null
          refund_amount: number
          refund_percentage?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          booking_id?: string
          completed_at?: string | null
          created_at?: string | null
          credit_note_number?: string | null
          error_message?: string | null
          id?: string
          initiated_by?: string | null
          omise_refund_id?: string | null
          payment_transaction_id?: string | null
          reason?: string | null
          refund_amount?: number
          refund_percentage?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_transactions_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_transactions_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string | null
          cleanliness_rating: number | null
          created_at: string | null
          customer_id: string | null
          id: string
          is_visible: boolean | null
          professionalism_rating: number | null
          rating: number
          review: string | null
          service_id: string | null
          skill_rating: number | null
          staff_id: string | null
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          cleanliness_rating?: number | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_visible?: boolean | null
          professionalism_rating?: number | null
          rating: number
          review?: string | null
          service_id?: string | null
          skill_rating?: number | null
          staff_id?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          cleanliness_rating?: number | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_visible?: boolean | null
          professionalism_rating?: number | null
          rating?: number
          review?: string | null
          service_id?: string | null
          skill_rating?: number | null
          staff_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      sent_customer_email_reminders: {
        Row: {
          job_id: string
          minutes_before: number
          sent_at: string
        }
        Insert: {
          job_id: string
          minutes_before: number
          sent_at?: string
        }
        Update: {
          job_id?: string
          minutes_before?: number
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sent_customer_email_reminders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      sent_job_escalations: {
        Row: {
          escalation_level: number
          id: string
          job_id: string
          sent_at: string
        }
        Insert: {
          escalation_level: number
          id?: string
          job_id: string
          sent_at?: string
        }
        Update: {
          escalation_level?: number
          id?: string
          job_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sent_job_escalations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      sent_job_reminders: {
        Row: {
          job_id: string
          minutes_before: number
          sent_at: string | null
        }
        Insert: {
          job_id: string
          minutes_before: number
          sent_at?: string | null
        }
        Update: {
          job_id?: string
          minutes_before?: number
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sent_job_reminders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      service_addons: {
        Row: {
          created_at: string | null
          description_en: string | null
          description_th: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name_en: string
          name_th: string
          price: number
          service_id: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description_en?: string | null
          description_th?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name_en: string
          name_th: string
          price: number
          service_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description_en?: string | null
          description_th?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name_en?: string
          name_th?: string
          price?: number
          service_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_addons_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          id: string
          image_url: string
          service_id: string
          sort_order: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          service_id: string
          sort_order?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          service_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_images_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_pricing: {
        Row: {
          created_at: string | null
          duration: number
          id: string
          location_type: string
          price: number
          service_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration: number
          id?: string
          location_type: string
          price: number
          service_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration?: number
          id?: string
          location_type?: string
          price?: number
          service_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_pricing_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          rating: number
          service_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          rating: number
          service_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          rating?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_skills: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          service_id: string
          skill_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          service_id: string
          skill_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          service_id?: string
          skill_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_skills_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_price: number
          category: Database["public"]["Enums"]["service_category"]
          created_at: string | null
          description_en: string | null
          description_th: string | null
          duration: number
          duration_options: Json | null
          hotel_price: number
          id: string
          image_url: string | null
          is_active: boolean | null
          name_en: string
          name_th: string
          price_120: number | null
          price_60: number | null
          price_90: number | null
          slug: string | null
          sort_order: number | null
          staff_commission_rate: number | null
          updated_at: string | null
        }
        Insert: {
          base_price: number
          category: Database["public"]["Enums"]["service_category"]
          created_at?: string | null
          description_en?: string | null
          description_th?: string | null
          duration: number
          duration_options?: Json | null
          hotel_price: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name_en: string
          name_th: string
          price_120?: number | null
          price_60?: number | null
          price_90?: number | null
          slug?: string | null
          sort_order?: number | null
          staff_commission_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          category?: Database["public"]["Enums"]["service_category"]
          created_at?: string | null
          description_en?: string | null
          description_th?: string | null
          duration?: number
          duration_options?: Json | null
          hotel_price?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name_en?: string
          name_th?: string
          price_120?: number | null
          price_60?: number | null
          price_90?: number | null
          slug?: string | null
          sort_order?: number | null
          staff_commission_rate?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      skills: {
        Row: {
          category: Database["public"]["Enums"]["service_category"]
          created_at: string | null
          icon: string | null
          id: string
          name_en: string
          name_th: string
        }
        Insert: {
          category: Database["public"]["Enums"]["service_category"]
          created_at?: string | null
          icon?: string | null
          id?: string
          name_en: string
          name_th: string
        }
        Update: {
          category?: Database["public"]["Enums"]["service_category"]
          created_at?: string | null
          icon?: string | null
          id?: string
          name_en?: string
          name_th?: string
        }
        Relationships: []
      }
      sos_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          booking_id: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          latitude: number | null
          location_accuracy: number | null
          longitude: number | null
          message: string | null
          priority: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          staff_id: string | null
          status: string | null
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          booking_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          latitude?: number | null
          location_accuracy?: number | null
          longitude?: number | null
          message?: string | null
          priority?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          staff_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          booking_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          latitude?: number | null
          location_accuracy?: number | null
          longitude?: number | null
          message?: string | null
          priority?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          staff_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sos_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sos_alerts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sos_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sos_alerts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_reports: {
        Row: {
          created_at: string | null
          id: string
          job_id: string | null
          latitude: number | null
          longitude: number | null
          message: string | null
          notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          staff_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          latitude?: number | null
          longitude?: number | null
          message?: string | null
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          staff_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          latitude?: number | null
          longitude?: number | null
          message?: string | null
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          staff_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sos_reports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sos_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sos_reports_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          address: string | null
          avatar_url: string | null
          bank_account: string | null
          bank_account_name: string | null
          bank_name: string | null
          bio_en: string | null
          bio_th: string | null
          created_at: string | null
          current_location_lat: number | null
          current_location_lng: number | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          gender: string | null
          hotel_id: string | null
          id: string
          id_card: string | null
          invite_token: string | null
          invite_token_expires_at: string | null
          is_active: boolean | null
          is_available: boolean | null
          name_en: string | null
          name_th: string
          payout_schedule: string | null
          phone: string
          profile_id: string | null
          rating: number | null
          reminder_minutes: Json | null
          reminders_enabled: boolean | null
          specializations: string[] | null
          status: Database["public"]["Enums"]["staff_status"] | null
          total_earnings: number | null
          total_jobs: number | null
          total_reviews: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_name?: string | null
          bio_en?: string | null
          bio_th?: string | null
          created_at?: string | null
          current_location_lat?: number | null
          current_location_lng?: number | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          gender?: string | null
          hotel_id?: string | null
          id?: string
          id_card?: string | null
          invite_token?: string | null
          invite_token_expires_at?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          name_en?: string | null
          name_th: string
          payout_schedule?: string | null
          phone: string
          profile_id?: string | null
          rating?: number | null
          reminder_minutes?: Json | null
          reminders_enabled?: boolean | null
          specializations?: string[] | null
          status?: Database["public"]["Enums"]["staff_status"] | null
          total_earnings?: number | null
          total_jobs?: number | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_name?: string | null
          bio_en?: string | null
          bio_th?: string | null
          created_at?: string | null
          current_location_lat?: number | null
          current_location_lng?: number | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          gender?: string | null
          hotel_id?: string | null
          id?: string
          id_card?: string | null
          invite_token?: string | null
          invite_token_expires_at?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          name_en?: string | null
          name_th?: string
          payout_schedule?: string | null
          phone?: string
          profile_id?: string | null
          rating?: number | null
          reminder_minutes?: Json | null
          reminders_enabled?: boolean | null
          specializations?: string[] | null
          status?: Database["public"]["Enums"]["staff_status"] | null
          total_earnings?: number | null
          total_jobs?: number | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_applications: {
        Row: {
          application_date: string | null
          approved_at: string | null
          created_at: string | null
          email: string | null
          experience_years: number | null
          full_name: string
          id: string
          line_display_name: string | null
          line_picture_url: string | null
          line_user_id: string
          phone_number: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          skills: string[]
          status: string
          updated_at: string | null
        }
        Insert: {
          application_date?: string | null
          approved_at?: string | null
          created_at?: string | null
          email?: string | null
          experience_years?: number | null
          full_name: string
          id?: string
          line_display_name?: string | null
          line_picture_url?: string | null
          line_user_id: string
          phone_number: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          skills?: string[]
          status?: string
          updated_at?: string | null
        }
        Update: {
          application_date?: string | null
          approved_at?: string | null
          created_at?: string | null
          email?: string | null
          experience_years?: number | null
          full_name?: string
          id?: string
          line_display_name?: string | null
          line_picture_url?: string | null
          line_user_id?: string
          phone_number?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          skills?: string[]
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      staff_documents: {
        Row: {
          created_at: string
          document_type: string
          expires_at: string | null
          file_name: string
          file_size: number
          file_url: string
          id: string
          mime_type: string
          notes: string | null
          rejection_reason: string | null
          staff_id: string
          updated_at: string
          uploaded_at: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          expires_at?: string | null
          file_name: string
          file_size: number
          file_url: string
          id?: string
          mime_type: string
          notes?: string | null
          rejection_reason?: string | null
          staff_id: string
          updated_at?: string
          uploaded_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          expires_at?: string | null
          file_name?: string
          file_size?: number
          file_url?: string
          id?: string
          mime_type?: string
          notes?: string | null
          rejection_reason?: string | null
          staff_id?: string
          updated_at?: string
          uploaded_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_documents_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_documents_audit: {
        Row: {
          changed_at: string
          changed_by: string
          document_id: string | null
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
          rejection_reason: string | null
        }
        Insert: {
          changed_at?: string
          changed_by: string
          document_id?: string | null
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
          rejection_reason?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          document_id?: string | null
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
          rejection_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_documents_audit_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "staff_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_performance_metrics: {
        Row: {
          accepted_job_offers: number | null
          avg_rating: number | null
          avg_response_time_minutes: number | null
          cancel_rate: number | null
          cancelled_jobs: number | null
          completed_jobs: number | null
          completion_rate: number | null
          created_at: string | null
          id: string
          mid_service_cancellations: number | null
          month: number
          pending_jobs: number | null
          performance_score: number | null
          response_rate: number | null
          staff_id: string
          total_earnings: number | null
          total_job_offers: number | null
          total_jobs: number | null
          total_ratings: number | null
          updated_at: string | null
          year: number
        }
        Insert: {
          accepted_job_offers?: number | null
          avg_rating?: number | null
          avg_response_time_minutes?: number | null
          cancel_rate?: number | null
          cancelled_jobs?: number | null
          completed_jobs?: number | null
          completion_rate?: number | null
          created_at?: string | null
          id?: string
          mid_service_cancellations?: number | null
          month: number
          pending_jobs?: number | null
          performance_score?: number | null
          response_rate?: number | null
          staff_id: string
          total_earnings?: number | null
          total_job_offers?: number | null
          total_jobs?: number | null
          total_ratings?: number | null
          updated_at?: string | null
          year: number
        }
        Update: {
          accepted_job_offers?: number | null
          avg_rating?: number | null
          avg_response_time_minutes?: number | null
          cancel_rate?: number | null
          cancelled_jobs?: number | null
          completed_jobs?: number | null
          completion_rate?: number | null
          created_at?: string | null
          id?: string
          mid_service_cancellations?: number | null
          month?: number
          pending_jobs?: number | null
          performance_score?: number | null
          response_rate?: number | null
          staff_id?: string
          total_earnings?: number | null
          total_job_offers?: number | null
          total_jobs?: number | null
          total_ratings?: number | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "staff_performance_metrics_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          application_id: string | null
          created_at: string | null
          email: string | null
          experience_years: number | null
          full_name: string
          id: string
          is_active: boolean | null
          is_available: boolean | null
          last_active_at: string | null
          line_user_id: string
          phone_number: string
          rating: number | null
          skills: string[]
          total_jobs: number | null
          updated_at: string | null
        }
        Insert: {
          application_id?: string | null
          created_at?: string | null
          email?: string | null
          experience_years?: number | null
          full_name: string
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          last_active_at?: string | null
          line_user_id: string
          phone_number: string
          rating?: number | null
          skills?: string[]
          total_jobs?: number | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string | null
          created_at?: string | null
          email?: string | null
          experience_years?: number | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          last_active_at?: string | null
          line_user_id?: string
          phone_number?: string
          rating?: number | null
          skills?: string[]
          total_jobs?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      staff_service_areas: {
        Row: {
          created_at: string | null
          district: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          postal_code: string | null
          province: string
          radius_km: number
          staff_id: string
          subdistrict: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          district?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          postal_code?: string | null
          province: string
          radius_km?: number
          staff_id: string
          subdistrict?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          district?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          postal_code?: string | null
          province?: string
          radius_km?: number
          staff_id?: string
          subdistrict?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_service_areas_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_skills: {
        Row: {
          created_at: string | null
          id: string
          level: Database["public"]["Enums"]["skill_level"] | null
          skill_id: string
          staff_id: string
          years_experience: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          level?: Database["public"]["Enums"]["skill_level"] | null
          skill_id: string
          staff_id: string
          years_experience?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: Database["public"]["Enums"]["skill_level"] | null
          skill_id?: string
          staff_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_skills_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_information: {
        Row: {
          address_line: string
          branch_code: string | null
          company_name: string | null
          created_at: string | null
          customer_id: string
          district: string | null
          id: string
          province: string
          subdistrict: string | null
          tax_id: string
          tax_type: string
          updated_at: string | null
          zipcode: string
        }
        Insert: {
          address_line: string
          branch_code?: string | null
          company_name?: string | null
          created_at?: string | null
          customer_id: string
          district?: string | null
          id?: string
          province: string
          subdistrict?: string | null
          tax_id: string
          tax_type: string
          updated_at?: string | null
          zipcode: string
        }
        Update: {
          address_line?: string
          branch_code?: string | null
          company_name?: string | null
          created_at?: string | null
          customer_id?: string
          district?: string | null
          id?: string
          province?: string
          subdistrict?: string | null
          tax_id?: string
          tax_type?: string
          updated_at?: string | null
          zipcode?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_information_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      thai_districts: {
        Row: {
          district_code: number | null
          id: number
          name_en: string
          name_th: string
          province_id: number
        }
        Insert: {
          district_code?: number | null
          id?: number
          name_en: string
          name_th: string
          province_id: number
        }
        Update: {
          district_code?: number | null
          id?: number
          name_en?: string
          name_th?: string
          province_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "thai_districts_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "thai_provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      thai_provinces: {
        Row: {
          id: number
          name_en: string
          name_th: string
          province_code: number | null
        }
        Insert: {
          id?: number
          name_en: string
          name_th: string
          province_code?: number | null
        }
        Update: {
          id?: number
          name_en?: string
          name_th?: string
          province_code?: number | null
        }
        Relationships: []
      }
      thai_subdistricts: {
        Row: {
          district_id: number
          id: number
          name_en: string
          name_th: string
          zipcode: string
        }
        Insert: {
          district_id: number
          id?: number
          name_en: string
          name_th: string
          zipcode: string
        }
        Update: {
          district_id?: number
          id?: number
          name_en?: string
          name_th?: string
          zipcode?: string
        }
        Relationships: [
          {
            foreignKeyName: "thai_subdistricts_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "thai_districts"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          booking_id: string
          card_brand: string | null
          card_last_digits: string | null
          created_at: string | null
          currency: string | null
          customer_id: string
          description: string
          id: string
          metadata: Json | null
          omise_charge_id: string | null
          omise_transaction_id: string | null
          paid_at: string | null
          payment_method: string
          payment_provider: string | null
          receipt_number: string | null
          receipt_url: string | null
          refunded_at: string | null
          status: string | null
          transaction_number: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          card_brand?: string | null
          card_last_digits?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id: string
          description: string
          id?: string
          metadata?: Json | null
          omise_charge_id?: string | null
          omise_transaction_id?: string | null
          paid_at?: string | null
          payment_method: string
          payment_provider?: string | null
          receipt_number?: string | null
          receipt_url?: string | null
          refunded_at?: string | null
          status?: string | null
          transaction_number?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          card_brand?: string | null
          card_last_digits?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string
          description?: string
          id?: string
          metadata?: Json | null
          omise_charge_id?: string | null
          omise_transaction_id?: string | null
          paid_at?: string | null
          payment_method?: string
          payment_provider?: string | null
          receipt_number?: string | null
          receipt_url?: string | null
          refunded_at?: string | null
          status?: string | null
          transaction_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      booking_provider_preference_stats: {
        Row: {
          assigned_count: number | null
          assignment_success_rate: number | null
          booking_count: number | null
          provider_preference: string | null
        }
        Relationships: []
      }
      staff_earnings_summary: {
        Row: {
          pending_payout: number | null
          staff_id: string | null
          total_jobs: number | null
          total_paid: number | null
          total_payouts: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_staff_application_v2: {
        Args: { p_admin_id: string; p_application_id: string }
        Returns: {
          line_user_id: string
          staff_profile_id: string
          success: boolean
        }[]
      }
      calculate_growth: {
        Args: { current_value: number; previous_value: number }
        Returns: number
      }
      calculate_job_totals: {
        Args: { job_id: string }
        Returns: {
          total_duration: number
          total_earnings: number
        }[]
      }
      calculate_staff_performance: {
        Args: { p_month: number; p_staff_id: string; p_year: number }
        Returns: undefined
      }
      create_coupon_codes_for_promotion: {
        Args: { count?: number; promotion_id_param: string }
        Returns: {
          code: string
        }[]
      }
      create_customer_notification: {
        Args: {
          p_booking_id: string
          p_data?: Json
          p_message: string
          p_notification_type: string
          p_title: string
        }
        Returns: undefined
      }
      create_service: {
        Args: {
          p_base_price?: number
          p_category?: string
          p_description_en?: string
          p_description_th?: string
          p_duration?: number
          p_hotel_price?: number
          p_image_url?: string
          p_name_en: string
          p_name_th: string
          p_sort_order?: number
        }
        Returns: string
      }
      debug_staff_data: {
        Args: never
        Returns: {
          count_records: number
          info_type: string
          sample_data: string
          table_name: string
        }[]
      }
      delete_service: { Args: { p_id: string }; Returns: boolean }
      generate_booking_number: { Args: never; Returns: string }
      generate_coupon_code: {
        Args: { length?: number; prefix?: string }
        Returns: string
      }
      generate_document_number: { Args: { p_prefix: string }; Returns: string }
      generate_hotel_slug: { Args: { hotel_name_en: string }; Returns: string }
      generate_transaction_number: { Args: never; Returns: string }
      get_advanced_sales_metrics: {
        Args: { period_days?: number }
        Returns: {
          accounts_receivable: number
          average_order_value: number
          cancellation_rate: number
          cash_flow: number
          completion_rate: number
          conversion_rate: number
          customer_growth_rate: number
          gross_margin_percent: number
          gross_revenue: number
          net_revenue: number
          order_growth_rate: number
          payment_collection_rate: number
          projected_revenue: number
          refunds_total: number
          revenue_growth_rate: number
          revenue_per_customer: number
          target_achievement_percent: number
          variance_from_forecast: number
        }[]
      }
      get_available_staff_for_booking: {
        Args: {
          booking_date: string
          booking_time: string
          duration_minutes: number
          exclude_booking_id?: string
          hotel_id?: string
          provider_preference?: string
        }
        Returns: {
          gender: string
          id: string
          is_available: boolean
          name_en: string
          name_th: string
          preference_match_priority: number
          specializations: string[]
        }[]
      }
      get_booking_extension_summary: {
        Args: { booking_id_param: string }
        Returns: {
          extension_services_count: number
          first_extension_at: string
          last_extension_at: string
          original_services_count: number
          total_duration: number
          total_extension_price: number
          total_original_price: number
        }[]
      }
      get_bookings_by_area: {
        Args: { area_limit?: number; period_days?: number }
        Returns: {
          area_name: string
          area_type: string
          avg_booking_value: number
          completed_bookings: number
          completion_rate: number
          growth_rate: number
          top_services: string[]
          total_bookings: number
          total_revenue: number
          unique_customers: number
        }[]
      }
      get_customer_behavior_analytics: {
        Args: { period_days?: number }
        Returns: {
          avg_bookings_per_customer: number
          avg_customer_lifetime_value: number
          avg_time_between_bookings: number
          churn_rate: number
          clv_growth: number
          customer_retention_rate: number
          new_customer_growth: number
          new_customers: number
          repeat_booking_rate: number
          returning_customer_growth: number
          returning_customers: number
          total_customers: number
        }[]
      }
      get_customer_satisfaction_metrics: {
        Args: { period_days?: number }
        Returns: {
          avg_rating: number
          avg_rating_growth: number
          nps_score: number
          review_growth: number
          satisfaction_rate: number
          total_reviews: number
        }[]
      }
      get_customer_segments: {
        Args: { period_days?: number }
        Returns: {
          avg_booking_value: number
          avg_bookings_per_customer: number
          customer_count: number
          percentage_of_total: number
          segment_name: string
          total_revenue: number
        }[]
      }
      get_dashboard_stats: {
        Args: { period_days?: number }
        Returns: {
          avg_booking_value: number
          avg_value_growth: number
          bookings_growth: number
          new_customers: number
          new_customers_growth: number
          revenue_growth: number
          total_bookings: number
          total_revenue: number
        }[]
      }
      get_hotel_performance_detailed: {
        Args: { period_days?: number }
        Returns: {
          address: string
          avg_booking_value: number
          avg_rating: number
          avg_service_duration: number
          booking_growth: number
          cancellation_rate: number
          cancelled_bookings: number
          commission_earned: number
          commission_rate: number
          completed_bookings: number
          completion_rate: number
          customer_growth: number
          customer_retention_rate: number
          hotel_id: string
          hotel_name: string
          most_popular_services: string[]
          negative_reviews: number
          new_customers: number
          peak_booking_hours: number[]
          phone: string
          positive_reviews: number
          rank: number
          returning_customers: number
          revenue_growth: number
          staff_count: number
          top_staff_names: string[]
          total_bookings: number
          total_revenue: number
          total_reviews: number
          unique_customers: number
        }[]
      }
      get_monthly_service_trends: {
        Args: { period_days?: number }
        Returns: {
          bookings: number
          month_year: string
          rank_position: number
          revenue: number
          service_category: string
          service_name: string
        }[]
      }
      get_payment_method_analysis: {
        Args: { period_days?: number }
        Returns: {
          avg_transaction_value: number
          payment_method: string
          processing_fees_estimated: number
          success_rate: number
          total_amount: number
          transaction_count: number
        }[]
      }
      get_pending_extension_acknowledgments: {
        Args: { staff_profile_id: string }
        Returns: {
          acknowledgment_id: string
          booking_number: string
          booking_service_id: string
          customer_name: string
          duration: number
          extended_at: string
          job_id: string
          price: number
          service_name: string
        }[]
      }
      get_platform_averages: {
        Args: { p_month?: number; p_year?: number }
        Returns: {
          avg_cancel_rate: number
          avg_completion_rate: number
          avg_rating: number
          avg_response_rate: number
        }[]
      }
      get_promotion_stats: {
        Args: { promotion_id_param: string }
        Returns: {
          avg_discount: number
          total_discount: number
          total_usage: number
          unique_users: number
          usage_by_date: Json
        }[]
      }
      get_sales_channel_analysis: {
        Args: { period_days?: number }
        Returns: {
          avg_booking_value: number
          booking_count: number
          channel_name: string
          conversion_rate: number
          growth_rate: number
          market_share_percent: number
          revenue: number
        }[]
      }
      get_service_analytics: {
        Args: { days_range?: number; service_filter?: string }
        Returns: {
          average_rating: number
          avg_duration: number
          category: Database["public"]["Enums"]["service_category"]
          commission_earned: number
          growth_rate: number
          id: string
          last_7_days: number
          name_en: string
          name_th: string
          peak_hour: string
          popularity_rank: number
          total_bookings: number
          total_revenue: number
        }[]
      }
      get_service_revenue_by_category: {
        Args: { period_days?: number }
        Returns: {
          avg_price: number
          category: string
          category_th: string
          completion_rate: number
          growth_rate: number
          top_service_name: string
          total_bookings: number
          total_revenue: number
        }[]
      }
      get_service_review_stats: {
        Args: { p_service_id?: string }
        Returns: {
          avg_cleanliness: number
          avg_professionalism: number
          avg_rating: number
          avg_skill: number
          review_count: number
          service_id: string
        }[]
      }
      get_services_by_category: {
        Args: { p_category?: string }
        Returns: {
          base_price: number
          category: string
          created_at: string
          description_en: string
          description_th: string
          duration: number
          hotel_price: number
          id: string
          image_url: string
          is_active: boolean
          name_en: string
          name_th: string
          sort_order: number
          updated_at: string
        }[]
      }
      get_staff_earnings_detailed: {
        Args: { period_days?: number }
        Returns: {
          base_earn: number
          bonus_earn: number
          commission: number
          facial_earn: number
          growth: number
          id: string
          last_payout: string
          massage_earn: number
          nail_earn: number
          name_th: string
          net_earn: number
          next_payout: string
          pending: number
          spa_earn: number
          tax: number
          tips_earn: number
          total_earn: number
        }[]
      }
      get_staff_performance_detailed: {
        Args: { period_days?: number; staff_limit?: number }
        Returns: {
          avg_rating: number
          avg_service_price: number
          base_earnings: number
          booking_growth: number
          bookings_cancelled: number
          bookings_completed: number
          bookings_no_show: number
          cancellation_rate: number
          completion_rate: number
          email: string
          join_date: string
          last_active_date: string
          negative_reviews: number
          phone: string
          positive_reviews: number
          profile_image: string
          punctuality_score: number
          rank: number
          rating_growth: number
          response_time_hours: number
          revenue_growth: number
          services_per_day: number
          specializations: string[]
          staff_id: string
          staff_name: string
          status: string
          tips_earned: number
          total_earnings: number
          total_revenue_generated: number
          total_reviews: number
          working_days: number
        }[]
      }
      get_staff_rankings_by_metric: {
        Args: {
          metric_type?: string
          period_days?: number
          staff_limit?: number
        }
        Returns: {
          badge: string
          improvement: number
          metric_type_out: string
          metric_value: number
          profile_image: string
          rank: number
          staff_id: string
          staff_name: string
        }[]
      }
      get_time_based_revenue_analysis: {
        Args: { period_days?: number }
        Returns: {
          analysis_type: string
          avg_booking_value: number
          booking_count: number
          performance_score: number
          revenue: number
          time_period: string
        }[]
      }
      get_visible_reviews: {
        Args: { p_limit?: number; p_min_rating?: number; p_service_id?: string }
        Returns: {
          cleanliness_rating: number
          created_at: string
          customer_display_name: string
          id: string
          professionalism_rating: number
          rating: number
          review: string
          service_id: string
          service_name_en: string
          service_name_th: string
          skill_rating: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_own_staff: { Args: { staff_uuid: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      staff_login_check: {
        Args: { p_line_user_id: string }
        Returns: {
          full_name: string
          is_active: boolean
          is_approved: boolean
          rating: number
          role: string
          skills: string[]
          staff_profile_id: string
          total_jobs: number
        }[]
      }
      update_job_totals: { Args: { job_id: string }; Returns: undefined }
      update_service: {
        Args: {
          p_base_price?: number
          p_category?: string
          p_description_en?: string
          p_description_th?: string
          p_duration?: number
          p_hotel_price?: number
          p_id: string
          p_image_url?: string
          p_is_active?: boolean
          p_name_en?: string
          p_name_th?: string
          p_sort_order?: number
        }
        Returns: boolean
      }
      validate_provider_preference: {
        Args: { preference: string }
        Returns: boolean
      }
    }
    Enums: {
      booking_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      customer_status: "active" | "suspended" | "banned"
      hotel_status: "active" | "inactive" | "pending"
      job_payment_status: "pending" | "paid" | "refunded"
      job_status:
        | "pending"
        | "assigned"
        | "confirmed"
        | "traveling"
        | "arrived"
        | "in_progress"
        | "completed"
        | "cancelled"
      payment_method:
        | "cash"
        | "credit_card"
        | "promptpay"
        | "bank_transfer"
        | "other"
      payment_status: "pending" | "processing" | "paid" | "failed" | "refunded"
      payout_status: "pending" | "processing" | "completed" | "failed"
      service_category: "massage" | "nail" | "spa" | "facial"
      skill_level: "beginner" | "intermediate" | "advanced" | "expert"
      staff_status: "active" | "inactive" | "pending"
      user_role: "ADMIN" | "CUSTOMER" | "HOTEL" | "STAFF"
      user_status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION"
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
    Enums: {
      booking_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      customer_status: ["active", "suspended", "banned"],
      hotel_status: ["active", "inactive", "pending"],
      job_payment_status: ["pending", "paid", "refunded"],
      job_status: [
        "pending",
        "assigned",
        "confirmed",
        "traveling",
        "arrived",
        "in_progress",
        "completed",
        "cancelled",
      ],
      payment_method: [
        "cash",
        "credit_card",
        "promptpay",
        "bank_transfer",
        "other",
      ],
      payment_status: ["pending", "processing", "paid", "failed", "refunded"],
      payout_status: ["pending", "processing", "completed", "failed"],
      service_category: ["massage", "nail", "spa", "facial"],
      skill_level: ["beginner", "intermediate", "advanced", "expert"],
      staff_status: ["active", "inactive", "pending"],
      user_role: ["ADMIN", "CUSTOMER", "HOTEL", "STAFF"],
      user_status: ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING_VERIFICATION"],
    },
  },
} as const
