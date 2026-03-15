/**
 * Supabase Client Configuration
 * Shared singleton instance across all apps
 * NOTE: This now uses the unified singleton from client/index.ts
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

// Declare global window type for singleton
declare global {
  interface Window {
    __supabaseClient?: SupabaseClient<Database>
  }
}

// Default values (can be overridden by environment variables)
const getDefaultUrl = () => {
  // Check if running in browser with import.meta.env
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_SUPABASE_URL || 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
  }
  return 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
}

const getDefaultAnonKey = () => {
  // Check if running in browser with import.meta.env
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'
  }
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'
}

const supabaseUrl = getDefaultUrl()
const supabaseAnonKey = getDefaultAnonKey()

// Create singleton instance with unified configuration
function createSingletonClient(): SupabaseClient<Database> {
  // Check if instance already exists (survives HMR reloads)
  if (typeof window !== 'undefined' && window.__supabaseClient) {
    return window.__supabaseClient
  }

  console.log('🔌 Creating unified Supabase client singleton')

  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true, // Enable to automatically handle OAuth callbacks
      flowType: 'pkce', // Use PKCE for better security
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'bliss-customer-auth', // Custom storage key to avoid conflicts
      debug: false, // Disable auth debugging in production
    },
    global: {
      headers: {
        'x-my-custom-header': 'customer-app',
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
    window.__supabaseClient = client
  }

  return client
}

// Export singleton instance
export const supabase = createSingletonClient()

// For server-side operations (service role)
export const createServiceClient = (serviceRoleKey?: string) => {
  const key = serviceRoleKey || (typeof import.meta !== 'undefined' && import.meta.env?.SUPABASE_SERVICE_ROLE_KEY)
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
