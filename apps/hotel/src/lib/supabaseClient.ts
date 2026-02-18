/**
 * Hotel App Specific Supabase Client
 * ฟิกซ์ปัญหา auth storage key ที่ไม่ถูกต้อง
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@bliss/supabase/src/types/database.types'

// Declare global window type for singleton
declare global {
  interface Window {
    __hotelSupabaseClient?: SupabaseClient<Database>
  }
}

// Get configuration from environment
const getSupabaseUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_SUPABASE_URL || 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
  }
  return 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
}

const getSupabaseAnonKey = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'
  }
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'
}

// Create hotel-specific supabase client
function createHotelSupabaseClient(): SupabaseClient<Database> {
  // Check if instance already exists (survives HMR reloads)
  if (typeof window !== 'undefined' && window.__hotelSupabaseClient) {
    return window.__hotelSupabaseClient
  }

  console.log('🏨 Creating Hotel App specific Supabase client')

  const client = createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'bliss-customer-auth', // Use same storage key as AuthProvider for session compatibility
      debug: false,
    },
    global: {
      headers: {
        'x-my-custom-header': 'hotel-app',
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  })

  // Store in window to survive HMR reloads
  if (typeof window !== 'undefined') {
    window.__hotelSupabaseClient = client
  }

  return client
}

// Export hotel-specific supabase client
export const hotelSupabase = createHotelSupabaseClient()

// Default export for backward compatibility
export default hotelSupabase