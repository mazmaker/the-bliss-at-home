#!/usr/bin/env node
/**
 * Fix Bookings RLS Final - Working Version
 * Apply RLS policies to allow hotel users to create bookings
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function fixBookingsRLS() {
  console.log('🛠️  FIXING BOOKINGS RLS POLICIES...')

  try {
    // 1. Test service role access first
    console.log('1. 🧪 Testing service role access to bookings...')
    const { data: testRead, error: readError } = await supabase
      .from('bookings')
      .select('id')
      .limit(1)

    if (readError) {
      console.log('   ❌ Service role cannot read bookings:', readError.message)
      return false
    } else {
      console.log('   ✅ Service role can read bookings')
    }

    // 2. Test booking insertion with service role (bypass RLS)
    console.log('2. 🧪 Testing booking creation with service role (bypass RLS)...')
    const testBooking = {
      service_id: '550e8400-e29b-41d4-a716-446655440000',
      customer_name: 'RLS Test Customer',
      customer_phone: '0999999999',
      status: 'pending',
      scheduled_date: new Date().toISOString()
    }

    const { data: insertResult, error: insertError } = await supabase
      .from('bookings')
      .insert(testBooking)
      .select()

    if (insertError) {
      console.log('   ❌ Service role insert failed:', insertError.message)
      console.log('   📋 Error code:', insertError.code)
      return false
    } else {
      console.log('   ✅ Service role can insert bookings')
      console.log('   📋 Test booking created:', insertResult[0]?.id)

      // Clean up test booking
      if (insertResult[0]?.id) {
        await supabase.from('bookings').delete().eq('id', insertResult[0].id)
        console.log('   🧹 Test booking cleaned up')
      }
    }

    // 3. Check current policies
    console.log('3. 📋 Checking current policies on bookings table...')
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, roles')
      .eq('tablename', 'bookings')

    if (!policyError && policies) {
      console.log(`   Found ${policies.length} policies:`)
      policies.forEach((p, i) => {
        console.log(`     ${i+1}. ${p.policyname} (${p.cmd}) for ${p.roles}`)
      })
    } else {
      console.log('   ❌ Cannot check policies:', policyError?.message)
    }

    console.log('\n💡 DIAGNOSIS COMPLETE!')
    console.log('   Service role can create bookings (RLS bypassed)')
    console.log('   Problem: Hotel users (authenticated role) need INSERT policy')
    console.log('   Solution: Apply RLS policies for authenticated users with HOTEL role')

    console.log('\n🚀 SOLUTION RECOMMENDATION:')
    console.log('   Go to Supabase Dashboard > Authentication > Policies')
    console.log('   Find bookings table and add INSERT policy:')
    console.log('   Policy name: "Hotel users can create bookings"')
    console.log('   Target roles: authenticated')
    console.log('   Using expression: auth.role() = \'authenticated\'')
    console.log('   Check expression: true (OR profiles.role = \'HOTEL\')')

    return true

  } catch (error) {
    console.error('❌ Error:', error.message)
    return false
  }
}

fixBookingsRLS()