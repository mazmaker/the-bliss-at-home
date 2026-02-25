/**
 * Check Bookings Schema and Hotel Mapping
 * ตรวจสอบ bookings table และ hotel_id mapping
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 DEBUG: Bookings Schema & Hotel Mapping')
console.log('=========================================')

async function analyzeBookingsAndHotels() {
  try {
    // 1. Check bookings table structure
    console.log('\n📋 1. Bookings Table Structure:')
    console.log('===============================')

    const { data: sampleBooking, error: sampleError } = await supabase
      .from('bookings')
      .select('*')
      .limit(1)

    if (sampleError) {
      console.error('❌ Error fetching sample booking:', sampleError)
      return
    }

    if (sampleBooking && sampleBooking.length > 0) {
      console.log('Available columns in bookings:')
      const columns = Object.keys(sampleBooking[0])
      columns.forEach((col, index) => {
        console.log(`  ${index + 1}. ${col}`)
      })
    }

    // 2. Get all hotels for reference
    console.log('\n🏨 2. All Hotels:')
    console.log('=================')
    const { data: hotels, error: hotelsError } = await supabase
      .from('hotels')
      .select('id, name_th, name_en, hotel_slug, status')
      .order('name_th')

    if (hotelsError) {
      console.error('❌ Error fetching hotels:', hotelsError)
      return
    }

    hotels.forEach((hotel, index) => {
      console.log(`${index + 1}. ${hotel.name_th} (${hotel.hotel_slug})`)
      console.log(`   ID: ${hotel.id}`)
      console.log(`   Status: ${hotel.status}`)
      console.log('')
    })

    // 3. Check recent bookings and their hotel_id
    console.log('\n📊 3. Recent Bookings by Hotel:')
    console.log('===============================')

    const { data: recentBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, booking_number, hotel_id, booking_date, customer_notes, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError)
      return
    }

    console.log('Recent bookings:')
    for (const booking of recentBookings) {
      const hotel = hotels.find(h => h.id === booking.hotel_id)
      const guestMatch = booking.customer_notes?.match(/Guest:\s*([^,\n]+)/)
      const guestName = guestMatch?.[1]?.trim() || 'Unknown Guest'

      console.log(`\n📝 #${booking.booking_number}`)
      console.log(`   Guest: ${guestName}`)
      console.log(`   Date: ${booking.booking_date}`)
      console.log(`   Hotel ID: ${booking.hotel_id}`)
      if (hotel) {
        console.log(`   Hotel: ${hotel.name_th} (${hotel.hotel_slug})`)
      } else {
        console.log(`   ❌ Hotel NOT FOUND for ID: ${booking.hotel_id}`)
      }
      console.log(`   Created: ${new Date(booking.created_at).toLocaleString('th-TH')}`)
    }

    // 4. Group bookings by hotel
    console.log('\n📈 4. Bookings Count by Hotel:')
    console.log('==============================')

    const hotelBookingCounts = {}
    recentBookings.forEach(booking => {
      const hotelId = booking.hotel_id
      if (!hotelBookingCounts[hotelId]) {
        hotelBookingCounts[hotelId] = 0
      }
      hotelBookingCounts[hotelId]++
    })

    Object.entries(hotelBookingCounts).forEach(([hotelId, count]) => {
      const hotel = hotels.find(h => h.id === hotelId)
      if (hotel) {
        console.log(`${hotel.name_th} (${hotel.hotel_slug}): ${count} bookings`)
      } else {
        console.log(`Unknown Hotel (${hotelId}): ${count} bookings`)
      }
    })

    // 5. Check specific hotels that user mentioned
    console.log('\n🎯 5. Specific Hotel Analysis:')
    console.log('==============================')

    const specificSlugs = ['dusit-thani-bangkok', 'resort-chiang-mai']

    for (const slug of specificSlugs) {
      const hotel = hotels.find(h => h.hotel_slug === slug)
      if (hotel) {
        console.log(`\n🏨 ${hotel.name_th} (${slug})`)
        console.log(`   Hotel ID: ${hotel.id}`)

        // Count bookings for this hotel
        const { data: hotelBookings, error: hotelBookingsError } = await supabase
          .from('bookings')
          .select('id, booking_number, booking_date, customer_notes')
          .eq('hotel_id', hotel.id)
          .order('created_at', { ascending: false })

        if (hotelBookingsError) {
          console.error(`❌ Error fetching bookings for ${hotel.name_th}:`, hotelBookingsError)
        } else {
          console.log(`   Total Bookings: ${hotelBookings.length}`)

          if (hotelBookings.length > 0) {
            console.log('   Recent bookings:')
            hotelBookings.slice(0, 3).forEach((booking, index) => {
              const guestMatch = booking.customer_notes?.match(/Guest:\s*([^,\n]+)/)
              const guestName = guestMatch?.[1]?.trim() || 'Unknown Guest'
              console.log(`     ${index + 1}. #${booking.booking_number} - ${guestName} (${booking.booking_date})`)
            })
          }
        }
      } else {
        console.log(`❌ Hotel with slug '${slug}' not found`)
      }
    }

    // 6. Hotel Authentication Analysis
    console.log('\n🔐 6. Hotel Authentication Analysis:')
    console.log('====================================')

    const { data: hotelUsers, error: hotelUsersError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('role', 'HOTEL')

    if (hotelUsersError) {
      console.error('❌ Error fetching hotel users:', hotelUsersError)
    } else {
      console.log(`Found ${hotelUsers.length} hotel users:`)
      hotelUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (${user.id})`)
      })

      // The problem: How does server know which hotel a user belongs to?
      console.log('\n🚨 PROBLEM IDENTIFIED:')
      console.log('======================')
      console.log('❌ profiles table has NO hotel_id column')
      console.log('❌ No way to map users to specific hotels')
      console.log('❌ Server cannot determine hotel ownership')
      console.log('')
      console.log('🔧 This explains why:')
      console.log('- Bookings may be created with wrong hotel_id')
      console.log('- Hotel contexts are not properly isolated')
      console.log('- Users see bookings from wrong hotels')
    }

  } catch (error) {
    console.error('💥 Analysis failed:', error)
  }
}

analyzeBookingsAndHotels()