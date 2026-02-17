#!/usr/bin/env node
/**
 * Create Correct Hotel Account - ใช้ Hotel ID ที่มีอยู่จริง
 * สร้าง auth account ด้วย Hotel ID จาก Admin seedHotelData.ts
 */

const ADMIN_TOKEN = 'admin-secret-token-2026'

// ข้อมูล Hotel ที่มีอยู่จริงในฐานข้อมูล (จาก seedHotelData.ts)
const REAL_HOTEL_ID = '3082d55a-b185-49b9-b4fc-01c00d61e7e1'
const DESIRED_LOGIN_EMAIL = 'sweettuay.bt@gmail.com'

async function createCorrectHotelAccount() {
  console.log('✅ ========================================')
  console.log('   สร้าง Hotel Account ด้วย ID ที่ถูกต้อง')
  console.log('✅ ========================================')
  console.log('')

  console.log('📋 ข้อมูลที่จะใช้:')
  console.log(`   🆔 Hotel ID (จริง): ${REAL_HOTEL_ID}`)
  console.log(`   📧 Login Email: ${DESIRED_LOGIN_EMAIL}`)
  console.log(`   🏨 ชื่อโรงแรม: รีสอร์ทในฝัน เชียงใหม่`)
  console.log('')

  try {
    // 1. ทดสอบ server
    console.log('🔍 Step 1: ทดสอบ server health...')

    const healthResponse = await fetch('http://localhost:3000/api/hotels/health', {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    })

    if (healthResponse.ok) {
      const health = await healthResponse.json()
      console.log('✅ Server ทำงานปกติ')
      console.log(`   📊 Service: ${health.service}`)
    } else {
      console.log('❌ Server ไม่ตอบสนอง')
      return
    }
    console.log('')

    // 2. สร้าง hotel account ด้วย Hotel ID ที่มีอยู่จริง
    console.log('🔨 Step 2: สร้าง hotel account ด้วย ID ที่มีอยู่จริง...')

    const createResponse = await fetch('http://localhost:3000/api/hotels/create-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        hotelId: REAL_HOTEL_ID,
        loginEmail: DESIRED_LOGIN_EMAIL,
        name: 'รีสอร์ทในฝัน เชียงใหม่'
      })
    })

    const createResult = await createResponse.json()

    if (createResult.success) {
      console.log('🎉 สร้าง hotel account สำเร็จ!')
      console.log(`   👤 User ID: ${createResult.userId}`)
      console.log(`   📧 Login Email: ${createResult.loginEmail}`)
      console.log(`   🔐 Temporary Password: ${createResult.temporaryPassword}`)
      console.log('')

      // ส่งอีเมล
      console.log('📧 Step 3: ส่งอีเมลเชิญ...')
      const emailResponse = await fetch('http://localhost:3000/api/hotels/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        },
        body: JSON.stringify({
          toEmail: DESIRED_LOGIN_EMAIL
        })
      })

      const emailResult = await emailResponse.json()
      if (emailResponse.ok) {
        console.log('✅ ส่งอีเมลสำเร็จ!')
        console.log(`   📧 ส่งไปยัง: ${DESIRED_LOGIN_EMAIL}`)
        console.log(`   ⏰ เวลา: ${emailResult.timestamp}`)
      } else {
        console.log('⚠️  ส่งอีเมลไม่สำเร็จ:', emailResult.error)
      }

      console.log('')
      console.log('🎯 ข้อมูลการเข้าสู่ระบบใหม่:')
      console.log('─'.repeat(50))
      console.log(`   🌐 URL: http://localhost:3006/login`)
      console.log(`   📧 อีเมล: ${createResult.loginEmail}`)
      console.log(`   🔐 รหัสผ่าน: ${createResult.temporaryPassword}`)
      console.log(`   🏨 โรงแรม: รีสอร์ทในฝัน เชียงใหม่`)
      console.log('')

      console.log('✨ คาดหว่าง Login แล้วจะแสดงชื่อโรงแรมที่ถูกต้อง!')

    } else if (createResult.error && createResult.error.includes('already has an account')) {
      console.log('🔄 บัญชีมีอยู่แล้ว - กำลัง reset password...')

      const resetResponse = await fetch('http://localhost:3000/api/hotels/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        },
        body: JSON.stringify({
          hotelId: REAL_HOTEL_ID
        })
      })

      const resetResult = await resetResponse.json()
      if (resetResult.success) {
        console.log('✅ Reset password สำเร็จ!')
        console.log('')

        // ส่งอีเมล
        console.log('📧 ส่งอีเมลใหม่...')
        const emailResponse = await fetch('http://localhost:3000/api/hotels/test-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ADMIN_TOKEN}`
          },
          body: JSON.stringify({
            toEmail: DESIRED_LOGIN_EMAIL
          })
        })

        const emailResult = await emailResponse.json()
        if (emailResponse.ok) {
          console.log('✅ ส่งอีเมลสำเร็จ!')
          console.log(`   ⏰ เวลา: ${emailResult.timestamp}`)
        }

        console.log('')
        console.log('🎯 ข้อมูลการเข้าสู่ระบบใหม่:')
        console.log('─'.repeat(50))
        console.log(`   🌐 URL: http://localhost:3006/login`)
        console.log(`   📧 อีเมล: ${DESIRED_LOGIN_EMAIL}`)
        console.log(`   🔐 รหัสผ่าน: ${resetResult.data.temporaryPassword}`)
        console.log(`   🏨 โรงแรม: รีสอร์ทในฝัน เชียงใหม่`)

      } else {
        console.log('❌ Reset password ไม่สำเร็จ:', resetResult.error)
      }

    } else {
      console.log('❌ ยังไม่สำเร็จ:', createResult.error)
      console.log('')

      // แสดงข้อมูล debug
      if (createResult.error.includes('Hotel not found')) {
        console.log('🔍 Debug Information:')
        console.log('   ❌ Hotel ID ที่เรียกหา:', REAL_HOTEL_ID)
        console.log('   💡 อาจจะต้องตรวจสอบฐานข้อมูลว่าใช้ ID อะไร')
        console.log('')

        console.log('💭 วิธีแก้ไข:')
        console.log('   1. เช็คว่า Admin Panel ใช้ Hotel ID อะไรจริงๆ')
        console.log('   2. ตรวจสอบตาราง hotels ในฐานข้อมูล')
        console.log('   3. หรือสร้างโรงแรมใหม่ด้วย ID ที่ต้องการ')
      }
    }

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
  }

  console.log('')
  console.log('✅ ========================================')
  console.log('   การสร้าง Hotel Account เสร็จสิ้น')
  console.log('✅ ========================================')
  console.log('')

  console.log('📧 ข้อมูล Ethereal Email ล่าสุด:')
  console.log('   🌐 https://ethereal.email')
  console.log('   👤 User: n7jxb5zr2uducdvt@ethereal.email')
  console.log('   🔐 Pass: eWav2pm5CFza1MU8US')
}

// เรียกใช้ function
createCorrectHotelAccount().catch(console.error)