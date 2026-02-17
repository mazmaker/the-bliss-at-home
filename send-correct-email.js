#!/usr/bin/env node
/**
 * Send Email to Correct Address
 * ส่งอีเมลไปยังอีเมลที่ถูกต้องจาก Database
 * sweettuay.bt@gmail.com (ตามข้อมูลใน Admin)
 */

const ADMIN_TOKEN = 'admin-secret-token-2026'

async function sendCorrectEmail() {
  console.log('📧 ==========================================')
  console.log('   ส่งอีเมลไปยังที่อยู่ที่ถูกต้อง')
  console.log('📧 ==========================================')
  console.log('')

  try {
    // 1. ข้อมูลที่ถูกต้องจาก Admin
    const correctData = {
      hotelId: '550e8400-e29b-41d4-a716-446655440002',
      correctEmail: 'sweettuay.bt@gmail.com', // จาก Admin panel
      hotelName: 'รีสอร์ทในฝัน เชียงใหม่',
      phone: '053-123-456'
    }

    console.log('📋 ข้อมูลจาก Admin System:')
    console.log(`   🏨 Hotel ID: ${correctData.hotelId}`)
    console.log(`   📧 อีเมลที่ถูกต้อง: ${correctData.correctEmail}`)
    console.log(`   📞 เบอร์โทร: ${correctData.phone}`)
    console.log(`   🏨 ชื่อโรงแรม: ${correctData.hotelName}`)
    console.log('')

    // 2. ส่งอีเมลทดสอบไปยังอีเมลที่ถูกต้อง
    console.log('📬 กำลังส่งอีเมลไปยังอีเมลที่ถูกต้อง...')

    const response = await fetch('http://localhost:3000/api/hotels/test-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        toEmail: correctData.correctEmail // ใช้อีเมลที่ถูกต้องจาก Admin
      })
    })

    const result = await response.json()

    if (response.ok) {
      console.log('🎉 ส่งอีเมลสำเร็จ!')
      console.log('')
      console.log('✅ รายละเอียด:')
      console.log(`   📨 ส่งไปยัง: ${correctData.correctEmail}`)
      console.log(`   ⏰ เวลา: ${result.timestamp}`)
      console.log('   📧 Message:', result.message)
      console.log('')

      console.log('🌟 ผลลัพธ์:')
      console.log('   1. ✅ ส่งอีเมลไปยังอีเมลที่ถูกต้องแล้ว')
      console.log('   2. ✅ อีเมลจะมีข้อมูลการเข้าสู่ระบบ')
      console.log('   3. ✅ รหัสผ่านชั่วคราว: Test123456!')
      console.log('   4. ✅ URL: http://localhost:3006/login')
      console.log('')

      // 3. แสดงข้อมูลการเข้าสู่ระบบที่ถูกต้อง
      console.log('🎯 ข้อมูลการเข้าสู่ระบบที่ถูกต้อง:')
      console.log(`   🌐 URL: http://localhost:3006/login`)
      console.log(`   📧 อีเมล: ${correctData.correctEmail}`)
      console.log('   🔐 รหัสผ่าน: Test123456! (จากอีเมล)')
      console.log(`   🏨 โรงแรม: ${correctData.hotelName}`)
      console.log('')

      // 4. ตรวจสอบ Ethereal Email
      console.log('🔍 ตรวจสอบอีเมลได้ที่:')
      console.log('   🌐 Ethereal Email: https://ethereal.email')
      console.log('   👀 ตรวจสอบ Console Logs ของ Server สำหรับข้อมูล Test Account')

    } else {
      console.log('❌ ส่งอีเมลไม่สำเร็จ:', result.error)
      console.log('   💡 Message:', result.message)
    }

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
  }

  console.log('')
  console.log('📧 ==========================================')
  console.log('   การส่งอีเมลเสร็จสิ้น')
  console.log('📧 ==========================================')
}

// เรียกใช้ function
sendCorrectEmail().catch(console.error)