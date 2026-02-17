#!/usr/bin/env node
/**
 * Final Test - ทดสอบสร้าง account ด้วยทั้ง 2 Hotel IDs
 * ทดสอบ ID ทั้ง 2 ตัวที่มีอยู่จริงในฐานข้อมูล
 */

const ADMIN_TOKEN = 'admin-secret-token-2026'
const DESIRED_LOGIN_EMAIL = 'sweettuay.bt@gmail.com'

// โรงแรม 2 รายการที่มีชื่อเดียวกัน
const HOTELS = [
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'รีสอร์ทในฝัน เชียงใหม่ (ID เดิม)'
  },
  {
    id: '3082d55a-b185-49b9-b4fc-01c00d61e7e1',
    name: 'รีสอร์ทในฝัน เชียงใหม่ (Seed ID)'
  }
]

async function finalTest() {
  console.log('🎯 ========================================')
  console.log('   Final Test - ทดสอบทั้ง 2 Hotel IDs')
  console.log('🎯 ========================================')
  console.log('')

  console.log('📋 Hotel IDs ที่จะทดสอบ:')
  HOTELS.forEach((hotel, index) => {
    console.log(`   ${index + 1}. ${hotel.name}`)
    console.log(`      🆔 ID: ${hotel.id}`)
  })
  console.log('')

  try {
    // ทดสอบสร้าง account กับแต่ละ hotel
    for (const hotel of HOTELS) {
      console.log(`🔨 ทดสอบสร้าง account สำหรับ: ${hotel.name}`)
      console.log(`   🆔 Hotel ID: ${hotel.id}`)
      console.log('')

      const createResponse = await fetch('http://localhost:3000/api/hotels/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        },
        body: JSON.stringify({
          hotelId: hotel.id,
          loginEmail: DESIRED_LOGIN_EMAIL,
          name: 'รีสอร์ทในฝัน เชียงใหม่'
        })
      })

      const createResult = await createResponse.json()

      if (createResult.success) {
        console.log('🎉 สำเร็จ! สร้าง hotel account ได้แล้ว!')
        console.log(`   👤 User ID: ${createResult.userId}`)
        console.log(`   📧 Login Email: ${createResult.loginEmail}`)
        console.log(`   🔐 Temporary Password: ${createResult.temporaryPassword}`)
        console.log('')

        // ส่งอีเมลทดสอบ
        console.log('📧 ส่งอีเมลทดสอบ...')

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
        console.log('🌟 ========================================')
        console.log('   🎉 การแก้ไขปัญหาสมบูรณ์!')
        console.log('🌟 ========================================')
        console.log('')
        console.log('🎯 ข้อมูลการเข้าสู่ระบบใหม่:')
        console.log(`   🌐 URL: http://localhost:3006/login`)
        console.log(`   📧 อีเมล: ${createResult.loginEmail}`)
        console.log(`   🔐 รหัสผ่าน: ${createResult.temporaryPassword}`)
        console.log(`   🏨 โรงแรม: รีสอร์ทในฝัน เชียงใหม่`)
        console.log('')
        console.log('✨ คาดหวังว่า Login แล้วจะแสดงชื่อโรงแรมที่ถูกต้อง!')
        console.log('')

        console.log('📧 ตรวจสอบอีเมลได้ที่:')
        console.log('   🌐 https://ethereal.email')
        console.log('   👤 User: n7jxb5zr2uducdvt@ethereal.email')
        console.log('   🔐 Pass: eWav2pm5CFza1MU8US')

        // หยุดการทดสอบเมื่อสำเร็จแล้ว
        break

      } else if (createResult.error && createResult.error.includes('already has an account')) {
        console.log('🔄 บัญชีมีอยู่แล้ว - ลอง reset password...')

        const resetResponse = await fetch('http://localhost:3000/api/hotels/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ADMIN_TOKEN}`
          },
          body: JSON.stringify({
            hotelId: hotel.id
          })
        })

        const resetResult = await resetResponse.json()
        if (resetResult.success) {
          console.log('✅ Reset password สำเร็จ!')
          console.log('')

          // ส่งอีเมล
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
          console.log('🌟 ========================================')
          console.log('   🎉 Reset Password สมบูรณ์!')
          console.log('🌟 ========================================')
          console.log('')
          console.log('🎯 ข้อมูลการเข้าสู่ระบบใหม่:')
          console.log(`   🌐 URL: http://localhost:3006/login`)
          console.log(`   📧 อีเมล: ${DESIRED_LOGIN_EMAIL}`)
          console.log(`   🔐 รหัสผ่าน: ${resetResult.data.temporaryPassword}`)
          console.log(`   🏨 โรงแรม: รีสอร์ทในฝัน เชียงใหม่`)

          // หยุดเมื่อสำเร็จ
          break

        } else {
          console.log('❌ Reset password ไม่สำเร็จ:', resetResult.error)
        }

      } else {
        console.log('❌ ยังไม่สำเร็จ:', createResult.error)
      }

      console.log('')
      console.log('─'.repeat(50))
      console.log('')
    }

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
  }

  console.log('')
  console.log('🎯 ========================================')
  console.log('   การทดสอบเสร็จสิ้น')
  console.log('🎯 ========================================')
}

finalTest().catch(console.error)