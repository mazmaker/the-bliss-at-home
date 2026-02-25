#!/usr/bin/env node
/**
 * Test RLS auth.uid() function
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function testRLSAuthUID() {
  console.log('🔍 TESTING RLS AUTH.UID() ISSUE...')

  try {
    // 1. Check if policies are really there
    console.log('1. 🧪 Check if our policies exist (alternative method)...')

    // Try with system tables directly
    const { data: relationCheck, error: relationError } = await supabase
      .from('information_schema.table_constraints')
      .select('*')
      .eq('table_name', 'bookings')
      .limit(3)

    if (relationError) {
      console.log('   ❌ Cannot check table info:', relationError.message)
    } else {
      console.log('   ✅ Bookings table exists with constraints')
    }

    // 2. The real issue might be that RLS policies need to be recreated
    //    with a broader condition or auth.uid() isn't working as expected
    console.log('\n2. 💡 POTENTIAL SOLUTIONS:')
    console.log('   A) Auth.uid() might return null in this context')
    console.log('   B) RLS policy might not be applied properly')
    console.log('   C) There might be conflicting policies')
    console.log('   D) The policy needs auth.role() instead of profiles table join')

    // 3. Test different policy approaches
    console.log('\n3. 🔧 ALTERNATIVE POLICY SUGGESTIONS:')

    console.log('\n📝 OPTION 1: Simple authenticated user policy (most permissive):')
    console.log(`CREATE POLICY "allow_authenticated_bookings" ON bookings
  FOR INSERT TO authenticated
  WITH CHECK (true);`)

    console.log('\n📝 OPTION 2: Direct role check:')
    console.log(`CREATE POLICY "allow_hotel_role_bookings" ON bookings
  FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');`)

    console.log('\n📝 OPTION 3: Enhanced profile check:')
    console.log(`CREATE POLICY "enhanced_hotel_bookings" ON bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'HOTEL'
      AND p.email IS NOT NULL
    )
  );`)

    // 4. Quick test - create a test policy that should definitely work
    console.log('\n4. 🚀 RECOMMENDED IMMEDIATE FIX:')
    console.log('Try the simplest policy first to confirm RLS is the issue:')
    console.log()
    console.log('-- Temporary permissive policy for testing')
    console.log('DROP POLICY IF EXISTS "temp_allow_all_bookings" ON bookings;')
    console.log('CREATE POLICY "temp_allow_all_bookings" ON bookings')
    console.log('  FOR INSERT TO authenticated')
    console.log('  WITH CHECK (true);')
    console.log()
    console.log('If this works, then we know the issue is with our specific policy condition.')

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testRLSAuthUID()