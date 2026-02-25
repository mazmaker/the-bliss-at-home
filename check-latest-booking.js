/**
 * 🔍 Check Latest Booking - BK20260220-0061
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 Checking booking: BK20260220-0061')

async function checkLatestBooking() {
  try {
    // Get the specific booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        hotel_id,
        created_by,
        created_at,
        hotels:hotel_id(name_th, hotel_slug),
        profiles:created_by(email, role, hotel_id)
      `)
      .eq('booking_number', 'BK20260220-0061')
      .single()

    if (bookingError) {
      console.log('❌ Booking not found:', bookingError.message)
      return
    }

    console.log('\n📋 Booking Details:')
    console.log(`   Booking Number: ${booking.booking_number}`)
    console.log(`   Hotel ID: ${booking.hotel_id}`)
    console.log(`   Hotel Name: ${booking.hotels?.name_th || 'Unknown'}`)
    console.log(`   Hotel Slug: ${booking.hotels?.hotel_slug || 'Unknown'}`)
    console.log(`   Created By: ${booking.created_by}`)
    console.log(`   User Email: ${booking.profiles?.email || 'Unknown'}`)
    console.log(`   User Hotel ID: ${booking.profiles?.hotel_id || 'NULL'}`)

    // Check user profile
    const userId = 'a127cc5a-e886-4c0c-86a1-e50b56c31fd0'
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        role,
        hotel_id,
        hotels:hotel_id(name_th, hotel_slug)
      `)
      .eq('id', userId)
      .single()

    if (!userError && userProfile) {
      console.log('\n👤 User Profile (Should Match):')
      console.log(`   Email: ${userProfile.email}`)
      console.log(`   Role: ${userProfile.role}`)
      console.log(`   Hotel ID: ${userProfile.hotel_id}`)
      console.log(`   Hotel: ${userProfile.hotels?.name_th || 'NOT MAPPED'}`)
    }

    // Compare
    console.log('\n🔍 Analysis:')
    if (booking.hotel_id === userProfile?.hotel_id) {
      console.log('✅ Hotel IDs match - this should be correct')
      console.log('🤔 Check why it appears in wrong hotel in admin')
    } else {
      console.log('❌ PROBLEM: Hotel IDs do not match!')
      console.log(`   Booking Hotel ID: ${booking.hotel_id}`)
      console.log(`   User Hotel ID: ${userProfile?.hotel_id}`)
      console.log('💡 Server is not using user hotel_id correctly')
    }

    // Get latest 3 bookings to see pattern
    console.log('\n📊 Latest 3 Bookings:')
    const { data: latestBookings } = await supabase
      .from('bookings')
      .select('booking_number, hotel_id, hotels:hotel_id(name_th)')
      .order('created_at', { ascending: false })
      .limit(3)

    if (latestBookings) {
      latestBookings.forEach((b, index) => {
        console.log(`   ${index + 1}. ${b.booking_number} → ${b.hotels?.name_th || 'Unknown Hotel'}`)
      })
    }

  } catch (error) {
    console.error('💥 Check failed:', error.message)
  }
}

checkLatestBooking()