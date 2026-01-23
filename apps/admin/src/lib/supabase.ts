import { createClient } from '@supabase/supabase-js'
import { USE_MOCK_AUTH } from './mockAuth'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For Mock Auth mode, we'll bypass RLS by creating a special client
// that simulates admin access without actually needing real authentication
export const createMockAdminClient = () => {
  // In production, this would be a service role client
  // For now, we'll use the same client but with different error handling
  return supabase
}

// Export the appropriate client based on auth mode
export const adminSupabase = USE_MOCK_AUTH ? createMockAdminClient() : supabase

export default supabase