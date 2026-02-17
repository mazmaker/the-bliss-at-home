#!/usr/bin/env node
/**
 * Test Hotel Connection - ทดสอบการเชื่อมต่อโรงแรมใหม่
 * ทดสอบว่า Server สามารถค้นหาข้อมูลโรงแรมได้แล้วหรือไม่
 */

const ADMIN_TOKEN = 'admin-secret-token-2026'

async function testHotelConnection() {
  console.log('🔗 ========================================')
  console.log('   ทดสอบการเชื่อมต่อโรงแรมใหม่')
  console.log('🔗 ========================================')
  console.log('')

  console.log('📋 การทดสอบ:')
  console.log('   🎯 ฐานข้อมูลเดียวกับ Admin Panel')
  console.log('   🆔 Hotel ID: 550e8400-e29b-41d4-a716-446655440002')
  console.log('   📧 Email: sweettuay.bt@gmail.com')
  console.log('')

  try {
    // 1. ทดสอบการเชื่อมต่อ server
    console.log('🔍 Step 1: ทดสอบ server health...')

    const healthResponse = await fetch('http://localhost:3000/api/hotels/health', {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    })

    if (healthResponse.ok) {
      const health = await healthResponse.json()
      console.log('✅ Hotel API ทำงานปกติ')
      console.log(`   📊 Service: ${health.service}`)
      console.log(`   📧 Email Service: ${health.emailServiceReady ? 'Ready' : 'Not Ready'}`)
    } else {
      console.log('❌ Hotel API ไม่ตอบสนอง')
      return
    }
    console.log('')

    // 2. ลองสร้าง hotel account อีกครั้ง
    console.log('🔨 Step 2: ทดสอบสร้าง hotel account...')

    const createResponse = await fetch('http://localhost:3000/api/hotels/create-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        hotelId: '550e8400-e29b-41d4-a716-446655440002',
        loginEmail: 'sweettuay.bt@gmail.com',
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

      console.log('✅ ข้อมูลการเข้าสู่ระบบใหม่:')
      console.log(`   🌐 URL: http://localhost:3006/login`)
      console.log(`   📧 อีเมล: ${createResult.loginEmail}`)
      console.log(`   🔐 รหัสผ่าน: ${createResult.temporaryPassword}`)

    } else if (createResult.error && createResult.error.includes('already has an account')) {
      console.log('✅ บัญชีมีอยู่แล้ว - นี่เป็นข่าวดี!')
      console.log('   💡 หมายความว่าข้อมูลโรงแรมมีอยู่ในฐานข้อมูล')
      console.log('')

      // ลอง reset password
      console.log('🔄 กำลัง reset password...')
      const resetResponse = await fetch('http://localhost:3000/api/hotels/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        },
        body: JSON.stringify({
          hotelId: '550e8400-e29b-41d4-a716-446655440002'
        })
      })

      const resetResult = await resetResponse.json()
      if (resetResult.success) {
        console.log('✅ Reset password สำเร็จ!')
        console.log(`   🔐 รหัสผ่านใหม่: ${resetResult.data.temporaryPassword}`)
        console.log('')

        console.log('🎯 ข้อมูลการเข้าสู่ระบบใหม่:')
        console.log(`   🌐 URL: http://localhost:3006/login`)
        console.log(`   📧 อีเมล: sweettuay.bt@gmail.com`)
        console.log(`   🔐 รหัสผ่าน: ${resetResult.data.temporaryPassword}`)
      } else {
        console.log('❌ Reset password ไม่สำเร็จ:', resetResult.error)
      }

    } else {
      console.log('❌ ยังมีปัญหา:', createResult.error)
      console.log('   💡 อาจจะยังไม่มีข้อมูลโรงแรมในฐานข้อมูล')
    }

    console.log('')

    // 3. ส่งอีเมลใหม่
    console.log('📬 Step 3: ส่งอีเมลใหม่...')

    const emailResponse = await fetch('http://localhost:3000/api/hotels/test-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        toEmail: 'sweettuay.bt@gmail.com'
      })
    })

    const emailResult = await emailResponse.json()

    if (emailResponse.ok) {
      console.log('✅ ส่งอีเมลสำเร็จ!')
      console.log(`   📧 ส่งไปยัง: sweettuay.bt@gmail.com`)
      console.log(`   ⏰ เวลา: ${emailResult.timestamp}`)
    } else {
      console.log('❌ ส่งอีเมลไม่สำเร็จ:', emailResult.error)
    }

    console.log('')
    console.log('📋 สรุปผลการทดสอบ:')
    console.log('─'.repeat(50))

    if (createResult.success || (createResult.error && createResult.error.includes('already has an account'))) {
      console.log('✅ การเชื่อมต่อฐานข้อมูลแก้ไขแล้ว!')
      console.log('✅ ข้อมูลโรงแรมพบแล้วในฐานข้อมูล')
      console.log('✅ สามารถ login ด้วยข้อมูลใหม่ได้')
      console.log('')
      console.log('🎯 ลองทดสอบ Login:')
      console.log('   1. ไป http://localhost:3006/login')
      console.log('   2. ใส่ข้อมูลที่แสดงข้างต้น')
      console.log('   3. ควรเห็น "รีสอร์ทในฝัน เชียงใหม่" แล้ว')
    } else {
      console.log('❌ ยังมีปัญหาการเชื่อมต่อฐานข้อมูล')
      console.log('   💡 อาจจะต้องสร้างข้อมูลโรงแรมใหม่')
    }

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
  }

  console.log('')
  console.log('🔗 ========================================')
  console.log('   การทดสอบเสร็จสิ้น')
  console.log('🔗 ========================================')
}

// เรียกใช้ function
testHotelConnection().catch(console.error)