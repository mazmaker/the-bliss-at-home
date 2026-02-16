#!/usr/bin/env node
/**
 * Debug User-Hotel ID Mapping
 * ตรวจสอบการเชื่อมโยง User ID กับ Hotel ID
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const TARGET_EMAIL = 'info@dusit.com'

async function debugUserHotelMapping() {
  console.log('🔍 ======================================')
  console.log('   Debug User-Hotel ID Mapping')
  console.log('🔍 ======================================')
  console.log('')

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    console.log('👤 Step 1: ตรวจสอบ Auth User...')

    // Get auth users with the target email
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.log('❌ ไม่สามารถดึงข้อมูล auth users ได้:', authError.message)
      return
    }

    const targetUser = authUsers.users.find(user => user.email === TARGET_EMAIL)

    if (!targetUser) {
      console.log('❌ ไม่พบ auth user สำหรับ email นี้')
      return
    }

    console.log('✅ พบ Auth User:')
    console.log(`   👤 User ID: ${targetUser.id}`)
    console.log(`   📧 Email: ${targetUser.email}`)
    console.log(`   🏷️  Role: ${targetUser.user_metadata?.role || 'ไม่มี role'}`)
    console.log(`   🏨 Hotel ID in metadata: ${targetUser.user_metadata?.hotel_id || 'ไม่มี'}`)
    console.log('')

    console.log('🏨 Step 2: ตรวจสอบ Hotels ที่เชื่อมโยงกับ User นี้...')

    // Find hotels linked to this auth user
    const { data: linkedHotels, error: hotelError } = await supabase
      .from('hotels')
      .select('*')
      .eq('auth_user_id', targetUser.id)

    if (hotelError) {
      console.log('❌ ไม่สามารถดึงข้อมูล hotels ได้:', hotelError.message)
      return
    }

    console.log(`📊 พบ ${linkedHotels?.length || 0} โรงแรมที่เชื่อมโยงกับ user นี้:`)

    if (linkedHotels && linkedHotels.length > 0) {
      linkedHotels.forEach((hotel, index) => {
        console.log(`   🏨 Hotel ${index + 1}:`)
        console.log(`      🆔 ID: ${hotel.id}`)
        console.log(`      🏷️  ชื่อ: ${hotel.name_th}`)
        console.log(`      🌍 ชื่อ EN: ${hotel.name_en || 'ไม่มี'}`)
        console.log(`      📧 Login Email: ${hotel.login_email || 'ไม่มี'}`)
        console.log(`      🔑 Auth User ID: ${hotel.auth_user_id}`)
        console.log(`      ✅ Login Enabled: ${hotel.login_enabled ? 'Yes' : 'No'}`)
        console.log('')
      })
    } else {
      console.log('   ❌ ไม่มีโรงแรมที่เชื่อมโยงกับ user นี้!')
    }

    console.log('🔍 Step 3: ตรวจสอบ Hotels ทั้งหมดที่มี login email นี้...')

    const { data: hotelsWithEmail, error: emailHotelError } = await supabase
      .from('hotels')
      .select('*')
      .eq('login_email', TARGET_EMAIL)

    if (!emailHotelError && hotelsWithEmail) {
      console.log(`📊 พบ ${hotelsWithEmail.length} โรงแรมที่ใช้ email นี้:`)

      hotelsWithEmail.forEach((hotel, index) => {
        console.log(`   🏨 Hotel ${index + 1}:`)
        console.log(`      🆔 ID: ${hotel.id}`)
        console.log(`      🏷️  ชื่อ: ${hotel.name_th}`)
        console.log(`      📧 Login Email: ${hotel.login_email}`)
        console.log(`      🔑 Auth User ID: ${hotel.auth_user_id || 'ไม่มี'}`)
        console.log(`      ✅ Status: ${hotel.auth_user_id ? 'เชื่อมโยงแล้ว' : 'ยังไม่เชื่อมโยง'}`)
        console.log('')
      })
    }

    console.log('🎯 Step 4: ตรวจสอบโรงแรมเริ่มต้นที่ใช้ใน hardcode...')
    const DEFAULT_HOTEL_ID = '550e8400-e29b-41d4-a716-446655440002'

    const { data: defaultHotel, error: defaultError } = await supabase
      .from('hotels')
      .select('*')
      .eq('id', DEFAULT_HOTEL_ID)
      .single()

    if (!defaultError && defaultHotel) {
      console.log('🏨 Default Hotel (hardcoded):')
      console.log(`   🆔 ID: ${defaultHotel.id}`)
      console.log(`   🏷️  ชื่อ: ${defaultHotel.name_th}`)
      console.log(`   📧 Login Email: ${defaultHotel.login_email || 'ไม่มี'}`)
      console.log(`   🔑 Auth User ID: ${defaultHotel.auth_user_id || 'ไม่มี'}`)
      console.log('')
    }

    console.log('💡 ======================================')
    console.log('   สรุปและแนะนำการแก้ไข')
    console.log('💡 ======================================')
    console.log('')

    if (linkedHotels && linkedHotels.length > 0) {
      const hotel = linkedHotels[0]
      console.log('🎯 การแก้ไข:')
      console.log('   1. ปัญหาคือ Hotel App ใช้ hardcoded hotel ID')
      console.log(`   2. ควรใช้ hotel ID ที่ถูกต้อง: ${hotel.id}`)
      console.log(`   3. หรือปรับระบบให้ดึง hotel ID จาก user metadata`)
      console.log('')
      console.log('🔧 URL ที่ถูกต้องสำหรับ Dusit Thani:')
      console.log(`   http://localhost:3006/hotel/${hotel.id}`)
    } else {
      console.log('❌ ปัญหาคือ: User ไม่ได้เชื่อมโยงกับโรงแรมใดเลย!')
      console.log('   ต้องแก้ไขการเชื่อมโยง auth_user_id ใน hotels table')
    }

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
  }
}

debugUserHotelMapping().catch(console.error)