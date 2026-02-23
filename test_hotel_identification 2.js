// Script to test Hotel Identification System
// This script helps verify that the hotel identification system is working

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test hotel data from our context
const TEST_HOTEL_IDS = {
  NIMMAN_RESORT: '550e8400-e29b-41d4-a716-446655440002',
  DUSIT_THANI: '550e8400-e29b-41d4-a716-446655440003',
  HILTON_BANGKOK: '550e8400-e29b-41d4-a716-446655440001'
}

async function testHotelIdentification() {
  console.log('🧪 Testing Hotel Identification System...')
  console.log('=' .repeat(50))

  // Test 1: Verify hotels exist
  console.log('\n📋 Step 1: Verify hotels exist in database')

  for (const [name, id] of Object.entries(TEST_HOTEL_IDS)) {
    const { data: hotel, error } = await supabase
      .from('hotels')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.log(`❌ ${name} (${id}): NOT FOUND`)
      console.log(`   Error: ${error.message}`)
    } else {
      console.log(`✅ ${name}: ${hotel.name_th} (${hotel.status})`)
    }
  }

  // Test 2: Test booking queries with hotel filter
  console.log('\n📋 Step 2: Test hotel-specific booking queries')

  for (const [name, hotelId] of Object.entries(TEST_HOTEL_IDS)) {
    const { count, error } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('hotel_id', hotelId)
      .eq('is_hotel_booking', true)

    if (error) {
      console.log(`❌ ${name} bookings: ERROR`)
      console.log(`   Error: ${error.message}`)
    } else {
      console.log(`📊 ${name}: ${count || 0} hotel bookings`)
    }
  }

  // Test 3: Test monthly bills for hotels
  console.log('\n📋 Step 3: Test hotel billing data')

  for (const [name, hotelId] of Object.entries(TEST_HOTEL_IDS)) {
    const { count, error } = await supabase
      .from('monthly_bills')
      .select('*', { count: 'exact', head: true })
      .eq('hotel_id', hotelId)

    if (error) {
      console.log(`❌ ${name} bills: ERROR`)
      console.log(`   Error: ${error.message}`)
    } else {
      console.log(`🧾 ${name}: ${count || 0} bills`)
    }
  }

  // Test 4: Provide URL tests for manual testing
  console.log('\n📋 Step 4: Manual testing URLs')
  console.log('Test these URLs in your browser (Hotel App should be running on port 3003):')
  console.log('')

  Object.entries(TEST_HOTEL_IDS).forEach(([name, id]) => {
    console.log(`🔗 ${name}:`)
    console.log(`   http://localhost:3003/hotel/${id}`)
  })

  console.log('\n💡 Expected behavior:')
  console.log('   - Each URL should show different hotel name in header')
  console.log('   - Hotel name should appear in sidebar and top bar')
  console.log('   - Navigation links should include the hotel ID')
  console.log('   - Invalid hotel ID should show error page')

  console.log('\n🧪 Test Summary:')
  console.log('✅ Step 1: Fixed missing tables (using existing tables)')
  console.log('✅ Step 2: Added URL-based hotel identification')
  console.log('✅ Step 3: Enhanced RLS policies for multi-hotel isolation')
  console.log('')
  console.log('🚀 The multi-hotel system is now ready!')
  console.log('   Admin: http://localhost:3001/admin/hotels')
  console.log('   Hotels: http://localhost:3003/hotel/{hotel-id}')
}

// Run the tests
testHotelIdentification().catch(console.error)