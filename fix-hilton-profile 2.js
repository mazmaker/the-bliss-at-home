#!/usr/bin/env node
/**
 * Fix Hilton Profile Data
 * แก้ไขปัญหา hotel profile สำหรับ reservations@hilton.com
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function fixHiltonProfile() {
  console.log('🔧 ====================================')
  console.log('   Fix Hilton Profile Data')
  console.log('🔧 ====================================')
  console.log('')

  try {
    // 1. ดูข้อมูลโรงแรมทั้งหมด
    console.log('1. 🏨 ดูข้อมูลโรงแรมทั้งหมด...')
    const { data: hotels, error: hotelsError } = await supabase
      .from('hotels')
      .select('*')

    if (hotelsError) {
      console.log('❌ Hotels error:', hotelsError.message)
      return
    }

    console.log('   โรงแรมที่มี:')
    hotels.forEach((hotel, index) => {
      console.log(`   ${index + 1}. ID: ${hotel.id}`)
      console.log(`      Name: ${hotel.name || 'NULL'}`)
      console.log(`      Address: ${hotel.address || 'N/A'}`)
      console.log('')
    })

    // 2. หาโรงแรมกรุงเทพฯ (จาก address)
    const bangkokHotel = hotels.find(h =>
      h.address && h.address.includes('กรุงเทพฯ') && h.address.includes('สุขุมวิท')
    )

    if (!bangkokHotel) {
      console.log('❌ ไม่พบโรงแรมกรุงเทพฯ')
      return
    }

    console.log(`2. ✅ พบโรงแรมกรุงเทพฯ: ${bangkokHotel.id}`)
    console.log('')

    // 3. อัพเดทชื่อโรงแรม
    console.log('3. 📝 อัพเดทชื่อโรงแรม...')
    const { error: updateHotelError } = await supabase
      .from('hotels')
      .update({
        name: 'โรงแรมฮิลตัน กรุงเทพฯ'
      })
      .eq('id', bangkokHotel.id)

    if (updateHotelError) {
      console.log('❌ Update hotel error:', updateHotelError.message)
    } else {
      console.log('✅ อัพเดทชื่อโรงแรมสำเร็จ')
    }

    // 4. อัพเดท user profile
    console.log('')
    console.log('4. 👤 อัพเดท user profile...')
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({
        hotel_id: bangkokHotel.id
      })
      .eq('id', 'df59b8ba-52e6-4d4d-b050-6f63d83446e3')

    if (updateProfileError) {
      console.log('❌ Update profile error:', updateProfileError.message)
    } else {
      console.log('✅ อัพเดท user profile สำเร็จ')
    }

    // 5. ตรวจสอบผลลัพธ์
    console.log('')
    console.log('5. ✅ ตรวจสอบผลลัพธ์...')

    const { data: updatedProfile, error: checkError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        role,
        hotel_id,
        hotels:hotel_id (
          id,
          name,
          address
        )
      `)
      .eq('id', 'df59b8ba-52e6-4d4d-b050-6f63d83446e3')
      .single()

    if (checkError) {
      console.log('❌ Check error:', checkError.message)
    } else {
      console.log('   User:', updatedProfile.email)
      console.log('   Role:', updatedProfile.role)
      console.log('   Hotel:', updatedProfile.hotels?.name || 'ไม่พบ')
      console.log('   Hotel ID:', updatedProfile.hotel_id)
    }

    console.log('')
    console.log('🎉 ====================================')
    console.log('   แก้ไขเสร็จสิ้น!')
    console.log('🎉 ====================================')
    console.log('')
    console.log('✅ ขั้นตอนต่อไป:')
    console.log('   1. ล็อกเอาท์จาก Hotel App')
    console.log('   2. ล็อกอินใหม่')
    console.log('   3. ควรเห็น "โรงแรมฮิลตัน กรุงเทพฯ" แล้ว')
    console.log('   4. ลองจองบริการ')

  } catch (error) {
    console.error('💥 Error:', error.message)
  }
}

fixHiltonProfile().catch(console.error)