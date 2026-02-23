#!/usr/bin/env node
/**
 * Create New Account for Dream Resort Chiang Mai
 * สร้างบัญชีใหม่สำหรับรีสอร์ทในฝัน เชียงใหม่
 */

const ADMIN_TOKEN = 'admin-secret-token-2026'

const resortData = {
  hotelId: '550e8400-e29b-41d4-a716-446655440002', // รีสอร์ทในฝัน เชียงใหม่
  email: 'manager@dreamresortchiangmai.com', // อีเมลใหม่ที่ถูกต้อง
  name: 'รีสอร์ทในฝัน เชียงใหม่'
}

async function createResortAccount() {
  console.log('🏨 ========================================')
  console.log('   สร้างบัญชีใหม่ - รีสอร์ทในฝัน เชียงใหม่')
  console.log('🏨 ========================================')
  console.log('')

  console.log('📋 ข้อมูลบัญชีใหม่:')
  console.log(`   🏨 โรงแรม: ${resortData.name}`)
  console.log(`   🆔 Hotel ID: ${resortData.hotelId}`)
  console.log(`   📧 อีเมล: ${resortData.email}`)
  console.log('')

  try {
    // 1. สร้างบัญชีโรงแรม
    console.log('🔨 กำลังสร้างบัญชีโรงแรม...')
    const createResponse = await fetch('http://localhost:3000/api/hotels/create-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        hotelId: resortData.hotelId,
        loginEmail: resortData.email,
        name: resortData.name
      })
    })

    const createResult = await createResponse.json()

    if (createResult.success) {
      console.log('✅ สร้างบัญชีสำเร็จ!')
      console.log(`   👤 User ID: ${createResult.userId}`)
      console.log(`   📧 Login Email: ${createResult.loginEmail}`)
      console.log(`   🔐 Temporary Password: ${createResult.temporaryPassword}`)
      console.log('')

      // 2. ส่งอีเมลเชิญเข้าใช้งาน
      console.log('📬 กำลังส่งอีเมลเชิญเข้าใช้งาน...')
      const inviteResponse = await fetch('http://localhost:3000/api/hotels/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        },
        body: JSON.stringify({
          hotelId: resortData.hotelId,
          adminName: 'ทีมแอดมิน The Bliss at Home'
        })
      })

      const inviteResult = await inviteResponse.json()

      if (inviteResult.success) {
        console.log('✅ ส่งอีเมลสำเร็จ!')
        console.log('')

        console.log('🎉 การสร้างบัญชีเสร็จสมบูรณ์!')
        console.log('')
        console.log('📱 ข้อมูลการเข้าสู่ระบบ:')
        console.log(`   🌐 URL: http://localhost:3006/login`)
        console.log(`   📧 อีเมล: ${createResult.loginEmail}`)
        console.log(`   🔐 รหัสผ่านชั่วคราว: ${createResult.temporaryPassword}`)
        console.log('')
        console.log('⚠️  หมายเหตุ: โรงแรมจะต้องเปลี่ยนรหัสผ่านในการเข้าสู่ระบบครั้งแรก')

      } else {
        console.log('⚠️  สร้างบัญชีสำเร็จแต่ส่งอีเมลไม่ได้:', inviteResult.error)
        console.log('')
        console.log('📱 ข้อมูลการเข้าสู่ระบบ:')
        console.log(`   🌐 URL: http://localhost:3006/login`)
        console.log(`   📧 อีเมล: ${createResult.loginEmail}`)
        console.log(`   🔐 รหัสผ่านชั่วคราว: ${createResult.temporaryPassword}`)
      }

    } else {
      console.log('❌ สร้างบัญชีไม่สำเร็จ:', createResult.error)

      if (createResult.error && createResult.error.includes('already has an account')) {
        console.log('')
        console.log('💡 บัญชีมีอยู่แล้ว - ลองส่งอีเมลเชิญใหม่...')

        const retryInviteResponse = await fetch('http://localhost:3000/api/hotels/send-invitation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ADMIN_TOKEN}`
          },
          body: JSON.stringify({
            hotelId: resortData.hotelId,
            adminName: 'ทีมแอดมิน The Bliss at Home'
          })
        })

        const retryResult = await retryInviteResponse.json()
        if (retryResult.success) {
          console.log('✅ ส่งอีเมลเชิญใหม่สำเร็จ!')
        } else {
          console.log('❌ ส่งอีเมลเชิญไม่สำเร็จ:', retryResult.error)
        }
      }
    }

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
  }

  console.log('')
  console.log('🏨 ========================================')
  console.log('   การดำเนินการเสร็จสิ้น')
  console.log('🏨 ========================================')
}

// เรียกใช้ function
createResortAccount().catch(console.error)