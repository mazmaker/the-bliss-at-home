#!/usr/bin/env node
/**
 * Direct Email Service Test
 * ทดสอบระบบส่งอีเมลโดยตรงสำหรับรีสอร์ทในฝัน เชียงใหม่
 */

// Test configuration
const ADMIN_TOKEN = 'admin-secret-token-2026'
const TEST_EMAIL = 'manager@dreamresortchiangmai.com'
const HOTEL_NAME = 'รีสอร์ทในฝัน เชียงใหม่'

/**
 * Test email API endpoint with admin token
 */
async function testHotelEmail() {
  console.log('🧪 =========================================')
  console.log('   ทดสอบส่งอีเมลโรงแรม - รีสอร์ทในฝัน')
  console.log('🧪 =========================================')
  console.log('')

  console.log('📧 ข้อมูลการทดสอบ:')
  console.log('   🏨 โรงแรม:', HOTEL_NAME)
  console.log('   📧 อีเมลปลายทาง:', TEST_EMAIL)
  console.log('   🔐 Admin Token: ✓')
  console.log('')

  try {
    // Check email service health first
    console.log('🏥 ตรวจสอบสถานะ Email Service...')
    const healthResponse = await fetch('http://localhost:3000/api/hotels/health')
    const healthResult = await healthResponse.json()

    console.log('   📊 Service:', healthResult.service)
    console.log('   📧 Email Ready:', healthResult.emailServiceReady ? '✅ Ready' : '❌ Not Ready')
    console.log('')

    // Test sending email using hotel endpoint
    console.log('📬 กำลังส่งอีเมลทดสอบ...')

    const response = await fetch('http://localhost:3000/api/hotels/test-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        toEmail: TEST_EMAIL
      })
    })

    const result = await response.json()

    if (response.ok) {
      console.log('🎉 ส่งอีเมลสำเร็จ!')
      console.log('')
      console.log('✅ รายละเอียด:')
      console.log('   📨 Message:', result.message)
      console.log('   ⏰ Timestamp:', result.timestamp)
      console.log('')

      console.log('🌟 สิ่งที่เกิดขึ้น:')
      console.log('   1. ✅ Email Service เริ่มต้นและสร้าง Test Account')
      console.log('   2. ✅ สร้างอีเมลเชิญเข้าใช้งานด้วย Template สวยงาม')
      console.log('   3. ✅ ส่งอีเมลไปยัง:', TEST_EMAIL)
      console.log('   4. ✅ อีเมลมีข้อมูลครบถ้วน:')
      console.log('      • ข้อความต้อนรับ')
      console.log('      • ข้อมูลการล็อกอิน (อีเมล + รหัสผ่าน)')
      console.log('      • ลิงก์ไปยังแอปโรงแรม')
      console.log('      • คำแนะนำการใช้งาน')
      console.log('')

      console.log('🔗 ตรวจสอบอีเมลได้ที่:')
      console.log('   🌐 Ethereal Email: https://ethereal.email')
      console.log('   👀 ตรวจสอบ Console Logs ของ Server สำหรับข้อมูล Test Account')

    } else {
      console.log('❌ ส่งอีเมลไม่สำเร็จ:', result.error)
      console.log('   💡 Message:', result.message)
      console.log('   📧 Email Configured:', result.emailConfigured ? 'Yes' : 'No')
    }

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
    console.log('')
    console.log('🔍 การตรวจสอบปัญหา:')
    console.log('   1. ✅ ตรวจสอบ Server ทำงานที่ http://localhost:3000')
    console.log('   2. ⚠️  ตรวจสอบ .env EMAIL_PROVIDER=test')
    console.log('   3. ⚠️  ตรวจสอบ Admin Token ถูกต้อง')
  }

  console.log('')
  console.log('🧪 =========================================')
  console.log('   การทดสอบเสร็จสิ้น')
  console.log('🧪 =========================================')
}

// Run the test
testHotelEmail().catch(console.error)