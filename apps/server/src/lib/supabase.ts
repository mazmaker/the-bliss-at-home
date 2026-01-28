/**
 * Shared Supabase Client
 * Centralized Supabase client with lazy initialization
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Missing Supabase credentials. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file'
      )
    }

    supabaseInstance = createClient(supabaseUrl, supabaseKey)
    console.log('✅ Supabase client initialized')
  }

  return supabaseInstance
}
