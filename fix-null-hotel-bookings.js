/**
 * Fix Null Hotel ID in Bookings
 * แก้ไข bookings ที่มี hotel_id = null
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: './apps/server/.env' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixNullHotelBookings() {
  console.log('🔧 === แก้ไข Bookings ที่มี hotel_id = null === 🔧\n')

  try {
    // The correct hotel ID for test user (Hilton Bangkok)
    const correctHotelId = '550e8400-e29b-41d4-a716-446655440001'

    // 1. Check how many bookings have null hotel_id
    const { data: nullBookings, error: countError } = await supabase
      .from('bookings')
      .select('id, booking_date, booking_time')
      .is('hotel_id', null)

    if (countError) {
      console.log('❌ Error checking null bookings:', countError.message)
      return
    }

    console.log(`📊 พบ bookings ที่มี hotel_id = null: ${nullBookings.length} รายการ`)

    if (nullBookings.length === 0) {
      console.log('✅ ไม่มี bookings ที่ต้องแก้ไข')
      return
    }

    // 2. Update the null hotel_id bookings
    console.log(`🔧 กำลังอัปเดต ${nullBookings.length} bookings...`)

    const { data: updatedBookings, error: updateError } = await supabase
      .from('bookings')
      .update({ hotel_id: correctHotelId })
      .is('hotel_id', null)
      .select('id, hotel_id, booking_date')

    if (updateError) {
      console.log('❌ Error updating bookings:', updateError.message)
      return
    }

    console.log(`✅ อัปเดตสำเร็จ: ${updatedBookings.length} รายการ`)

    // 3. Verify the fix by checking updated bookings
    console.log('\n📋 ตรวจสอบผลลัพธ์...')
    const { data: verifyBookings, error: verifyError } = await supabase
      .from('bookings')
      .select(`
        id, hotel_id, booking_date, booking_time,
        hotels(name_th)
      `)
      .eq('hotel_id', correctHotelId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (verifyError) {
      console.log('❌ Error verifying:', verifyError.message)
      return
    }

    console.log('✅ Bookings ที่แก้ไขแล้ว:')
    verifyBookings.forEach(booking => {
      console.log(`   📅 ${booking.booking_date} ${booking.booking_time} - ${booking.hotels?.name_th || 'Unknown Hotel'}`)
    })

    // 4. Final check for remaining null hotel_id
    const { data: remainingNull, error: finalCheckError } = await supabase
      .from('bookings')
      .select('count')
      .is('hotel_id', null)

    if (!finalCheckError && remainingNull) {
      const remaining = remainingNull.length
      console.log(`\n📊 bookings ที่ยังมี hotel_id = null: ${remaining} รายการ`)
    }

  } catch (error) {
    console.error('💥 Error:', error.message)
  }

  console.log('\n🎉 === การแก้ไขเสร็จสิ้น ===')
}

// Run the fix
fixNullHotelBookings()