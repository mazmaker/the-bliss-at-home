#!/usr/bin/env node
/**
 * Fix Hotel Relationship
 * แก้ไขการเชื่อมโยงระหว่าง profile และ hotel
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function fixHotelRelationship() {
  console.log('🔗 ====================================')
  console.log('   Fix Hotel Relationship')
  console.log('🔗 ====================================')
  console.log('')

  try {
    const userId = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3'

    // 1. Check current user data
    console.log('1. 👤 ตรวจสอบข้อมูล user ปัจจุบัน...')
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError) {
      console.log('❌ User error:', userError.message)
      return
    }

    console.log('   User:', userData.email)
    console.log('   Full Name:', userData.full_name)
    console.log('   Metadata:', JSON.stringify(userData.metadata, null, 2))
    console.log('')

    // 2. Check all hotels
    console.log('2. 🏨 ตรวจสอบข้อมูลโรงแรมทั้งหมด...')
    const { data: hotels, error: hotelsError } = await supabase
      .from('hotels')
      .select('*')

    if (hotelsError) {
      console.log('❌ Hotels error:', hotelsError.message)
      return
    }

    console.log('   โรงแรมทั้งหมด:')
    hotels.forEach((hotel, index) => {
      const isLinked = hotel.auth_user_id === userId
      console.log(`   ${index + 1}. ${hotel.name_th || hotel.name_en || 'ไม่มีชื่อ'} ${isLinked ? '← เชื่อมโยงกับ user นี้' : ''}`)
      console.log(`      ID: ${hotel.id}`)
      console.log(`      Auth User ID: ${hotel.auth_user_id || 'NULL'}`)
      console.log(`      Login Email: ${hotel.login_email || 'NULL'}`)
      console.log('')
    })

    // 3. Find Bangkok hotel that should be linked
    const bangkokHotel = hotels.find(h =>
      h.address && h.address.includes('กรุงเทพฯ') && h.address.includes('สุขุมวิท')
    )

    if (!bangkokHotel) {
      console.log('❌ ไม่พบโรงแรมกรุงเทพฯ')
      return
    }

    console.log(`3. ✅ พบโรงแรมกรุงเทพฯ: ${bangkokHotel.id}`)
    console.log(`   ชื่อปัจจุบัน: ${bangkokHotel.name_th || 'NULL'}`)
    console.log(`   Auth User ID: ${bangkokHotel.auth_user_id || 'NULL'}`)
    console.log('')

    // 4. Fix the relationship and data
    console.log('4. 🔧 แก้ไขการเชื่อมโยงและข้อมูล...')

    // Update hotel to link with user
    const { error: updateHotelError } = await supabase
      .from('hotels')
      .update({
        name_th: 'โรงแรมฮิลตัน กรุงเทพฯ',
        name_en: 'Hilton Bangkok',
        auth_user_id: userId,
        login_email: userData.email
      })
      .eq('id', bangkokHotel.id)

    if (updateHotelError) {
      console.log('❌ Update hotel error:', updateHotelError.message)
    } else {
      console.log('✅ อัพเดทข้อมูลโรงแรมสำเร็จ')
    }

    // 5. Verify the fix
    console.log('')
    console.log('5. ✅ ตรวจสอบผลลัพธ์...')

    const { data: updatedHotel, error: verifyError } = await supabase
      .from('hotels')
      .select('*')
      .eq('id', bangkokHotel.id)
      .single()

    if (verifyError) {
      console.log('❌ Verify error:', verifyError.message)
    } else {
      console.log('   Updated Hotel:')
      console.log(`     Name TH: ${updatedHotel.name_th}`)
      console.log(`     Name EN: ${updatedHotel.name_en}`)
      console.log(`     Auth User ID: ${updatedHotel.auth_user_id}`)
      console.log(`     Login Email: ${updatedHotel.login_email}`)
    }

    console.log('')
    console.log('🎉 ====================================')
    console.log('   แก้ไขสำเร็จ!')
    console.log('🎉 ====================================')
    console.log('')
    console.log('✅ ที่ได้แก้ไข:')
    console.log('   - เชื่อมโยง user กับโรงแรมกรุงเทพฯ')
    console.log('   - ตั้งชื่อโรงแรมเป็น "โรงแรมฮิลตัน กรุงเทพฯ"')
    console.log('   - เชื่อมโยง auth_user_id กับ profile')
    console.log('')
    console.log('📱 ขั้นตอนต่อไป:')
    console.log('   1. ล็อกเอาท์จาก Hotel App')
    console.log('   2. ล็อกอินใหม่')
    console.log('   3. ควรเห็น "โรงแรมฮิลตัน กรุงเทพฯ" แล้ว')

  } catch (error) {
    console.error('💥 Error:', error.message)
  }
}

fixHotelRelationship().catch(console.error)