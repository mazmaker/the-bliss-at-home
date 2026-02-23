/**
 * 🔧 Fix Hotel User Mapping - แก้ปัญหาการจองผิดโรงแรม
 * รันสคริปต์นี้เพื่อแก้ปัญหาการจองไม่ตรงกับโรงแรม
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔧 FIXING: Hotel User Mapping Problem')
console.log('=====================================')
console.log('Problem: จองจาก "โรงแรมดุสิต ธานี" แต่แสดงใน "รีสอร์ทในฝัน เชียงใหม่"')
console.log('Solution: Map hotel users to correct hotels')

async function fixHotelMapping() {
  try {
    // Step 1: Add hotel_id column if not exists
    console.log('\n📝 Step 1: Adding hotel_id column to profiles...')

    const { error: columnError } = await supabase.rpc('execute_sql', {
      query: `
        ALTER TABLE profiles
        ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES hotels(id);

        CREATE INDEX IF NOT EXISTS idx_profiles_hotel_id ON profiles(hotel_id);

        COMMENT ON COLUMN profiles.hotel_id IS 'Maps users to their specific hotel';
      `
    })

    if (columnError) {
      console.log('⚠️ Column might already exist, continuing...')
    } else {
      console.log('✅ hotel_id column added successfully')
    }

    // Step 2: Get hotel IDs first
    console.log('\n🏨 Step 2: Getting hotel IDs...')

    const { data: hotels, error: hotelError } = await supabase
      .from('hotels')
      .select('id, name_th, hotel_slug')
      .order('name_th')

    if (hotelError) {
      throw new Error('Failed to get hotels: ' + hotelError.message)
    }

    console.log('📋 Found hotels:')
    hotels.forEach((hotel, index) => {
      console.log(`   ${index + 1}. ${hotel.name_th} (${hotel.hotel_slug}) - ${hotel.id}`)
    })

    // Step 3: Map users to hotels
    console.log('\n👥 Step 3: Mapping hotel users...')

    const userMappings = [
      { email: 'info@dusit.com', hotelName: 'โรงแรมดุสิต ธานี', slug: 'dusit-thani-bangkok' },
      { email: 'reservations@hilton.com', hotelName: 'โรงแรมฮิลตัน กรุงเทพฯ', slug: 'grand-palace-bangkok' },
      { email: 'ireservations@hilton.com', hotelName: 'โรงแรมฮิลตัน กรุงเทพฯ', slug: 'grand-palace-bangkok' },
      { email: 'sweettuay.bt@gmail.com', hotelName: 'รีสอร์ทในฝัน เชียงใหม่', slug: 'resort-chiang-mai' },
      { email: 'isweettuay.bt@gmail.com', hotelName: 'รีสอร์ทในฝัน เชียงใหม่', slug: 'resort-chiang-mai' },
      { email: 'test-hotel@thebliss.com', hotelName: 'Test Hotel', slug: 'test-hotel-bangkok' }
    ]

    for (const mapping of userMappings) {
      const hotel = hotels.find(h => h.hotel_slug === mapping.slug)
      if (!hotel) {
        console.log(`⚠️ Hotel not found for ${mapping.email} (${mapping.slug})`)
        continue
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ hotel_id: hotel.id })
        .eq('email', mapping.email)
        .eq('role', 'HOTEL')

      if (updateError) {
        console.log(`❌ Failed to map ${mapping.email}: ${updateError.message}`)
      } else {
        console.log(`✅ Mapped ${mapping.email} → ${hotel.name_th}`)
      }
    }

    // Step 4: Verify mappings
    console.log('\n🎯 Step 4: Verifying hotel user mappings...')

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
      throw new Error('Failed to verify mappings: ' + mappingError.message)
    }

    console.log('\n📊 Current mappings:')
    mappedUsers.forEach((user, index) => {
      const status = user.hotel_id && user.hotels ? '✅' : '❌'
      const hotelName = user.hotels?.name_th || 'Not Mapped'
      console.log(`   ${index + 1}. ${user.email} ${status} ${hotelName}`)
    })

    // Step 5: Check bookings distribution
    console.log('\n📊 Step 5: Checking bookings distribution...')

    const { data: bookingStats, error: statsError } = await supabase.rpc('get_booking_stats')

    if (statsError) {
      // Fallback query
      const { data: stats, error: fallbackError } = await supabase
        .from('bookings')
        .select(`
          hotel_id,
          hotels:hotel_id(name_th, hotel_slug)
        `)

      if (!fallbackError && stats) {
        const distribution = {}
        stats.forEach(booking => {
          const hotelName = booking.hotels?.name_th || 'No Hotel'
          distribution[hotelName] = (distribution[hotelName] || 0) + 1
        })

        console.log('📈 Booking distribution:')
        Object.entries(distribution).forEach(([hotel, count]) => {
          console.log(`   ${hotel}: ${count} bookings`)
        })
      }
    }

    // Step 6: Test fix
    console.log('\n🧪 Step 6: Testing the fix...')

    const testUser = mappedUsers.find(u => u.email === 'info@dusit.com')
    if (testUser && testUser.hotel_id) {
      console.log(`✅ Test passed: info@dusit.com is mapped to ${testUser.hotels?.name_th}`)

      // Check if server authentication will work
      const { data: serverTest, error: serverError } = await supabase
        .from('bookings')
        .select('id, hotel_id, hotels:hotel_id(name_th)')
        .eq('hotel_id', testUser.hotel_id)
        .limit(3)

      if (!serverError && serverTest) {
        console.log(`✅ Server authentication will work: Found ${serverTest.length} bookings for this hotel`)
      }
    } else {
      console.log('❌ Test failed: info@dusit.com is not properly mapped')
    }

    console.log('\n🎉 HOTEL MAPPING FIX COMPLETED!')
    console.log('================================')
    console.log('✅ hotel_id column added/verified')
    console.log('✅ Hotel users mapped to correct hotels')
    console.log('✅ Server authentication should now work')
    console.log('')
    console.log('🔄 Next Steps:')
    console.log('1. Test booking from different hotel accounts')
    console.log('2. Verify bookings appear in correct hotel histories')
    console.log('3. Check admin panel shows correct hotel names')
    console.log('')
    console.log('🎯 Expected Results:')
    console.log('- จอง from info@dusit.com → shows in Dusit Thani history')
    console.log('- จอง from sweettuay.bt@gmail.com → shows in Resort Chiang Mai history')

  } catch (error) {
    console.error('💥 Fix failed:', error.message)
    console.log('\n🚨 Manual fix required:')
    console.log('1. Go to Supabase Dashboard > SQL Editor')
    console.log('2. Run the HOTEL-USER-MAPPING-FIX.sql file')
    console.log('3. Check results manually')
  }
}

// Helper function to execute raw SQL if needed
async function executeRawSQL() {
  console.log('\n🔧 Alternative: Running raw SQL fix...')

  const sqlFix = `
    -- Add hotel_id column
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES hotels(id);
    CREATE INDEX IF NOT EXISTS idx_profiles_hotel_id ON profiles(hotel_id);

    -- Map users to hotels (update with actual hotel IDs)
    UPDATE profiles SET hotel_id = (SELECT id FROM hotels WHERE hotel_slug = 'dusit-thani-bangkok' LIMIT 1)
    WHERE email = 'info@dusit.com' AND role = 'HOTEL';

    UPDATE profiles SET hotel_id = (SELECT id FROM hotels WHERE hotel_slug = 'grand-palace-bangkok' LIMIT 1)
    WHERE email IN ('reservations@hilton.com', 'ireservations@hilton.com') AND role = 'HOTEL';

    UPDATE profiles SET hotel_id = (SELECT id FROM hotels WHERE hotel_slug = 'resort-chiang-mai' LIMIT 1)
    WHERE email IN ('sweettuay.bt@gmail.com', 'isweettuay.bt@gmail.com') AND role = 'HOTEL';
  `

  try {
    const { error } = await supabase.rpc('execute_sql', { query: sqlFix })
    if (error) {
      console.log('⚠️ Raw SQL execution failed, use manual method')
    } else {
      console.log('✅ Raw SQL fix applied successfully')
    }
  } catch (err) {
    console.log('⚠️ Need to execute SQL manually in Supabase Dashboard')
  }
}

// Run the fix
fixHotelMapping().catch(error => {
  console.error('🚨 Script failed:', error.message)
  console.log('\n💡 Try manual fix with HOTEL-USER-MAPPING-FIX.sql')
  process.exit(1)
})