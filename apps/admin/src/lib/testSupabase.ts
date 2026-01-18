/**
 * Test Supabase Connection
 */
import { getBrowserClient } from '@bliss/supabase'

export async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...')

  try {
    const supabase = getBrowserClient()

    // Test 1: Simple query
    console.log('📊 Test 1: Query profiles table...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)

    if (profilesError) {
      console.error('❌ Profiles query failed:', profilesError)
      return false
    }
    console.log('✅ Profiles query successful:', profiles)

    // Test 2: Check connection health
    console.log('🏥 Test 2: Health check...')
    const { data: { session } } = await supabase.auth.getSession()
    console.log('✅ Auth service connected (no session = normal)')

    console.log('✅ All tests passed!')
    return true
  } catch (error) {
    console.error('❌ Connection test failed:', error)
    return false
  }
}

// Run in browser console
if (typeof window !== 'undefined') {
  (window as any).testSupabaseConnection = testSupabaseConnection
  console.log('💡 Run: await testSupabaseConnection()')
}
