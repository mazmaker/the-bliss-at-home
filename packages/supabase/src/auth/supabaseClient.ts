/**
 * Supabase Client Configuration
 * Shared singleton instance across all apps
 * NOTE: This now uses the unified singleton from client/index.ts
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'
import { ensureLiveSession } from './ensureLiveSession'

// Declare global window type for singleton
declare global {
  interface Window {
    __supabaseClient?: SupabaseClient<Database>
    __blissRealtimeWired?: boolean
  }
}

// Default values (can be overridden by environment variables)
const getDefaultUrl = () => {
  // Server environment (Node.js)
  if (typeof process !== 'undefined' && process.env) {
    return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
  }
  // Browser environment (only check import.meta since window check is already done)
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env.VITE_SUPABASE_URL || 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
    }
  } catch {
    // Ignore import.meta errors in server environment
  }
  return 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
}

const getDefaultAnonKey = () => {
  // Server environment (Node.js)
  if (typeof process !== 'undefined' && process.env) {
    return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'
  }
  // Browser environment (only check import.meta since window check is already done)
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env.VITE_SUPABASE_ANON_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'
    }
  } catch {
    // Ignore import.meta errors in server environment
  }
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'
}

const supabaseUrl = getDefaultUrl()
const supabaseAnonKey = getDefaultAnonKey()

// Create singleton instance with unified configuration
function createSingletonClient(): SupabaseClient<Database> {
  // Check if instance already exists (survives HMR reloads) - only in browser
  if (typeof window !== 'undefined') {
    if (window.__supabaseClient) {
      return window.__supabaseClient
    }
  }

  console.log('🔌 Creating unified Supabase client singleton')

  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true, // Enable to automatically handle OAuth callbacks
      flowType: 'pkce', // Use PKCE for better security
      storage: typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? window.localStorage : undefined,
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

  // Store in window to survive HMR reloads (browser only)
  if (typeof window !== 'undefined') {
    window.__supabaseClient = client
  }

  return client
}

// Export singleton instance
export const supabase = createSingletonClient()

// ─────────────────────────────────────────────────────────────────────────────
// v5 §2.4 + §2.2 — WebView realtime + resume session-resilience
// Harden the realtime auth source so a lapsed token NEVER silently downgrades the socket to the anon
// key (which keeps channels SUBSCRIBED-green but delivers 0 RLS rows / no "งานใหม่"). `accessToken` is
// a reassignable field read fresh on every heartbeat/join in realtime-js `_performAuth`; the callback
// returns the live/last-known-good token and never the anon key WHEN A SESSION EXISTS (an expired token
// errors the channel loudly and reconnects — better than a silent anon SUBSCRIBED-empty). On resume we
// call setAuth() with NO argument, which resets realtime-js out of the manual-token mode that
// supabase-js `_handleTokenChanged` forces on every SIGNED_IN/TOKEN_REFRESHED (in manual mode the 25s
// heartbeat SKIPS the callback). The resume nudge also re-primes REST via ensureLiveSession's
// single-flight. Fired on several triggers because the LINE WebView does not reliably fire
// visibilitychange.
// ─────────────────────────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  wireRealtimeResilience(supabase)
}

function wireRealtimeResilience(client: SupabaseClient<Database>) {
  // Idempotent across HMR reloads (the window singleton survives; don't stack listeners/overrides).
  if (window.__blissRealtimeWired) return
  window.__blissRealtimeWired = true

  try {
    ;(client.realtime as any).accessToken = async (): Promise<string> => {
      try {
        const r = await ensureLiveSession()
        // live / unknown → real or last-known-good token; anon (no session) → the anon key is legit.
        return r.token ?? supabaseAnonKey
      } catch {
        return supabaseAnonKey
      }
    }
  } catch (e) {
    console.warn('⚠️ [supabase] realtime.accessToken override failed', e)
  }

  const onResume = () => {
    void (async () => {
      try {
        await ensureLiveSession()
        // no-arg setAuth() → exit manual-token mode → heartbeat pulls the hardened callback again.
        await (client.realtime as any).setAuth()
      } catch {
        /* best-effort; the at-call-site ensureLiveSession is the real guarantee for REST reads */
      }
    })()
  }

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') onResume()
  })
  window.addEventListener('focus', onResume)
  window.addEventListener('online', onResume)
  window.addEventListener('pageshow', onResume)
}

// For server-side operations (service role)
export const createServiceClient = (serviceRoleKey?: string) => {
  let key = serviceRoleKey

  // Try to get service role key from environment
  if (!key) {
    // Server environment (Node.js)
    if (typeof process !== 'undefined' && process.env) {
      key = process.env.SUPABASE_SERVICE_ROLE_KEY
    }
    // Browser environment (fallback)
    else {
      try {
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
          key = (import.meta as any).env.SUPABASE_SERVICE_ROLE_KEY
        }
      } catch {
        // Ignore import.meta errors
      }
    }
  }

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
