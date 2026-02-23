/**
 * Debug Hotel User Mapping
 * ตรวจสอบความสัมพันธ์ระหว่าง Users และ Hotels
 * วิเคราะห์ปัญหาการจองไม่ตรงกับประวัติ
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 DEBUG: Hotel-User Mapping Analysis')
console.log('=====================================')

async function analyzeHotelUserMapping() {
  try {
    // 1. Get all hotels
    console.log('\n📋 1. All Hotels:')
    console.log('================')
    const { data: hotels, error: hotelsError } = await supabase
      .from('hotels')
      .select('id, name_th, name_en, hotel_slug, status')
      .order('name_th')

    if (hotelsError) {
      console.error('❌ Error fetching hotels:', hotelsError)
      return
    }

    hotels.forEach((hotel, index) => {
      console.log(`${index + 1}. ${hotel.name_th} (${hotel.name_en})`)
      console.log(`   ID: ${hotel.id}`)
      console.log(`   Slug: ${hotel.hotel_slug}`)
      console.log(`   Status: ${hotel.status}`)
      console.log('')
    })

    // 2. Get all user profiles with HOTEL role
    console.log('\n👥 2. Hotel User Profiles:')
    console.log('==========================')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, role, hotel_id, created_at')
      .eq('role', 'HOTEL')
      .order('email')

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError)
      return
    }

    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.email}`)
      console.log(`   User ID: ${profile.id}`)
      console.log(`   Role: ${profile.role}`)
      console.log(`   Hotel ID: ${profile.hotel_id || 'NULL'}`)
      console.log(`   Created: ${profile.created_at}`)
      console.log('')
    })

    // 3. Cross-reference users with hotels
    console.log('\n🔗 3. Hotel-User Relationships:')
    console.log('================================')

    for (const profile of profiles) {
      if (profile.hotel_id) {
        const hotel = hotels.find(h => h.id === profile.hotel_id)
        if (hotel) {
          console.log(`✅ ${profile.email} → ${hotel.name_th} (${hotel.hotel_slug})`)
        } else {
          console.log(`❌ ${profile.email} → Hotel ID ${profile.hotel_id} NOT FOUND`)
        }
      } else {
        console.log(`⚠️  ${profile.email} → NO HOTEL MAPPED`)
      }
    }

    // 4. Check bookings by hotel
    console.log('\n📊 4. Recent Bookings by Hotel:')
    console.log('===============================')

    for (const hotel of hotels.filter(h => h.status === 'active')) {
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, booking_number, booking_date, customer_notes, created_at, created_by')
        .eq('hotel_id', hotel.id)
        .order('created_at', { ascending: false })
        .limit(3)

      if (bookingsError) {
        console.error(`❌ Error fetching bookings for ${hotel.name_th}:`, bookingsError)
        continue
      }

      console.log(`\n🏨 ${hotel.name_th} (${hotel.hotel_slug})`)
      console.log(`   Hotel ID: ${hotel.id}`)
      console.log(`   Recent Bookings: ${bookings.length}`)

      bookings.forEach((booking, index) => {
        const guestMatch = booking.customer_notes?.match(/Guest:\s*([^,\n]+)/)
        const guestName = guestMatch?.[1]?.trim() || 'Unknown Guest'

        console.log(`   ${index + 1}. #${booking.booking_number} - ${guestName}`)
        console.log(`      Date: ${booking.booking_date}`)
        console.log(`      Created: ${booking.created_at}`)
        console.log(`      Created By: ${booking.created_by || 'Unknown'}`)
      })

      if (bookings.length === 0) {
        console.log('   📭 No recent bookings')
      }
    }

    // 5. Check for orphaned bookings
    console.log('\n🔍 5. Potential Issues:')
    console.log('=======================')

    const { data: allBookings, error: allBookingsError } = await supabase
      .from('bookings')
      .select('id, hotel_id, booking_number, created_by')
      .order('created_at', { ascending: false })
      .limit(20)

    if (allBookingsError) {
      console.error('❌ Error fetching all bookings:', allBookingsError)
      return
    }

    let orphanedBookings = 0
    let missingHotels = 0
    let unknownCreators = 0

    for (const booking of allBookings) {
      const hotel = hotels.find(h => h.id === booking.hotel_id)
      const creator = profiles.find(p => p.id === booking.created_by)

      if (!hotel) {
        console.log(`❌ Booking #${booking.booking_number} → Hotel ID ${booking.hotel_id} NOT FOUND`)
        missingHotels++
      }

      if (booking.created_by && !creator) {
        console.log(`⚠️  Booking #${booking.booking_number} → Created by ${booking.created_by} (User not found)`)
        unknownCreators++
      }

      if (!hotel || (booking.created_by && !creator)) {
        orphanedBookings++
      }
    }

    console.log(`\n📈 Summary:`)
    console.log(`   Total Hotels: ${hotels.length}`)
    console.log(`   Hotel Users: ${profiles.length}`)
    console.log(`   Recent Bookings Checked: ${allBookings.length}`)
    console.log(`   Issues Found: ${orphanedBookings}`)
    console.log(`   Missing Hotels: ${missingHotels}`)
    console.log(`   Unknown Creators: ${unknownCreators}`)

    // 6. Specific check for user mentioned hotels
    console.log('\n🎯 6. Specific Hotel Check:')
    console.log('============================')

    const specificHotels = [
      'dusit-thani-bangkok',
      'resort-chiang-mai'
    ]

    for (const slug of specificHotels) {
      const hotel = hotels.find(h => h.hotel_slug === slug)
      if (hotel) {
        console.log(`\n🏨 ${hotel.name_th} (${slug})`)
        console.log(`   ID: ${hotel.id}`)

        // Find users for this hotel
        const hotelUsers = profiles.filter(p => p.hotel_id === hotel.id)
        console.log(`   Mapped Users: ${hotelUsers.length}`)

        hotelUsers.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email} (${user.id})`)
        })

        // Count bookings
        const { data: hotelBookings, error: hotelBookingsError } = await supabase
          .from('bookings')
          .select('id')
          .eq('hotel_id', hotel.id)

        if (!hotelBookingsError) {
          console.log(`   Total Bookings: ${hotelBookings.length}`)
        }
      } else {
        console.log(`❌ Hotel with slug '${slug}' not found`)
      }
    }

    console.log('\n✅ Analysis Complete!')
    console.log('=====================')

  } catch (error) {
    console.error('💥 Analysis failed:', error)
  }
}

analyzeHotelUserMapping()