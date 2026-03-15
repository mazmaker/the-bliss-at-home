/**
 * @bliss/supabase
 * Shared Supabase utilities for all apps
 */

// Auth module
export * from './auth'

// Payment module
export * from './payment'

// Jobs module
export * from './jobs'

// Earnings module
export * from './earnings'

// Staff module
export * from './staff'

// Services module
export * from './services'

// Hooks module
export * from './hooks'

// Client
export { createSupabaseClient, createSupabaseAdminClient, getBrowserClient } from './client'

// Hooks
export { useSupabaseQuery, useSupabaseMutation } from './hooks/useSupabaseQuery'

// Utils
export * from './utils/providerPreference'

// Types
export type { Database, Json } from './types/database.types'

// Type aliases (re-exported from auth/types.ts)
export type { UserRole, BookingStatus, PaymentStatus as AuthPaymentStatus, ProviderStatus } from './auth/types'
