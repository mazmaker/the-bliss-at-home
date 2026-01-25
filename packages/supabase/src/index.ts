/**
 * @bliss/supabase
 * Shared Supabase utilities for all apps
 */

// Auth module
export * from './auth'

// Client
export { createSupabaseClient, createSupabaseAdminClient, getBrowserClient } from './client'

// Hooks
export { useSupabaseQuery, useSupabaseMutation } from './hooks/useSupabaseQuery'

// Types
export type { Database, Json } from './types/database.types'

// Type aliases
export type { UserRole } from './auth/types'

// Jobs module
export * from './jobs'

// Earnings module
export * from './earnings'

// Staff module
export * from './staff'
