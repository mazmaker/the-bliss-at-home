#!/usr/bin/env node
/**
 * Test Anon Key - ทดสอบด้วย anon key จาก Admin app
 */

const { createClient } = require('@supabase/supabase-js')

// ข้อมูลจาก Admin app (.env.local)
const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const HOTEL_ID = '3082d55a-b185-49b9-b4fc-01c00d61e7e1'

async function testAnonKey() {
  console.log('🔐 ========================================')
  console.log('   ทดสอบด้วย Anon Key')
  console.log('🔐 ========================================')
  console.log('')

  console.log('📋 ข้อมูลการเชื่อมต่อ:')
  console.log(`   🌐 URL: ${SUPABASE_URL}`)
  console.log(`   🔑 Anon Key: ${SUPABASE_ANON_KEY.substring(0, 50)}...`)
  console.log('')

  try {
    // สร้าง Supabase client ด้วย anon key
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // 1. ทดสอบ query โรงแรมทั้งหมด
    console.log('🏨 Step 1: ดูโรงแรมทั้งหมด (anon permissions)...')

    const { data: allHotels, error: allError } = await supabase
      .from('hotels')
      .select('*')

    if (allError) {
      console.log('❌ ไม่สามารถดึงข้อมูลโรงแรมได้ด้วย anon key')
      console.log(`   Error: ${allError.message}`)
      console.log(`   Code: ${allError.code}`)
      console.log(`   Hint: ${allError.hint}`)
    } else {
      console.log(`✅ สามารถดึงข้อมูลได้: ${allHotels.length} โรงแรม`)

      if (allHotels.length > 0) {
        console.log('')
        console.log('🏨 รายการโรงแรม:')
        allHotels.forEach((hotel, index) => {
          console.log(`   ${index + 1}. ${hotel.name_th || hotel.name || 'ไม่มีชื่อ'}`)
          console.log(`      🆔 ID: ${hotel.id}`)
          console.log(`      📧 Email: ${hotel.email || 'ไม่มี'}`)
          console.log('')
        })
      }
    }

    console.log('')

    // 2. ทดสอบหาโรงแรมเป้าหมาย
    console.log('🎯 Step 2: หาโรงแรมเป้าหมาย...')

    const { data: targetHotel, error: targetError } = await supabase
      .from('hotels')
      .select('*')
      .eq('id', HOTEL_ID)
      .single()

    if (targetError || !targetHotel) {
      console.log('❌ ไม่พบโรงแรมเป้าหมายด้วย anon key')
      if (targetError) {
        console.log(`   Error: ${targetError.message}`)
        console.log(`   Code: ${targetError.code}`)
      }
    } else {
      console.log('✅ พบโรงแรมเป้าหมาย!')
      console.log(`   🏨 ชื่อ: ${targetHotel.name_th}`)
      console.log(`   📧 Email: ${targetHotel.email}`)
      console.log(`   📧 Login Email: ${targetHotel.login_email || 'ไม่มี'}`)
      console.log(`   🔑 Auth User ID: ${targetHotel.auth_user_id || 'ไม่มี'}`)
      console.log(`   🔐 Login Enabled: ${targetHotel.login_enabled ? 'เปิด' : 'ปิด'}`)
    }

    console.log('')

    // 3. สรุปปัญหาและแนวทางแก้ไข
    console.log('💡 การวิเคราะห์ปัญหา:')
    console.log('')

    if (allHotels && allHotels.length > 0 && targetHotel) {
      console.log('✅ ฐานข้อมูลมีข้อมูลโรงแรมและเข้าถึงได้')
      console.log('❌ แต่ Server ใช้ Service Role Key ที่ผิด')
      console.log('')
      console.log('🛠️  วิธีแก้ไข:')
      console.log('   1. หา Service Role Key ที่ถูกต้องจาก Supabase Dashboard')
      console.log('   2. หรือใช้ anon key แต่ต้องแก้ไข RLS policies')
      console.log('   3. หรือสร้าง auth account ผ่าน Admin UI โดยตรง')
      console.log('')

      if (targetHotel.auth_user_id) {
        console.log('🔄 โรงแรมมี auth account แล้ว!')
        console.log('   💡 ลอง reset password แทนการสร้างใหม่')

        console.log('')
        console.log('🎯 ข้อมูลการเข้าสู่ระบบปัจจุบัน:')
        console.log(`   🌐 URL: http://localhost:3006/login`)
        console.log(`   📧 อีเมล: ${targetHotel.login_email || targetHotel.email}`)
        console.log(`   🔐 รหัสผ่าน: (ดูในตาราง temporary_password)`)
        console.log(`   🏨 โรงแรม: ${targetHotel.name_th}`)

      } else {
        console.log('🔨 ต้องสร้าง auth account ให้โรงแรม')
      }
    } else {
      console.log('❌ ปัญหาการเข้าถึงฐานข้อมูล')
      console.log('   💡 ตรวจสอบ RLS policies หรือ permissions')
    }

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
  }

  console.log('')
  console.log('🔐 ========================================')
  console.log('   การทดสอบเสร็จสิ้น')
  console.log('🔐 ========================================')
}

testAnonKey().catch(console.error)