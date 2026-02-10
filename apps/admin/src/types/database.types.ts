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
          latitude: number | null
          longitude: number | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
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
          latitude?: number | null
          longitude?: number | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
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
          latitude?: number | null
          longitude?: number | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
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
            referencedRelation: "hotel_performance_summary"
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
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_popularity"
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
          {
            foreignKeyName: "bookings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_earnings_summary"
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
          total_bookings?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hotels: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_account_name: string | null
          bank_name: string | null
          commission_rate: number | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          monthly_revenue: number | null
          name_en: string
          name_th: string
          phone: string | null
          rating: number | null
          status: Database["public"]["Enums"]["hotel_status"] | null
          tax_id: string | null
          total_bookings: number | null
          total_reviews: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_name?: string | null
          commission_rate?: number | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          monthly_revenue?: number | null
          name_en: string
          name_th: string
          phone?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["hotel_status"] | null
          tax_id?: string | null
          total_bookings?: number | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_name?: string | null
          commission_rate?: number | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          monthly_revenue?: number | null
          name_en?: string
          name_th?: string
          phone?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["hotel_status"] | null
          tax_id?: string | null
          total_bookings?: number | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "monthly_bills_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotel_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_bills_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
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
      payouts: {
        Row: {
          created_at: string | null
          id: string
          month: number
          paid_at: string | null
          payout_number: string
          period_end: string
          period_start: string
          staff_id: string
          status: string | null
          total_amount: number | null
          total_bookings: number | null
          total_earnings: number | null
          total_tips: number | null
          transfer_receipt: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: number
          paid_at?: string | null
          payout_number: string
          period_end: string
          period_start: string
          staff_id: string
          status?: string | null
          total_amount?: number | null
          total_bookings?: number | null
          total_earnings?: number | null
          total_tips?: number | null
          transfer_receipt?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: number
          paid_at?: string | null
          payout_number?: string
          period_end?: string
          period_start?: string
          staff_id?: string
          status?: string | null
          total_amount?: number | null
          total_bookings?: number | null
          total_earnings?: number | null
          total_tips?: number | null
          transfer_receipt?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payouts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_earnings_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          language: string
          metadata: Json | null
          phone: string | null
          role: string
          status: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          language?: string
          metadata?: Json | null
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          language?: string
          metadata?: Json | null
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string | null
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
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "active_bookings"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "service_popularity"
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
          {
            foreignKeyName: "reviews_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_earnings_summary"
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
            referencedRelation: "service_popularity"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "service_popularity"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "service_popularity"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "service_popularity"
            referencedColumns: ["id"]
          },
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
          hotel_price: number
          id: string
          image_url: string | null
          is_active: boolean | null
          name_en: string
          name_th: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          base_price: number
          category: Database["public"]["Enums"]["service_category"]
          created_at?: string | null
          description_en?: string | null
          description_th?: string | null
          duration: number
          hotel_price: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name_en: string
          name_th: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          category?: Database["public"]["Enums"]["service_category"]
          created_at?: string | null
          description_en?: string | null
          description_th?: string | null
          duration?: number
          hotel_price?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name_en?: string
          name_th?: string
          sort_order?: number | null
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
          {
            foreignKeyName: "staff_skills_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_earnings_summary"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_bookings: {
        Row: {
          address: string | null
          admin_notes: string | null
          base_price: number | null
          booking_date: string | null
          booking_number: string | null
          booking_time: string | null
          cancelled_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          customer_notes: string | null
          customer_phone: string | null
          discount_amount: number | null
          duration: number | null
          final_price: number | null
          hotel_id: string | null
          hotel_name: string | null
          hotel_room_number: string | null
          id: string | null
          is_hotel_booking: boolean | null
          latitude: number | null
          longitude: number | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          service_id: string | null
          service_name: string | null
          service_name_en: string | null
          staff_earnings: number | null
          staff_id: string | null
          staff_name: string | null
          staff_notes: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          tip_amount: number | null
          updated_at: string | null
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
            referencedRelation: "hotel_performance_summary"
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
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_popularity"
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
          {
            foreignKeyName: "bookings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_earnings_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_revenue: {
        Row: {
          completed_bookings: number | null
          date: string | null
          revenue: number | null
          total_bookings: number | null
        }
        Relationships: []
      }
      hotel_performance_summary: {
        Row: {
          average_rating: number | null
          commission_rate: number | null
          id: string | null
          name_en: string | null
          name_th: string | null
          total_bookings: number | null
          total_revenue: number | null
          total_savings: number | null
        }
        Relationships: []
      }
      service_popularity: {
        Row: {
          average_rating: number | null
          category: Database["public"]["Enums"]["service_category"] | null
          id: string | null
          name_en: string | null
          name_th: string | null
          total_bookings: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      staff_earnings_summary: {
        Row: {
          average_rating: number | null
          id: string | null
          name_en: string | null
          name_th: string | null
          total_bookings: number | null
          total_earnings: number | null
          total_revenue: number | null
          total_tips: number | null
        }
        Relationships: []
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
      delete_service: { Args: { p_id: string }; Returns: boolean }
      generate_booking_number: { Args: never; Returns: string }
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
      hotel_status: "active" | "inactive" | "pending"
      payment_status: "pending" | "processing" | "paid" | "failed" | "refunded"
      service_category: "massage" | "nail" | "spa"
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
      hotel_status: ["active", "inactive", "pending"],
      payment_status: ["pending", "processing", "paid", "failed", "refunded"],
      service_category: ["massage", "nail", "spa"],
      skill_level: ["beginner", "intermediate", "advanced", "expert"],
      staff_status: ["active", "inactive", "pending"],
      user_role: ["ADMIN", "CUSTOMER", "HOTEL", "STAFF"],
      user_status: ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING_VERIFICATION"],
    },
  },
} as const
