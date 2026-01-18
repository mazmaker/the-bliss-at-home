/**
 * Supabase Client Factory
 * Creates configured Supabase clients for different use cases
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

/**
 * Client environment variables
 */
interface ClientConfig {
  url: string
  anonKey: string
}

/**
 * Create Supabase client for frontend use
 * Uses anon key - respects RLS policies
 */
export function createSupabaseClient(config: ClientConfig): SupabaseClient<Database> {
  return createClient<Database>(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce', // Recommended for SPAs
    },
  })
}

/**
 * Create Supabase admin client
 * WARNING: Only use on server-side - bypasses RLS!
 */
export function createSupabaseAdminClient(config: { url: string; serviceRoleKey: string }): SupabaseClient<Database> {
  return createClient<Database>(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * Get browser client (for Vite apps)
 */
export function getBrowserClient(): SupabaseClient<Database> {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createSupabaseClient({ url, anonKey })
}
