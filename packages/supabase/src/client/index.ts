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
      flowType: 'implicit', // Use implicit flow to match auth client
      storage: window?.localStorage,
      storageKey: 'bliss-customer-auth', // Match the auth client storage key
      debug: false, // Disable debug logs in production
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
 * Implements singleton pattern to avoid multiple client instances
 * Uses window object to survive HMR reloads
 */
declare global {
  interface Window {
    __supabaseClient?: SupabaseClient<Database>
  }
}

export function getBrowserClient(): SupabaseClient<Database> {
  // Check if instance already exists (survives HMR reloads)
  if (typeof window !== 'undefined' && window.__supabaseClient) {
    return window.__supabaseClient
  }

  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  console.log('🔌 Creating new Supabase browser client instance')
  const client = createSupabaseClient({ url, anonKey })

  // Store in window to survive HMR reloads
  if (typeof window !== 'undefined') {
    window.__supabaseClient = client
  }

  return client
}
