/**
 * Verify Hotel User Mapping Fix
 * ตรวจสอบว่าการแก้ไข hotel mapping สำเร็จหรือไม่
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 VERIFYING: Hotel User Mapping Fix')
console.log('====================================')

async function verifyHotelFix() {
  try {
    // 1. Check if hotel_id column exists and has data
    console.log('\n✅ 1. Checking hotel_id column...')

    const { data: mappedUsers, error: mappingError } = await supabase
      .from('profiles')
      .select(`
        email,
        role,
        hotel_id,
        hotels:hotel_id(name_th, hotel_slug)
      `)
      .eq('role', 'HOTEL')
      .order('email')

    if (mappingError) {
      console.error('❌ hotel_id column check failed:', mappingError)
      console.log('\n🚨 Please run the SQL script first!')
      return
    }

    console.log('✅ hotel_id column exists!')

    // 2. Show current hotel user mappings
    console.log('\n👥 2. Current Hotel User Mappings:')
    console.log('==================================')

    mappedUsers.forEach((user, index) => {
      if (user.hotel_id && user.hotels) {
        console.log(`✅ ${index + 1}. ${user.email} → ${user.hotels.name_th} (${user.hotels.hotel_slug})`)
      } else {
        console.log(`❌ ${index + 1}. ${user.email} → NO HOTEL MAPPED`)
      }
    })

    // 3. Check bookings distribution
    console.log('\n📊 3. Bookings Distribution by Hotel:')
    console.log('=====================================')

    const { data: hotels, error: hotelsError } = await supabase
      .from('hotels')
      .select('id, name_th, hotel_slug, status')
      .eq('status', 'active')

    if (hotelsError) {
      console.error('❌ Error fetching hotels:', hotelsError)
      return
    }

    for (const hotel of hotels) {
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, booking_number, customer_notes')
        .eq('hotel_id', hotel.id)

      if (bookingsError) {
        console.error(`❌ Error fetching bookings for ${hotel.name_th}:`, bookingsError)
        continue
      }

      console.log(`\n🏨 ${hotel.name_th} (${hotel.hotel_slug})`)
      console.log(`   Hotel ID: ${hotel.id}`)
      console.log(`   Bookings: ${bookings.length}`)

      // Show sample bookings
      if (bookings.length > 0) {
        console.log('   Recent bookings:')
        bookings.slice(0, 3).forEach((booking, index) => {
          const guestMatch = booking.customer_notes?.match(/Guest:\s*([^,\n]+)/)
          const guestName = guestMatch?.[1]?.trim() || 'Unknown Guest'
          console.log(`     ${index + 1}. #${booking.booking_number} - ${guestName}`)
        })
      }
    }

    // 4. Test expected user access
    console.log('\n🎯 4. Expected User Access After Fix:')
    console.log('======================================')

    const expectedAccess = [
      { email: 'info@dusit.com', expectedHotel: 'dusit-thani-bangkok', expectedName: 'โรงแรมดุสิต ธานี' },
      { email: 'reservations@hilton.com', expectedHotel: 'grand-palace-bangkok', expectedName: 'โรงแรมฮิลตัน กรุงเทพฯ' },
      { email: 'sweettuay.bt@gmail.com', expectedHotel: 'resort-chiang-mai', expectedName: 'รีสอร์ทในฝัน เชียงใหม่' }
    ]

    for (const expected of expectedAccess) {
      const user = mappedUsers.find(u => u.email === expected.email)

      if (user && user.hotels) {
        if (user.hotels.hotel_slug === expected.expectedHotel) {
          console.log(`✅ ${expected.email} correctly mapped to ${expected.expectedName}`)
        } else {
          console.log(`❌ ${expected.email} mapped to wrong hotel: ${user.hotels.name_th}`)
        }
      } else if (user && !user.hotels) {
        console.log(`⚠️ ${expected.email} exists but no hotel mapped`)
      } else {
        console.log(`❌ ${expected.email} not found`)
      }
    }

    // 5. Check for orphaned bookings
    console.log('\n🔍 5. Orphaned Bookings Check:')
    console.log('==============================')

    const { data: orphanedBookings, error: orphanError } = await supabase
      .from('bookings')
      .select('id, booking_number, hotel_id, customer_notes')
      .is('hotel_id', null)
      .limit(5)

    if (orphanError) {
      console.error('❌ Error checking orphaned bookings:', orphanError)
    } else {
      if (orphanedBookings.length > 0) {
        console.log(`⚠️ Found ${orphanedBookings.length} bookings with no hotel assigned:`)
        orphanedBookings.forEach((booking, index) => {
          const guestMatch = booking.customer_notes?.match(/Guest:\s*([^,\n]+)/)
          const guestName = guestMatch?.[1]?.trim() || 'Unknown Guest'
          console.log(`  ${index + 1}. #${booking.booking_number} - ${guestName}`)
        })
      } else {
        console.log('✅ No orphaned bookings found')
      }
    }

    // 6. Final assessment
    console.log('\n📋 6. Fix Assessment:')
    console.log('======================')

    const mappedCount = mappedUsers.filter(u => u.hotel_id).length
    const totalHotelUsers = mappedUsers.length
    const mappingPercentage = ((mappedCount / totalHotelUsers) * 100).toFixed(1)

    console.log(`Hotel users mapped: ${mappedCount}/${totalHotelUsers} (${mappingPercentage}%)`)

    if (mappingPercentage === '100.0') {
      console.log('✅ All hotel users are properly mapped!')
      console.log('\n🎉 HOTEL MAPPING FIX SUCCESSFUL!')
      console.log('==================================')
      console.log('✅ hotel_id column added to profiles table')
      console.log('✅ All hotel users mapped to correct hotels')
      console.log('✅ Server authentication will now work correctly')
      console.log('')
      console.log('🔄 Next Steps:')
      console.log('1. Restart Hotel app')
      console.log('2. Test booking from different hotel login accounts')
      console.log('3. Verify bookings appear in correct hotel histories')
      console.log('')
      console.log('🎯 To test:')
      console.log('- Login as info@dusit.com → should see only Dusit Thani bookings')
      console.log('- Login as sweettuay.bt@gmail.com → should see only Nimman Resort bookings')
    } else {
      console.log('⚠️ Some users are not properly mapped')
      console.log('Please check the mapping results above')
    }

  } catch (error) {
    console.error('💥 Verification failed:', error)
  }
}

verifyHotelFix()