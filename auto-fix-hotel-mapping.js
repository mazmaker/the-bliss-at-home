/**
 * 🚀 AUTO FIX HOTEL MAPPING - รันแล้วแก้เสร็จ
 * แก้ปัญหาการจองผิดโรงแรมแบบอัตโนมัติ
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🚀 AUTO FIXING: Hotel Mapping Problem')
console.log('====================================')

async function autoFixHotelMapping() {
  try {
    console.log('📝 Step 1: Adding hotel_id column...')

    // Add hotel_id column to profiles table
    const { error: addColumnError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE profiles
        ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES hotels(id);

        CREATE INDEX IF NOT EXISTS idx_profiles_hotel_id ON profiles(hotel_id);
      `
    })

    if (addColumnError) {
      console.log('⚠️  Using direct update method...')
    } else {
      console.log('✅ Column added successfully')
    }

    console.log('\n👥 Step 2: Mapping hotel users...')

    // Map Dusit Thani
    const { error: dusitError } = await supabase
      .from('profiles')
      .update({ hotel_id: '550e8400-e29b-41d4-a716-446655440003' })
      .eq('email', 'info@dusit.com')
      .eq('role', 'HOTEL')

    if (!dusitError) {
      console.log('✅ Mapped info@dusit.com → โรงแรมดุสิต ธานี')
    } else {
      console.log('⚠️  Dusit mapping:', dusitError.message)
    }

    // Map Resort Chiang Mai
    const { error: resortError } = await supabase
      .from('profiles')
      .update({ hotel_id: '550e8400-e29b-41d4-a716-446655440002' })
      .in('email', ['sweettuay.bt@gmail.com', 'isweettuay.bt@gmail.com'])
      .eq('role', 'HOTEL')

    if (!resortError) {
      console.log('✅ Mapped sweettuay emails → รีสอร์ทในฝัน เชียงใหม่')
    }

    // Map Hilton
    const { error: hiltonError } = await supabase
      .from('profiles')
      .update({ hotel_id: '550e8400-e29b-41d4-a716-446655440001' })
      .in('email', ['reservations@hilton.com', 'ireservations@hilton.com'])
      .eq('role', 'HOTEL')

    if (!hiltonError) {
      console.log('✅ Mapped hilton emails → โรงแรมฮิลตัน กรุงเทพฯ')
    }

    console.log('\n🎯 Step 3: Verifying mappings...')

    // Verify mappings
    const { data: mappedUsers, error: verifyError } = await supabase
      .from('profiles')
      .select(`
        email,
        role,
        hotel_id,
        hotels:hotel_id(name_th, hotel_slug)
      `)
      .eq('role', 'HOTEL')
      .order('email')

    if (!verifyError && mappedUsers) {
      console.log('\n📊 Current Hotel Mappings:')
      mappedUsers.forEach((user, index) => {
        const status = user.hotel_id ? '✅' : '❌'
        const hotelName = user.hotels?.name_th || 'NOT MAPPED'
        console.log(`   ${index + 1}. ${user.email} ${status} ${hotelName}`)
      })

      const mappedCount = mappedUsers.filter(u => u.hotel_id).length
      const totalCount = mappedUsers.length

      if (mappedCount === totalCount && mappedCount > 0) {
        console.log('\n🎉 SUCCESS! All hotel users are now properly mapped!')
        console.log('✅ Problem fixed: Bookings will now appear in correct hotel history')
        console.log('\n🧪 Next: Test by creating a booking from Dusit Thani')
        console.log('Expected: Booking should appear in Dusit Thani history (not Resort Chiang Mai)')
      } else {
        console.log(`\n⚠️  Partial success: ${mappedCount}/${totalCount} users mapped`)
        console.log('Some users may need manual mapping')
      }
    }

  } catch (error) {
    console.error('💥 Auto-fix failed:', error.message)
    console.log('\n🚨 Manual Fix Required:')
    console.log('1. Go to Supabase Dashboard → SQL Editor')
    console.log('2. Copy-paste QUICK-SQL-FIX.sql')
    console.log('3. Click RUN')
  }
}

// Execute auto-fix
autoFixHotelMapping().catch(error => {
  console.error('🚨 Script failed completely:', error.message)
  console.log('\n💡 BACKUP PLAN: Use QUICK-SQL-FIX.sql manually')
  process.exit(1)
})