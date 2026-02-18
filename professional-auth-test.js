/**
 * Professional Authentication Test
 * Testing complete authentication flow from frontend to backend
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'
const API_BASE_URL = 'http://localhost:3000/api'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testProfessionalAuth() {
  console.log('🧪 Professional Authentication Test')
  console.log('==================================')

  try {
    // Step 1: Test Hotel Login
    console.log('\n1️⃣ Testing Hotel Login...')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test-hotel@thebliss.com',
      password: 'TestPassword123!'
    })

    if (error) {
      throw new Error(`Login failed: ${error.message}`)
    }

    const session = data.session
    if (!session?.access_token) {
      throw new Error('No access token received')
    }

    console.log('✅ Login successful')
    console.log(`   User ID: ${session.user.id}`)
    console.log(`   Access Token Length: ${session.access_token.length}`)

    // Step 2: Test Token Verification at Server
    console.log('\n2️⃣ Testing Server Token Verification...')
    const testBooking = {
      service_id: '123e4567-e89b-12d3-a456-426614174000',
      booking_date: '2026-02-20',
      booking_time: '14:00:00',
      duration: 120,
      base_price: 2000,
      final_price: 2000,
      status: 'pending',
      recipient_count: 1
    }

    const response = await fetch(`${API_BASE_URL}/secure-bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(testBooking)
    })

    const result = await response.json()

    if (response.ok) {
      console.log('✅ Professional Authentication Test PASSED!')
      console.log(`   Booking created: ${result.data.id}`)
      console.log('   Full authentication flow working correctly')
    } else {
      console.log('❌ Authentication Test FAILED')
      console.log(`   Status: ${response.status}`)
      console.log(`   Error: ${result.error}`)
      if (result.details) {
        console.log(`   Details: ${result.details}`)
      }
    }

    // Step 3: Cleanup test booking
    if (response.ok && result.data?.id) {
      console.log('\n3️⃣ Cleaning up test data...')
      // Use service role to clean up (would normally be done through API)
      console.log('   Test booking would be cleaned up in production')
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message)
  }

  console.log('\n==================================')
  console.log('🏁 Professional Authentication Test Complete')
}

// Run test
testProfessionalAuth()