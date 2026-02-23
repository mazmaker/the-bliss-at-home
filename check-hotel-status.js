/**
 * 🔍 Check Hotel Mapping Status
 * ตรวจสอบสถานะการ map hotel users และ booking distribution
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 CHECKING: Hotel Mapping Status')
console.log('==================================')

async function checkHotelStatus() {
  try {
    // 1. Check if hotel_id column exists
    console.log('\n📊 1. Database Schema Check...')

    const { data: columns, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'profiles')
      .eq('column_name', 'hotel_id')

    if (schemaError) {
      console.log('⚠️ Could not check schema')
    } else if (columns && columns.length > 0) {
      console.log('✅ hotel_id column exists in profiles table')
    } else {
      console.log('❌ hotel_id column MISSING - run fix-hotel-mapping.js first!')
      return
    }

    // 2. Check hotel users mapping
    console.log('\n👥 2. Hotel User Mappings...')

    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        email,
        role,
        hotel_id,
        hotels:hotel_id(name_th, hotel_slug)
      `)
      .eq('role', 'HOTEL')
      .order('email')

    if (usersError) {
      console.log('❌ Failed to get users:', usersError.message)
      return
    }

    console.log('\n📋 Hotel Users Status:')
    users.forEach((user, index) => {
      const status = user.hotel_id ? '✅' : '❌'
      const hotel = user.hotels?.name_th || 'NOT MAPPED'
      const slug = user.hotels?.hotel_slug || 'no-slug'
      console.log(`   ${index + 1}. ${user.email}`)
      console.log(`      Status: ${status} ${hotel} (${slug})`)
      console.log(`      Hotel ID: ${user.hotel_id || 'null'}`)
      console.log('')
    })

    // 3. Check booking distribution
    console.log('\n📊 3. Booking Distribution by Hotel...')

    const { data: bookings, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        hotel_id,
        customer_notes,
        created_at,
        hotels:hotel_id(name_th, hotel_slug)
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (bookingError) {
      console.log('❌ Failed to get bookings:', bookingError.message)
      return
    }

    // Group by hotel
    const hotelBookings = {}
    bookings.forEach(booking => {
      const hotelName = booking.hotels?.name_th || 'No Hotel Assigned'
      const hotelSlug = booking.hotels?.hotel_slug || 'no-slug'

      if (!hotelBookings[hotelName]) {
        hotelBookings[hotelName] = {
          slug: hotelSlug,
          bookings: [],
          count: 0
        }
      }
      hotelBookings[hotelName].bookings.push(booking)
      hotelBookings[hotelName].count++
    })

    console.log('\n📈 Recent Bookings by Hotel:')
    Object.entries(hotelBookings).forEach(([hotelName, data]) => {
      console.log(`\n🏨 ${hotelName} (${data.slug})`)
      console.log(`   Total: ${data.count} bookings`)
      console.log('   Recent bookings:')

      data.bookings.slice(0, 3).forEach((booking, index) => {
        const guestName = booking.customer_notes?.match(/Guest:\s*([^,\n]+)/)?.[1]?.trim() || 'Unknown'
        const date = new Date(booking.created_at).toLocaleDateString('th-TH')
        console.log(`     ${index + 1}. ${guestName} - ${date}`)
      })
    })

    // 4. Problem Analysis
    console.log('\n🔍 4. Problem Analysis...')

    const dusitBookings = hotelBookings['โรงแรมดุสิต ธานี']?.count || 0
    const resortBookings = hotelBookings['รีสอร์ทในฝัน เชียงใหม่']?.count || 0
    const noHotelBookings = hotelBookings['No Hotel Assigned']?.count || 0

    console.log(`   Dusit Thani bookings: ${dusitBookings}`)
    console.log(`   Resort Chiang Mai bookings: ${resortBookings}`)
    console.log(`   No hotel assigned: ${noHotelBookings}`)

    // 5. Expected vs Actual
    console.log('\n🎯 5. Expected User Mappings...')

    const expectedMappings = [
      { email: 'info@dusit.com', expectedHotel: 'โรงแรมดุสิต ธานี' },
      { email: 'sweettuay.bt@gmail.com', expectedHotel: 'รีสอร์ทในฝัน เชียงใหม่' },
      { email: 'reservations@hilton.com', expectedHotel: 'โรงแรมฮิลตัน กรุงเทพฯ' }
    ]

    expectedMappings.forEach((expected, index) => {
      const user = users.find(u => u.email === expected.email)
      const actualHotel = user?.hotels?.name_th

      console.log(`\n   ${index + 1}. ${expected.email}`)
      console.log(`      Expected: ${expected.expectedHotel}`)
      console.log(`      Actual: ${actualHotel || 'NOT MAPPED'}`)

      if (actualHotel === expected.expectedHotel) {
        console.log(`      Status: ✅ CORRECT`)
      } else {
        console.log(`      Status: ❌ WRONG - NEEDS FIX`)
      }
    })

    // 6. Overall Status
    console.log('\n📋 6. Overall System Status...')

    const mappedUsersCount = users.filter(u => u.hotel_id).length
    const totalHotelUsers = users.length
    const mappingPercentage = totalHotelUsers > 0 ? ((mappedUsersCount / totalHotelUsers) * 100).toFixed(1) : '0'

    console.log(`   Total hotel users: ${totalHotelUsers}`)
    console.log(`   Properly mapped: ${mappedUsersCount}`)
    console.log(`   Mapping percentage: ${mappingPercentage}%`)
    console.log(`   No hotel bookings: ${noHotelBookings}`)

    if (mappingPercentage === '100.0' && noHotelBookings === 0) {
      console.log('\n🎉 SYSTEM STATUS: ✅ HEALTHY')
      console.log('All users are properly mapped and no orphaned bookings!')
    } else {
      console.log('\n🚨 SYSTEM STATUS: ❌ NEEDS ATTENTION')
      console.log('Some users are not properly mapped.')
      console.log('')
      console.log('🔧 To fix run: node fix-hotel-mapping.js')
    }

    // 7. Test queries
    console.log('\n🧪 7. Quick Server Test...')

    const testUser = users.find(u => u.email === 'info@dusit.com')
    if (testUser?.hotel_id) {
      const { data: testBookings, error: testError } = await supabase
        .from('bookings')
        .select('id, customer_notes')
        .eq('hotel_id', testUser.hotel_id)
        .limit(3)

      if (!testError && testBookings) {
        console.log(`✅ Server query works: Found ${testBookings.length} bookings for Dusit Thani`)
        testBookings.forEach((booking, index) => {
          const guest = booking.customer_notes?.match(/Guest:\s*([^,\n]+)/)?.[1]?.trim() || 'Unknown'
          console.log(`      ${index + 1}. Guest: ${guest}`)
        })
      } else {
        console.log('⚠️ Server query issue:', testError?.message)
      }
    } else {
      console.log('❌ Cannot test server: info@dusit.com not mapped')
    }

  } catch (error) {
    console.error('💥 Status check failed:', error.message)
  }
}

// Execute status check
checkHotelStatus().catch(error => {
  console.error('🚨 Script failed:', error.message)
  process.exit(1)
})