#!/usr/bin/env node
/**
 * Debug Hotel User Role - Check why RLS is still blocking
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function debugHotelUserRole() {
  console.log('🔍 DEBUGGING HOTEL USER ROLE...')

  const hotelUserId = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3'

  try {
    // 1. Check user's profile and role
    console.log('1. 🧑‍💼 Checking user profile and role...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', hotelUserId)
      .single()

    if (profileError) {
      console.log('   ❌ Profile error:', profileError.message)
    } else if (profile) {
      console.log('   ✅ Profile found:')
      console.log('     - ID:', profile.id)
      console.log('     - Email:', profile.email)
      console.log('     - Role:', profile.role)
      console.log('     - Full name:', profile.full_name)
      console.log('     - Hotel ID:', profile.hotel_id)
    } else {
      console.log('   ❌ No profile found!')
    }

    // 2. Check current RLS policies
    console.log('\n2. 📋 Checking current RLS policies...')
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, roles, qual, with_check')
      .eq('tablename', 'bookings')

    if (policyError) {
      console.log('   ❌ Policy check error:', policyError.message)
    } else if (policies) {
      console.log(`   Found ${policies.length} policies:`)
      policies.forEach((p, i) => {
        console.log(`     ${i+1}. ${p.policyname} (${p.cmd})`)
      })
    }

    // 3. Test the exact condition from our policy
    console.log('\n3. 🧪 Testing policy condition...')
    const { data: conditionTest, error: conditionError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', hotelUserId)
      .eq('role', 'HOTEL')

    if (conditionError) {
      console.log('   ❌ Condition test error:', conditionError.message)
    } else if (conditionTest && conditionTest.length > 0) {
      console.log('   ✅ Policy condition SHOULD work!')
      console.log('   📋 User has HOTEL role:', conditionTest[0])
    } else {
      console.log('   ❌ Policy condition FAILS!')
      console.log('   📋 User does NOT have HOTEL role')

      // Check what role they actually have
      const { data: actualRole } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', hotelUserId)
        .single()

      if (actualRole) {
        console.log('   📋 User\'s actual role:', actualRole.role)
        console.log('\n💡 SOLUTION NEEDED:')
        if (actualRole.role !== 'HOTEL') {
          console.log(`   Change user role from '${actualRole.role}' to 'HOTEL'`)
          console.log('   OR update policy to include role:', actualRole.role)
        }
      }
    }

    // 4. Try to simulate the exact RLS check
    console.log('\n4. 🎯 Simulating RLS check...')
    console.log('Policy condition:')
    console.log('EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = \'HOTEL\')')
    console.log()
    console.log('For user:', hotelUserId)

    const { data: rlsSimulation, error: rlsError } = await supabase
      .from('profiles')
      .select('1')
      .eq('id', hotelUserId)
      .eq('role', 'HOTEL')
      .limit(1)

    if (rlsError) {
      console.log('   ❌ RLS simulation error:', rlsError.message)
    } else if (rlsSimulation && rlsSimulation.length > 0) {
      console.log('   ✅ RLS condition PASSES!')
      console.log('   🤔 RLS should allow booking creation...')
      console.log('   📋 There might be another issue...')
    } else {
      console.log('   ❌ RLS condition FAILS!')
      console.log('   📋 This explains why booking creation is blocked')
    }

    console.log('\n📊 SUMMARY:')
    if (profile) {
      console.log(`User Role: ${profile.role}`)
      console.log(`Expected: HOTEL`)
      console.log(`Match: ${profile.role === 'HOTEL' ? '✅' : '❌'}`)

      if (profile.role !== 'HOTEL') {
        console.log('\n🔧 QUICK FIX:')
        console.log('UPDATE profiles SET role = \'HOTEL\' WHERE id = \'' + hotelUserId + '\';')
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

debugHotelUserRole()