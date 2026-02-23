/**
 * Fix Hotel Mapping - Direct Approach
 * ใช้ Supabase API โดยตรงแทน SQL
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔧 FIXING: Hotel User Mapping (Direct)')
console.log('======================================')

async function fixHotelMappingDirect() {
  try {
    // 1. Check if hotel_id column exists
    console.log('\n🔍 1. Checking if hotel_id column exists...')

    try {
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('hotel_id')
        .limit(1)

      if (testError && testError.message.includes('hotel_id does not exist')) {
        console.log('❌ hotel_id column does not exist, need to add it')

        // Add column using raw SQL
        const addColumnSQL = `
          ALTER TABLE profiles ADD COLUMN hotel_id UUID REFERENCES hotels(id);
          CREATE INDEX IF NOT EXISTS idx_profiles_hotel_id ON profiles(hotel_id);
          COMMENT ON COLUMN profiles.hotel_id IS 'Foreign key reference to hotels table - maps users to their hotel';
        `

        // Try to execute using raw SQL query if available
        console.log('🔄 Adding hotel_id column...')
        // Since we can't use rpc, we'll skip the column addition and assume it will be done manually
        console.log('⚠️ Please run this SQL manually in Supabase SQL Editor:')
        console.log(addColumnSQL)
        console.log('')

      } else {
        console.log('✅ hotel_id column exists')
      }
    } catch (error) {
      console.log('⚠️ Could not check column, assuming it needs to be added')
    }

    // 2. Get all hotels for reference
    console.log('\n🏨 2. Getting hotel information...')
    const { data: hotels, error: hotelsError } = await supabase
      .from('hotels')
      .select('id, name_th, name_en, hotel_slug, status')
      .order('name_th')

    if (hotelsError) {
      console.error('❌ Error fetching hotels:', hotelsError)
      return
    }

    console.log('Available hotels:')
    hotels.forEach((hotel, index) => {
      console.log(`  ${index + 1}. ${hotel.name_th} (${hotel.hotel_slug}) - ${hotel.id}`)
    })

    // 3. Get all hotel users
    console.log('\n👥 3. Getting hotel users...')
    const { data: hotelUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, role, hotel_id')
      .eq('role', 'HOTEL')
      .order('email')

    if (usersError) {
      console.error('❌ Error fetching hotel users:', usersError)
      return
    }

    console.log('Hotel users found:')
    hotelUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.id}) - Current hotel_id: ${user.hotel_id || 'NULL'}`)
    })

    // 4. Define the correct mappings
    console.log('\n🔗 4. Applying hotel mappings...')
    const mappings = [
      {
        email: 'info@dusit.com',
        hotel_id: '550e8400-e29b-41d4-a716-446655440003', // Dusit Thani
        hotel_name: 'โรงแรมดุสิต ธานี (dusit-thani-bangkok)'
      },
      {
        email: 'reservations@hilton.com',
        hotel_id: '550e8400-e29b-41d4-a716-446655440001', // Hilton Bangkok
        hotel_name: 'โรงแรมฮิลตัน กรุงเทพฯ (grand-palace-bangkok)'
      },
      {
        email: 'sweettuay.bt@gmail.com',
        hotel_id: '550e8400-e29b-41d4-a716-446655440002', // Nimman Resort
        hotel_name: 'รีสอร์ทในฝัน เชียงใหม่ (resort-chiang-mai)'
      },
      {
        email: 'isweettuay.bt@gmail.com',
        hotel_id: '550e8400-e29b-41d4-a716-446655440002', // Nimman Resort
        hotel_name: 'รีสอร์ทในฝัน เชียงใหม่ (resort-chiang-mai)'
      },
      {
        email: 'test-hotel@thebliss.com',
        hotel_id: '3082d55a-b185-49b9-b4fc-01c00d61e7e1', // Test Hotel Bangkok
        hotel_name: 'รีสอร์ทในฝัน เชียงใหม่ (test-hotel-bangkok)'
      },
      {
        email: 'ireservations@hilton.com',
        hotel_id: '550e8400-e29b-41d4-a716-446655440001', // Hilton Bangkok
        hotel_name: 'โรงแรมฮิลตัน กรุงเทพฯ (grand-palace-bangkok)'
      }
    ]

    for (const mapping of mappings) {
      console.log(`\n🔄 Mapping ${mapping.email} → ${mapping.hotel_name}`)

      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({ hotel_id: mapping.hotel_id })
        .eq('email', mapping.email)
        .eq('role', 'HOTEL')
        .select()

      if (updateError) {
        console.error(`❌ Failed to map ${mapping.email}:`, updateError)
      } else {
        if (updateData && updateData.length > 0) {
          console.log(`✅ Successfully mapped ${mapping.email}`)
        } else {
          console.log(`⚠️ No user found with email ${mapping.email}`)
        }
      }
    }

    // 5. Verify the mappings
    console.log('\n📊 5. Verification - Final Hotel User Mappings:')
    console.log('================================================')

    const { data: verifyUsers, error: verifyError } = await supabase
      .from('profiles')
      .select('id, email, role, hotel_id')
      .eq('role', 'HOTEL')
      .order('email')

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError)
    } else {
      console.log('\n📋 Current hotel user mappings:')
      for (const user of verifyUsers) {
        if (user.hotel_id) {
          const hotel = hotels.find(h => h.id === user.hotel_id)
          if (hotel) {
            console.log(`✅ ${user.email} → ${hotel.name_th} (${hotel.hotel_slug})`)
          } else {
            console.log(`❌ ${user.email} → Hotel ID ${user.hotel_id} NOT FOUND`)
          }
        } else {
          console.log(`⚠️ ${user.email} → NO HOTEL MAPPED`)
        }
      }
    }

    // 6. Show expected vs actual bookings after fix
    console.log('\n📈 6. Expected Booking Distribution After Fix:')
    console.log('==============================================')

    for (const hotel of hotels.filter(h => h.status === 'active')) {
      const usersForHotel = verifyUsers.filter(u => u.hotel_id === hotel.id)
      console.log(`\n🏨 ${hotel.name_th} (${hotel.hotel_slug})`)
      console.log(`   Hotel ID: ${hotel.id}`)
      console.log(`   Mapped Users: ${usersForHotel.length}`)
      if (usersForHotel.length > 0) {
        usersForHotel.forEach((user, index) => {
          console.log(`     ${index + 1}. ${user.email}`)
        })
      }

      // Check current bookings count
      const { data: currentBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id')
        .eq('hotel_id', hotel.id)

      if (!bookingsError && currentBookings) {
        console.log(`   Current Bookings: ${currentBookings.length}`)
      }
    }

    console.log('\n✅ Hotel mapping fix completed!')
    console.log('\n🔄 Next Steps:')
    console.log('1. Restart the Hotel app')
    console.log('2. Test booking from different hotel URLs')
    console.log('3. Verify that bookings appear in correct hotel histories')

  } catch (error) {
    console.error('💥 Fix failed:', error)
  }
}

fixHotelMappingDirect()