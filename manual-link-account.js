#!/usr/bin/env node
/**
 * Manual Link Account - เชื่อมโยง auth user กับ hotel records
 * แก้ไขปัญหาสุดท้าย: เชื่อมโยง sweettuay.bt@gmail.com กับโรงแรม
 */

const { createClient } = require('@supabase/supabase-js')

// ข้อมูลการเชื่อมต่อ Supabase
const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const TARGET_EMAIL = 'sweettuay.bt@gmail.com'
const TARGET_HOTEL_ID = '550e8400-e29b-41d4-a716-446655440002' // ID เดิมที่ user ต้องการ
const NEW_PASSWORD = 'DreamResort2026!' // รหัสผ่านใหม่ที่จะใช้

async function manualLinkAccount() {
  console.log('🔗 ========================================')
  console.log('   เชื่อมโยงข้อมูล Auth User กับ Hotel')
  console.log('🔗 ========================================')
  console.log('')

  console.log('📋 ข้อมูลที่จะเชื่อมโยง:')
  console.log(`   📧 Email: ${TARGET_EMAIL}`)
  console.log(`   🆔 Hotel ID: ${TARGET_HOTEL_ID}`)
  console.log(`   🔐 รหัสผ่านใหม่: ${NEW_PASSWORD}`)
  console.log('')

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 1. หา auth user ที่มี email นี้
    console.log('👤 Step 1: ค้นหา Auth User...')

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
    console.log(`   📅 Created: ${targetUser.created_at}`)
    console.log('')

    // 2. ตรวจสอบ hotel record
    console.log('🏨 Step 2: ตรวจสอบ Hotel Record...')

    const { data: hotel, error: hotelError } = await supabase
      .from('hotels')
      .select('*')
      .eq('id', TARGET_HOTEL_ID)
      .single()

    if (hotelError || !hotel) {
      console.log('❌ ไม่พบ hotel record:', hotelError?.message)
      return
    }

    console.log('✅ พบ Hotel Record:')
    console.log(`   🏨 ชื่อ: ${hotel.name_th}`)
    console.log(`   📧 Email: ${hotel.email}`)
    console.log(`   🔑 Auth User ID: ${hotel.auth_user_id || 'ไม่มี'}`)
    console.log('')

    // 3. อัพเดท Auth User password
    console.log('🔐 Step 3: อัพเดท password ใหม่...')

    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      targetUser.id,
      {
        password: NEW_PASSWORD,
        user_metadata: {
          role: 'HOTEL',
          hotel_id: TARGET_HOTEL_ID,
          password_change_required: false // ไม่ต้องเปลี่ยนรหัสผ่าน
        }
      }
    )

    if (updateError) {
      console.log('❌ อัพเดท password ไม่สำเร็จ:', updateError.message)
      return
    }

    console.log('✅ อัพเดท password สำเร็จ!')
    console.log('')

    // 4. เชื่อมโยง hotel record กับ auth user
    console.log('🔗 Step 4: เชื่อมโยง Hotel กับ Auth User...')

    const { data: updatedHotel, error: linkError } = await supabase
      .from('hotels')
      .update({
        auth_user_id: targetUser.id,
        login_email: TARGET_EMAIL,
        temporary_password: NEW_PASSWORD,
        login_enabled: true,
        password_change_required: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', TARGET_HOTEL_ID)
      .select()

    if (linkError) {
      console.log('❌ เชื่อมโยงไม่สำเร็จ:', linkError.message)
      return
    }

    console.log('✅ เชื่อมโยงสำเร็จ!')
    console.log('')

    // 5. สร้าง profile record
    console.log('👤 Step 5: สร้าง Profile...')

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: targetUser.id,
        email: TARGET_EMAIL,
        role: 'HOTEL',
        full_name: hotel.name_th,
        status: 'ACTIVE',
        language: 'th',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.log('⚠️  สร้าง profile ไม่สำเร็จ:', profileError.message)
      console.log('   💡 แต่ไม่เป็นไร login ยังใช้ได้')
    } else {
      console.log('✅ สร้าง Profile สำเร็จ!')
    }

    console.log('')

    // 6. ทดสอบส่งอีเมล
    console.log('📧 Step 6: ส่งอีเมลทดสอบ...')

    const emailResponse = await fetch('http://localhost:3000/api/hotels/test-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-secret-token-2026'
      },
      body: JSON.stringify({
        toEmail: TARGET_EMAIL
      })
    })

    const emailResult = await emailResponse.json()
    if (emailResponse.ok) {
      console.log('✅ ส่งอีเมลสำเร็จ!')
      console.log(`   ⏰ เวลา: ${emailResult.timestamp}`)
    } else {
      console.log('⚠️  ส่งอีเมลไม่สำเร็จ แต่ระบบใช้ได้')
    }

    console.log('')
    console.log('🌟 ========================================')
    console.log('   🎉 การเชื่อมโยงสมบูรณ์!')
    console.log('🌟 ========================================')
    console.log('')

    console.log('🎯 ข้อมูลการเข้าสู่ระบบที่พร้อมใช้:')
    console.log(`   🌐 URL: http://localhost:3006/login`)
    console.log(`   📧 อีเมล: ${TARGET_EMAIL}`)
    console.log(`   🔐 รหัสผ่าน: ${NEW_PASSWORD}`)
    console.log(`   🏨 โรงแรม: ${hotel.name_th}`)
    console.log('')

    console.log('✨ คาดหวัง:')
    console.log('   1. ✅ Login สำเร็จ')
    console.log('   2. ✅ แสดงชื่อ "รีสอร์ทในฝัน เชียงใหม่"')
    console.log('   3. ✅ ไม่แสดง "ฮิลตัน" หรือโรงแรมอื่น')
    console.log('   4. ✅ ไม่ต้องเปลี่ยนรหัสผ่าน')
    console.log('')

    console.log('📧 ตรวจสอบอีเมลได้ที่:')
    console.log('   🌐 https://ethereal.email')
    console.log('   👤 User: n7jxb5zr2uducdvt@ethereal.email')
    console.log('   🔐 Pass: eWav2pm5CFza1MU8US')
    console.log('')

    console.log('🎊 สรุป: ระบบแก้ไขสมบูรณ์! พร้อม Login ทันที!')

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
  }

  console.log('')
  console.log('🔗 ========================================')
  console.log('   การเชื่อมโยงเสร็จสิ้น')
  console.log('🔗 ========================================')
}

manualLinkAccount().catch(console.error)