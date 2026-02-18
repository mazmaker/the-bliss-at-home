#!/usr/bin/env node
/**
 * Check Hotel Profile Data
 * ตรวจสอบข้อมูล hotel profile ที่ผิดพลาด
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkHotelProfile() {
  console.log('🏨 ====================================')
  console.log('   Check Hotel Profile Data')
  console.log('🏨 ====================================')
  console.log('')

  try {
    // 1. Check user profile
    console.log('1. 👤 ตรวจสอบ user profile...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', 'df59b8ba-52e6-4d4d-b050-6f63d83446e3')
      .single()

    if (profileError) {
      console.log('❌ Profile error:', profileError.message)
      return
    }

    console.log('   User ID:', profile.id)
    console.log('   Email:', profile.email)
    console.log('   Role:', profile.role)
    console.log('   Hotel ID:', profile.hotel_id || 'NULL')
    console.log('')

    // 2. Check all hotels in database
    console.log('2. 🏨 รายการโรงแรมทั้งหมด...')
    const { data: hotels, error: hotelsError } = await supabase
      .from('hotels')
      .select('*')
      .order('created_at')

    if (hotelsError) {
      console.log('❌ Hotels error:', hotelsError.message)
      return
    }

    hotels.forEach((hotel, index) => {
      const isUserHotel = hotel.id === profile.hotel_id
      console.log(`   ${index + 1}. ${hotel.name} (${hotel.id})${isUserHotel ? ' ← USER\'S HOTEL' : ''}`)
      console.log(`      Address: ${hotel.address || 'N/A'}`)
      console.log(`      Phone: ${hotel.phone || 'N/A'}`)
      console.log('')
    })

    // 3. Check if user should be Hilton Bangkok
    console.log('3. 🔍 หา Hilton Bangkok...')
    const hiltonHotel = hotels.find(h =>
      h.name.toLowerCase().includes('hilton') &&
      h.name.toLowerCase().includes('bangkok')
    )

    if (hiltonHotel) {
      console.log('   ✅ พบ Hilton Bangkok:', hiltonHotel.name)
      console.log('   Hotel ID:', hiltonHotel.id)
      console.log('')

      if (profile.hotel_id !== hiltonHotel.id) {
        console.log('🛠️ ต้องแก้ไข: User hotel_id ไม่ถูกต้อง')
        console.log(`   Current: ${profile.hotel_id}`)
        console.log(`   Should be: ${hiltonHotel.id}`)
        console.log('')
        console.log('SQL สำหรับแก้ไข:')
        console.log(`UPDATE profiles SET hotel_id = '${hiltonHotel.id}' WHERE id = '${profile.id}';`)
      } else {
        console.log('✅ User hotel_id ถูกต้องแล้ว')
      }
    } else {
      console.log('❌ ไม่พบ Hilton Bangkok ในฐานข้อมูล')
      console.log('💡 อาจต้องสร้างข้อมูลโรงแรมใหม่')
    }

    console.log('')
    console.log('🎯 สรุป:')
    console.log(`   - User email: ${profile.email}`)
    console.log(`   - Current hotel: ${hotels.find(h => h.id === profile.hotel_id)?.name || 'ไม่พบ'}`)
    console.log(`   - Should be: Hilton Bangkok`)

  } catch (error) {
    console.error('💥 Error:', error.message)
  }
}

checkHotelProfile().catch(console.error)