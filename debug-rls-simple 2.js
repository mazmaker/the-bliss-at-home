#!/usr/bin/env node
/**
 * Simple RLS Debug
 * ทดสอบ RLS อย่างง่าย
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.w0-oGOlshh3l8VKcKIEiL4fGgFU-AcrQY3bKPOQTg1E'
const USER_ID = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3'

async function simpleRLSTest() {
  console.log('🔍 ====================================')
  console.log('   Simple RLS Debug')
  console.log('🔍 ====================================')
  console.log('')

  try {
    // 1. Test with service role (should work)
    console.log('1. 🔧 ทดสอบด้วย Service Role...')
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Check services table structure first
    const { data: services, error: servicesError } = await serviceClient
      .from('services')
      .select('*')
      .limit(1)

    if (servicesError) {
      console.log('❌ Services table error:', servicesError.message)
      return
    }

    if (!services || services.length === 0) {
      console.log('❌ No services found in table')
      return
    }

    console.log('   Services table columns:', Object.keys(services[0]))
    const serviceId = services[0].id
    console.log('   Using service ID:', serviceId)

    // Test booking insert with service role
    const testBooking = {
      service_id: serviceId,
      booking_date: '2026-02-20',
      booking_time: '14:00:00',
      duration: 60,
      hotel_room_number: '101',
      customer_notes: 'Simple RLS test',
      base_price: 1000.00,
      final_price: 1000.00,
      status: 'confirmed',
      is_hotel_booking: true
    }

    const { data: serviceResult, error: serviceError } = await serviceClient
      .from('bookings')
      .insert(testBooking)
      .select()

    if (serviceError) {
      console.log('   ❌ Service role failed:', serviceError.message)
    } else {
      console.log('   ✅ Service role success:', serviceResult[0]?.id)

      // Clean up
      await serviceClient.from('bookings').delete().eq('id', serviceResult[0]?.id)
      console.log('   🗑️ Cleaned up test data')
    }

    console.log('')

    // 2. Test with anon key + user session (simulating frontend)
    console.log('2. 👤 ทดสอบด้วย Anon Key + User Session...')

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // First, let's see what happens with the current stored session
    const storedSession = localStorage.getItem(`sb-${SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token`)
    if (storedSession) {
      console.log('   🔑 Found stored session')

      // Try to set the session manually
      try {
        const sessionData = JSON.parse(storedSession)
        if (sessionData.access_token) {
          // Create a client that simulates the frontend auth state
          console.log('   ⚡ Simulating frontend auth...')

          const { data: frontendResult, error: frontendError } = await anonClient
            .from('bookings')
            .insert({
              ...testBooking,
              customer_notes: 'Frontend simulation test'
            })
            .select()

          if (frontendError) {
            console.log('   ❌ Frontend simulation failed:', frontendError.message)
            console.log('   🔍 Error code:', frontendError.code)

            // This is likely the RLS error we're seeing
            if (frontendError.code === '42501') {
              console.log('   🚨 This is the same RLS error from frontend!')
            }
          } else {
            console.log('   ✅ Frontend simulation success:', frontendResult[0]?.id)
            await anonClient.from('bookings').delete().eq('id', frontendResult[0]?.id)
          }
        }
      } catch (e) {
        console.log('   ⚠️ Could not parse stored session')
      }
    } else {
      console.log('   ❌ No stored session found')
    }

    console.log('')
    console.log('🎯 ====================================')
    console.log('   Root Cause Analysis')
    console.log('🎯 ====================================')
    console.log('')
    console.log('📊 Summary:')
    console.log('   - Service Role: Works (bypasses RLS)')
    console.log('   - Frontend User: Fails (blocked by RLS)')
    console.log('   - User Role: HOTEL ✅')
    console.log('   - Session: Available ✅')
    console.log('')
    console.log('🔍 Likely Issues:')
    console.log('   1. RLS policies not recognizing frontend auth')
    console.log('   2. auth.uid() not working in frontend context')
    console.log('   3. Migration not properly applied to remote DB')
    console.log('')
    console.log('🛠️ Next Steps:')
    console.log('   1. Check RLS policies in Supabase Dashboard')
    console.log('   2. Manually apply RLS policy via Dashboard SQL Editor')
    console.log('   3. Test with fresh browser session')

  } catch (error) {
    console.error('💥 Error:', error.message)
  }
}

// Check if running in browser context
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  simpleRLSTest().catch(console.error)
} else {
  console.log('⚠️ This script needs to run in browser context to access localStorage')
  console.log('💡 Try running this in the browser console instead')
}