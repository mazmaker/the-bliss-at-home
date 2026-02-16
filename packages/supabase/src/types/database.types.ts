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
        ]
      }
      booking_services: {
        Row: {
          booking_id: string
          created_at: string
          duration: number
          id: string
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
          id?: string
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
          id?: string
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
          cancelled_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string | null
          customer_id: string | null
          customer_notes: string | null
          discount_amount: number | null
          duration: number
          final_price: number
          hotel_id: string | null
          hotel_room_number: string | null
          id: string
          is_hotel_booking: boolean | null
          is_multi_service: boolean
          latitude: number | null
          longitude: number | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          promotion_id: string | null
          recipient_count: number | null
          service_format: string | null
          service_id: string
          staff_earnings: number | null
          staff_id: string | null
          staff_notes: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          tip_amount: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          base_price: number
          booking_date: string
          booking_number?: string
          booking_time: string
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          discount_amount?: number | null
          duration: number
          final_price: number
          hotel_id?: string | null
          hotel_room_number?: string | null
          id?: string
          is_hotel_booking?: boolean | null
          is_multi_service?: boolean
          latitude?: number | null
          longitude?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          promotion_id?: string | null
          recipient_count?: number | null
          service_format?: string | null
          service_id: string
          staff_earnings?: number | null
          staff_id?: string | null
          staff_notes?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          tip_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          base_price?: number
          booking_date?: string
          booking_number?: string
          booking_time?: string
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          discount_amount?: number | null
          duration?: number
          final_price?: number
          hotel_id?: string | null
          hotel_room_number?: string | null
          id?: string
          is_hotel_booking?: boolean | null
          is_multi_service?: boolean
          latitude?: number | null
          longitude?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          promotion_id?: string | null
          recipient_count?: number | null
          service_format?: string | null
          service_id?: string
          staff_earnings?: number | null
          staff_id?: string | null
          staff_notes?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          tip_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
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
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string | null
          customer_avatar_url: string | null
          customer_id: string
          customer_name: string
          customer_notes: string | null
          customer_phone: string | null
          distance_km: number | null
          duration_minutes: number
          hotel_id: string | null
          hotel_name: string | null
          id: string
          latitude: number | null
          longitude: number | null
          payment_status:
            | Database["public"]["Enums"]["job_payment_status"]
            | null
          room_number: string | null
          scheduled_date: string
          scheduled_time: string
          service_name: string
          service_name_en: string | null
          staff_earnings: number
          staff_id: string | null
          staff_notes: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"] | null
          tip_amount: number | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          address: string
          amount?: number
          booking_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_avatar_url?: string | null
          customer_id: string
          customer_name: string
          customer_notes?: string | null
          customer_phone?: string | null
          distance_km?: number | null
          duration_minutes?: number
          hotel_id?: string | null
          hotel_name?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          payment_status?:
            | Database["public"]["Enums"]["job_payment_status"]
            | null
          room_number?: string | null
          scheduled_date: string
          scheduled_time: string
          service_name: string
          service_name_en?: string | null
          staff_earnings?: number
          staff_id?: string | null
          staff_notes?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          tip_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          address?: string
          amount?: number
          booking_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_avatar_url?: string | null
          customer_id?: string
          customer_name?: string
          customer_notes?: string | null
          customer_phone?: string | null
          distance_km?: number | null
          duration_minutes?: number
          hotel_id?: string | null
          hotel_name?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          payment_status?:
            | Database["public"]["Enums"]["job_payment_status"]
            | null
          room_number?: string | null
          scheduled_date?: string
          scheduled_time?: string
          service_name?: string
          service_name_en?: string | null
          staff_earnings?: number
          staff_id?: string | null
          staff_notes?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          tip_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
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
          created_at: string | null
          gross_earnings: number
          id: string
          net_amount: number
          notes: string | null
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
          created_at?: string | null
          gross_earnings?: number
          id?: string
          net_amount?: number
          notes?: string | null
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
          created_at?: string | null
          gross_earnings?: number
          id?: string
          net_amount?: number
          notes?: string | null
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
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          language: string
          line_display_name: string | null
          line_picture_url: string | null
          line_user_id: string | null
          metadata: Json | null
          phone: string | null
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
          id?: string
          language?: string
          line_display_name?: string | null
          line_picture_url?: string | null
          line_user_id?: string | null
          metadata?: Json | null
          phone?: string | null
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
          id?: string
          language?: string
          line_display_name?: string | null
          line_picture_url?: string | null
          line_user_id?: string | null
          metadata?: Json | null
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
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
          id: string
          id_card: string | null
          invite_token: string | null
          invite_token_expires_at: string | null
          is_available: boolean | null
          name_en: string | null
          name_th: string
          phone: string
          profile_id: string | null
          rating: number | null
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
          id?: string
          id_card?: string | null
          invite_token?: string | null
          invite_token_expires_at?: string | null
          is_available?: boolean | null
          name_en?: string | null
          name_th: string
          phone: string
          profile_id?: string | null
          rating?: number | null
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
          id?: string
          id_card?: string | null
          invite_token?: string | null
          invite_token_expires_at?: string | null
          is_available?: boolean | null
          name_en?: string | null
          name_th?: string
          phone?: string
          profile_id?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["staff_status"] | null
          total_earnings?: number | null
          total_jobs?: number | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Relationships: []
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
          month: number
          pending_jobs: number | null
          performance_score: number | null
          response_rate: number | null
          staff_id: string
          total_earnings: number | null
          total_job_offers: number | null
          total_jobs: number | null
          total_ratings: number | null
          total_tips: number | null
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
          month: number
          pending_jobs?: number | null
          performance_score?: number | null
          response_rate?: number | null
          staff_id: string
          total_earnings?: number | null
          total_job_offers?: number | null
          total_jobs?: number | null
          total_ratings?: number | null
          total_tips?: number | null
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
          month?: number
          pending_jobs?: number | null
          performance_score?: number | null
          response_rate?: number | null
          staff_id?: string
          total_earnings?: number | null
          total_job_offers?: number | null
          total_jobs?: number | null
          total_ratings?: number | null
          total_tips?: number | null
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
          receipt_url?: string | null
          refunded_at?: string | null
          status?: string | null
          transaction_number?: string
          updated_at?: string | null
        }
        Relationships: [
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
      generate_hotel_slug: { Args: { hotel_name_en: string }; Returns: string }
      generate_transaction_number: { Args: never; Returns: string }
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
      is_admin: { Args: never; Returns: boolean }
      is_own_staff: { Args: { staff_uuid: string }; Returns: boolean }
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
