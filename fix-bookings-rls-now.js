#!/usr/bin/env node

/**
 * Fix Bookings RLS NOW
 * Hotel users can't create bookings - RLS policy blocking INSERT
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function fixBookingsRLS() {
  console.log('🚨 FIXING BOOKINGS RLS POLICY...')

  try {
    // Test current bookings access
    console.log('1. 🧪 Testing current bookings access...')
    const { data: testBooking, error: testError } = await supabase
      .from('bookings')
      .select('id')
      .limit(1)

    if (testError) {
      console.log('   ❌ Service role cannot access bookings:', testError.message)
    } else {
      console.log('   ✅ Service role can read bookings')
    }

    // Check current policies on bookings
    console.log('2. 📋 Checking current policies on bookings table...')
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

    // Try to fix via manual Dashboard approach
    console.log('\n🛠️  MANUAL FIX REQUIRED:')
    console.log('   Go to: https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/auth/policies')
    console.log('   Find: bookings table')
    console.log('   Problem: INSERT policy missing or blocking hotel users')

    console.log('\n📝 CREATE NEW POLICY:')
    console.log('   1. Click "New Policy" on bookings table')
    console.log('   2. Policy Name: "hotel_users_can_create_bookings"')
    console.log('   3. Operation: INSERT')
    console.log('   4. Target roles: authenticated')
    console.log('   5. Policy: true')
    console.log('   6. Save')

    console.log('\n🎯 OR QUICK FIX:')
    console.log('   Temporarily DISABLE RLS on bookings table')
    console.log('   (Just like we discussed for services)')

    // Try to create a test booking to see exact error
    console.log('\n🧪 Testing booking creation...')
    try {
      const { data: newBooking, error: createError } = await supabase
        .from('bookings')
        .insert({
          service_id: '550e8400-e29b-41d4-a716-446655440000',
          customer_name: 'Test Customer',
          status: 'pending'
        })
        .select()

      if (createError) {
        console.log('   ❌ Booking creation failed:', createError.message)
        console.log('   📋 Error code:', createError.code)
      } else {
        console.log('   ✅ Booking creation successful (service role)')
      }
    } catch (e) {
      console.log('   ❌ Exception:', e.message)
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

fixBookingsRLS()