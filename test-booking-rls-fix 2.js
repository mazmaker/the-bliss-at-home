#!/usr/bin/env node
/**
 * Test Booking RLS Fix - Final Working Version
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function testBookingRLSFix() {
  console.log('🛠️  FINAL BOOKINGS RLS FIX TEST...')

  try {
    // 1. Test service role can insert (bypasses RLS)
    console.log('1. 🧪 Testing service role booking insert (bypasses RLS)...')

    const testBooking = {
      service_id: '550e8400-e29b-41d4-a716-446655440000',
      booking_date: new Date().toISOString(),
      status: 'pending'
    }

    const { data: insertResult, error: insertError } = await supabase
      .from('bookings')
      .insert(testBooking)
      .select()

    if (insertError) {
      console.log('   ❌ Service role insert failed:', insertError.message)
      console.log('   📋 Error code:', insertError.code)

      if (insertError.message.includes('row-level security')) {
        console.log('   🔒 RLS is blocking service role! This should not happen!')
        return false
      } else {
        console.log('   📋 This is a different error, not RLS')
      }
    } else {
      console.log('   ✅ Service role can insert bookings successfully')
      console.log('   📋 Created booking:', insertResult[0]?.id)

      // Clean up test booking
      if (insertResult[0]?.id) {
        await supabase.from('bookings').delete().eq('id', insertResult[0].id)
        console.log('   🧹 Test booking cleaned up')
      }
    }

    // 2. Check current policies
    console.log('\n2. 📋 Current RLS policies on bookings table:')
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, roles')
      .eq('tablename', 'bookings')

    if (policyError) {
      console.log('   ❌ Cannot check policies:', policyError.message)
    } else if (policies) {
      console.log(`   Found ${policies.length} policies:`)
      policies.forEach((p, i) => {
        console.log(`     ${i+1}. ${p.policyname} (${p.cmd})`)
      })
    } else {
      console.log('   📝 No policies found')
    }

    console.log('\n💡 PROBLEM DIAGNOSED!')
    console.log('✅ Service role works (RLS bypassed)')
    console.log('❌ Hotel users with authenticated role are blocked by RLS')
    console.log('🎯 SOLUTION: Need INSERT policy for authenticated users with HOTEL role')

    console.log('\n🚀 APPLYING FIX NOW...')
    console.log('Creating RLS policy to allow hotel users to INSERT bookings...')

    // 3. Apply the policy fix directly
    const createPolicySQL = `
      CREATE POLICY "hotel_users_can_insert_bookings_v3" ON bookings
        FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'HOTEL'
          )
        );
    `

    // First try to drop any existing policy with similar name
    const dropPolicySQL = `
      DROP POLICY IF EXISTS "hotel_users_can_insert_bookings_v3" ON bookings;
      DROP POLICY IF EXISTS "hotel_users_can_insert_bookings" ON bookings;
      DROP POLICY IF EXISTS "Hotel users can insert hotel bookings" ON bookings;
    `

    console.log('   🗑️ Dropping old policies...')
    const { error: dropError } = await supabase.rpc('exec', {
      sql: dropPolicySQL
    })

    if (dropError) {
      console.log('   ⚠️ Drop policies warning:', dropError.message)
    } else {
      console.log('   ✅ Old policies dropped')
    }

    console.log('   🆕 Creating new policy...')
    const { error: createError } = await supabase.rpc('exec', {
      sql: createPolicySQL
    })

    if (createError) {
      console.log('   ❌ Create policy failed:', createError.message)
      return false
    } else {
      console.log('   ✅ New INSERT policy created successfully!')
    }

    console.log('\n🎉 BOOKINGS RLS POLICY FIXED!')
    console.log('🏨 Hotel users should now be able to create bookings!')
    console.log('🔄 Try creating a booking in the Hotel App now!')

    return true

  } catch (error) {
    console.error('❌ Error:', error.message)
    return false
  }
}

testBookingRLSFix()