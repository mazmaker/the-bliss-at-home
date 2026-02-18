#!/usr/bin/env node
/**
 * Verify Booking Insert with All Required Fields
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function verifyBookingInsert() {
  console.log('🧪 VERIFYING BOOKING INSERT WITH ALL REQUIRED FIELDS...')

  try {
    // Create a complete booking object based on what we learned from error messages
    const now = new Date()
    const testBooking = {
      service_id: 'dd5b056a-ff2c-44ab-9262-99289fdea0ae',
      booking_date: now.toISOString(),
      booking_time: now.toTimeString().split(' ')[0], // HH:MM:SS format
      duration: 60, // 60 minutes
      base_price: 500.00, // 500 baht
      final_price: 500.00, // 500 baht (same as base price for this test)
      status: 'pending'
    }

    console.log('📝 Attempting to insert booking with:', testBooking)

    const { data: insertResult, error: insertError } = await supabase
      .from('bookings')
      .insert(testBooking)
      .select()

    if (insertError) {
      console.log('❌ Insert failed:', insertError.message)
      console.log('📋 Error code:', insertError.code)
      console.log('📋 Error details:', insertError.details)

      if (insertError.message.includes('row-level security')) {
        console.log('\n🔒 THIS IS AN RLS ISSUE!')
        console.log('Service role should bypass RLS, but it\'s being blocked.')
        console.log('This means there might be a policy issue.')
      } else if (insertError.code === '23502') {
        console.log('\n📋 MISSING REQUIRED FIELD!')
        console.log('We still need to add more required fields.')
      } else {
        console.log('\n❓ OTHER ISSUE:', insertError.message)
      }
    } else {
      console.log('✅ SUCCESS! Booking inserted with ID:', insertResult[0]?.id)
      console.log('📋 Full booking data:')
      console.log(JSON.stringify(insertResult[0], null, 2))

      // This confirms service role can bypass RLS
      console.log('\n✅ SERVICE ROLE CAN BYPASS RLS!')
      console.log('🎯 The issue is that authenticated users (Hotel users) are blocked')

      // Clean up test booking
      if (insertResult[0]?.id) {
        await supabase.from('bookings').delete().eq('id', insertResult[0].id)
        console.log('🧹 Test booking cleaned up')
      }

      console.log('\n💡 SOLUTION NEEDED:')
      console.log('Create RLS policy for authenticated users with HOTEL role')
      console.log('Policy should allow INSERT for users where profiles.role = \'HOTEL\'')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

verifyBookingInsert()