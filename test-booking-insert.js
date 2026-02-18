#!/usr/bin/env node
/**
 * Test Booking Insert to Find Required Fields
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function testBookingInsert() {
  console.log('🧪 TESTING MINIMAL BOOKING INSERT...')

  // Try minimal booking first
  console.log('1. Trying minimal booking insert...')
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert({})
      .select()

    if (error) {
      console.log('❌ Minimal insert error:', error.message)
      console.log('📋 Error code:', error.code)
      console.log('📋 Error details:', error.details)
    } else {
      console.log('✅ Minimal insert worked:', data)
    }
  } catch (e) {
    console.log('❌ Exception:', e.message)
  }

  // Try with just service_id
  console.log('\n2. Trying with service_id only...')
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        service_id: '550e8400-e29b-41d4-a716-446655440000'
      })
      .select()

    if (error) {
      console.log('❌ Service_id only error:', error.message)
      console.log('📋 Error details:', error.details)
    } else {
      console.log('✅ Service_id only worked:', data)
      // Clean up if successful
      if (data[0]?.id) {
        await supabase.from('bookings').delete().eq('id', data[0].id)
        console.log('🧹 Test booking cleaned up')
      }
    }
  } catch (e) {
    console.log('❌ Exception:', e.message)
  }

  // Try with status
  console.log('\n3. Trying with service_id and status...')
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        service_id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'pending'
      })
      .select()

    if (error) {
      console.log('❌ With status error:', error.message)
      console.log('📋 Error details:', error.details)
    } else {
      console.log('✅ With status worked:', data)
      // Clean up if successful
      if (data[0]?.id) {
        await supabase.from('bookings').delete().eq('id', data[0].id)
        console.log('🧹 Test booking cleaned up')
      }
    }
  } catch (e) {
    console.log('❌ Exception:', e.message)
  }
}

testBookingInsert()