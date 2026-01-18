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

// Type aliases (re-exported from auth/types.ts)
export type { UserRole, BookingStatus, PaymentStatus, ProviderStatus } from './auth/types'
