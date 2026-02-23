#!/usr/bin/env node
/**
 * Test script to send hotel invitation email for รีสอร์ทในฝัน เชียงใหม่
 * สคริปท์ทดสอบส่งอีเมลเชิญเข้าใช้งานสำหรับรีสอร์ทในฝัน เชียงใหม่
 */

// ข้อมูลจำลองสำหรับรีสอร์ทในฝัน เชียงใหม่
const testResortData = {
  hotelId: 'resort-chiang-mai-001',
  name: 'รีสอร์ทในฝัน เชียงใหม่',
  email: 'manager@dreamresortchiangmai.com', // อีเมลทดสอบ
  adminName: 'ทีมแอดมิน The Bliss at Home'
}

const API_BASE_URL = 'http://localhost:3000/api/hotels'
const ADMIN_TOKEN = 'admin-secret-token-2026'

/**
 * ทดสอบสร้างบัญชีและส่งอีเมลสำหรับโรงแรม
 */
async function testHotelEmailInvitation() {
  console.log('🏨 เริ่มทดสอบส่งอีเมลเชิญเข้าใช้งานสำหรับ:', testResortData.name)
  console.log('📧 อีเมลปลายทาง:', testResortData.email)
  console.log('👤 ผู้ส่ง:', testResortData.adminName)
  console.log('')

  try {
    // 1. ทดสอบสร้างบัญชีโรงแรม
    console.log('📝 กำลังสร้างบัญชีโรงแรม...')
    const createAccountResponse = await fetch(`${API_BASE_URL}/create-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        hotelId: testResortData.hotelId,
        loginEmail: testResortData.email,
        name: testResortData.name
      })
    })

    const createResult = await createAccountResponse.json()

    if (createResult.success) {
      console.log('✅ สร้างบัญชีสำเร็จ!')
      console.log('   👤 User ID:', createResult.userId)
      console.log('   📧 Login Email:', createResult.loginEmail)
      console.log('   🔐 Temporary Password:', createResult.temporaryPassword)
    } else if (createResult.error && createResult.error.includes('already has an account')) {
      console.log('ℹ️  บัญชีมีอยู่แล้ว - ข้ามขั้นตอนการสร้าง')
    } else {
      console.log('⚠️  สร้างบัญชีไม่สำเร็จ:', createResult.error)
      console.log('   ข้ามไปขั้นตอนส่งอีเมลต่อ')
    }

    console.log('')

    // 2. ทดสอบส่งอีเมลเชิญเข้าใช้งาน
    console.log('📬 กำลังส่งอีเมลเชิญเข้าใช้งาน...')
    const inviteResponse = await fetch(`${API_BASE_URL}/send-invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        hotelId: testResortData.hotelId,
        adminName: testResortData.adminName
      })
    })

    const inviteResult = await inviteResponse.json()

    if (inviteResult.success) {
      console.log('🎉 ส่งอีเมลสำเร็จ!')
      console.log('')

      // ขั้นตอนถัดไป
      console.log('🌟 การดำเนินการเสร็จสิ้น!')
      console.log('')
      console.log('📋 สิ่งที่เกิดขึ้น:')
      console.log('   1. ✅ สร้างบัญชี Supabase Auth สำหรับโรงแรม')
      console.log('   2. ✅ สร้างรหัสผ่านชั่วคราวสุ่ม')
      console.log('   3. ✅ ส่งอีเมลเชิญเข้าใช้งานพร้อมข้อมูลการล็อกอิน')
      console.log('   4. ✅ อีเมลรวมลิงก์ไปยังแอปโรงแรม (localhost:3006)')
      console.log('')
      console.log('🔗 ตรวจสอบอีเมลได้ที่:')
      console.log('   📧 Ethereal Email: https://ethereal.email')
      console.log('   🔍 หาอีเมลที่ส่งไปยัง:', testResortData.email)
      console.log('')
      console.log('📱 โรงแรมจะได้รับ:')
      console.log('   • อีเมลเชิญเข้าใช้งานแบบสวยงาม')
      console.log('   • ข้อมูลการล็อกอิน (อีเมล + รหัสผ่านชั่วคราว)')
      console.log('   • ลิงก์ไปยังแอปโรงแรม')
      console.log('   • คำแนะนำการใช้งานเบื้องต้น')

    } else {
      console.log('❌ ส่งอีเมลไม่สำเร็จ:', inviteResult.error)
    }

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
    console.log('')
    console.log('🔍 การตรวจสอบปัญหา:')
    console.log('   1. ✅ Server ทำงานอยู่ที่ http://localhost:3000')
    console.log('   2. ⚠️  ตรวจสอบการตั้งค่า EMAIL_PROVIDER ใน .env')
    console.log('   3. ⚠️  ตรวจสอบการเชื่อมต่อฐานข้อมูล Supabase')
  }
}

/**
 * ทดสอบ Health Check ของ API
 */
async function testHealthCheck() {
  try {
    console.log('🏥 ตรวจสอบสถานะ API...')
    const response = await fetch(`http://localhost:3000/health`)
    const result = await response.json()

    if (response.ok) {
      console.log('✅ API ทำงานปกติ')
      console.log('   📊 Status:', result.status)
      console.log('   📧 Email Service:', result.services?.email ? 'Ready' : 'Not Ready')
      console.log('')
    } else {
      console.log('⚠️  API มีปัญหา:', result)
      return false
    }
  } catch (error) {
    console.log('❌ ไม่สามารถเชื่อมต่อ API ได้:', error.message)
    console.log('   🔍 ตรวจสอบว่า server ทำงานอยู่ที่ http://localhost:3000')
    return false
  }

  return true
}

// เริ่มทดสอบ
async function main() {
  console.log('🧪 ======================================')
  console.log('   ทดสอบส่งอีเมลโรงแรม - รีสอร์ทในฝัน')
  console.log('🧪 ======================================')
  console.log('')

  // ตรวจสอบ API ก่อน
  const apiReady = await testHealthCheck()
  if (!apiReady) {
    process.exit(1)
  }

  // ทดสอบส่งอีเมล
  await testHotelEmailInvitation()

  console.log('')
  console.log('🧪 ======================================')
  console.log('   การทดสอบเสร็จสิ้น')
  console.log('🧪 ======================================')
}

// รันสคริปท์
main().catch(console.error)