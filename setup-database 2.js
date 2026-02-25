#!/usr/bin/env node
/**
 * Setup Database Script
 * สร้างข้อมูลโรงแรมใน Supabase Cloud และสร้างบัญชีสำหรับรีสอร์ทในฝัน
 */

const ADMIN_TOKEN = 'admin-secret-token-2026'
const SUPABASE_URL = 'https://wmlqfugkjdoixwgjvgtq.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtbHFmdWdramRvaXh3Z2p2Z3RxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzA5Nzc5MCwiZXhwIjoyMDUyNjczNzkwfQ.bE8tLi6zHMxuMVhXQCnF7skPe4vq_QGcLGEWHPWEMlU'

// ข้อมูลโรงแรมที่ต้องการสร้าง
const resortData = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  name_th: 'รีสอร์ทในฝัน เชียงใหม่',
  name_en: 'Dream Resort Chiang Mai',
  contact_person: 'คุณสมชาย รีสอร์ท',
  email: 'info@dreamresortchiangmai.com',
  phone: '053-123-4567',
  address: '123 ถนนนิมมานเหมินท์ เชียงใหม่ 50200',
  latitude: 18.7883,
  longitude: 98.9660,
  commission_rate: 15.00,
  status: 'active',
  bank_name: 'ธนาคารกสิกรไทย',
  bank_account_number: '456-7-89012-3',
  bank_account_name: 'บริษัท รีสอร์ทในฝัน จำกัด',
  tax_id: '0123456789013',
  description: 'รีสอร์ทสไตล์บูติก ท่ามกลางธรรมชาติ บรรยากาศเงียบสงบ',
  website: 'https://www.dreamresortchiangmai.com',
  rating: 4.8
}

// ข้อมูลบัญชีที่ต้องการ
const accountData = {
  email: 'sweettuay.bt@gmail.com',
  password: '@hTDh%gZ424n'
}

async function setupDatabase() {
  console.log('🚀 ============================================')
  console.log('   Setup Database - รีสอร์ทในฝัน เชียงใหม่')
  console.log('🚀 ============================================')
  console.log('')

  try {
    // 1. ตรวจสอบการเชื่อมต่อ Supabase
    console.log('🔍 Step 1: ตรวจสอบการเชื่อมต่อ Supabase...')

    const healthResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    })

    if (healthResponse.ok) {
      console.log('✅ เชื่อมต่อ Supabase Cloud สำเร็จ')
    } else {
      console.log('❌ ไม่สามารถเชื่อมต่อ Supabase ได้')
      console.log('   Status:', healthResponse.status)
      return
    }
    console.log('')

    // 2. ตรวจสอบว่ามี hotels table หรือไม่
    console.log('🔍 Step 2: ตรวจสอบ hotels table...')

    const checkTableResponse = await fetch(`${SUPABASE_URL}/rest/v1/hotels?select=*&limit=1`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (checkTableResponse.ok) {
      console.log('✅ hotels table พบแล้ว')
      const existingHotels = await checkTableResponse.json()
      console.log(`   📊 จำนวนโรงแรมที่มีอยู่: ${existingHotels.length}`)
    } else {
      console.log('❌ ไม่พบ hotels table หรือไม่มีสิทธิ์เข้าถึง')
      console.log('   💡 อาจจะต้องรัน migrations ก่อน')
      return
    }
    console.log('')

    // 3. ตรวจสอบว่ามีรีสอร์ทในฝันอยู่แล้วหรือไม่
    console.log('🔍 Step 3: ตรวจสอบรีสอร์ทในฝัน...')

    const checkResortResponse = await fetch(`${SUPABASE_URL}/rest/v1/hotels?id=eq.${resortData.id}`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (checkResortResponse.ok) {
      const existingResorts = await checkResortResponse.json()

      if (existingResorts.length > 0) {
        console.log('✅ รีสอร์ทในฝันมีอยู่แล้ว')
        console.log(`   🏨 ชื่อ: ${existingResorts[0].name_th}`)
        console.log(`   🆔 ID: ${existingResorts[0].id}`)
      } else {
        console.log('⚠️  ไม่เจอรีสอร์ทในฝัน - กำลังสร้างใหม่...')

        // สร้างโรงแรมใหม่
        const createHotelResponse = await fetch(`${SUPABASE_URL}/rest/v1/hotels`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(resortData)
        })

        if (createHotelResponse.ok) {
          const createdHotel = await createHotelResponse.json()
          console.log('🎉 สร้างรีสอร์ทในฝันสำเร็จ!')
          console.log(`   🏨 ชื่อ: ${createdHotel[0].name_th}`)
          console.log(`   🆔 ID: ${createdHotel[0].id}`)
        } else {
          console.log('❌ สร้างโรงแรมไม่สำเร็จ')
          const error = await createHotelResponse.text()
          console.log('   Error:', error)
          return
        }
      }
    } else {
      console.log('❌ ไม่สามารถตรวจสอบโรงแรมได้')
      return
    }
    console.log('')

    // 4. สร้างบัญชีสำหรับรีสอร์ท
    console.log('🔨 Step 4: สร้างบัญชีโรงแรม...')

    const createAccountResponse = await fetch('http://localhost:3000/api/hotels/create-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        hotelId: resortData.id,
        loginEmail: accountData.email,
        name: resortData.name_th
      })
    })

    const createResult = await createAccountResponse.json()

    if (createResult.success) {
      console.log('🎉 สร้างบัญชีสำเร็จ!')
      console.log(`   👤 User ID: ${createResult.userId}`)
      console.log(`   📧 Login Email: ${createResult.loginEmail}`)
      console.log(`   🔐 Temporary Password: ${createResult.temporaryPassword}`)
      console.log('')

      // 5. อัพเดทรหัสผ่านให้เป็นที่ต้องการ
      console.log('🔧 Step 5: อัพเดทรหัสผ่านให้ตรงกับที่ต้องการ...')

      // ใช้ Supabase Auth API เพื่ออัพเดทรหัสผ่าน
      const updatePasswordResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${createResult.userId}`, {
        method: 'PUT',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: accountData.password
        })
      })

      if (updatePasswordResponse.ok) {
        console.log('✅ อัพเดทรหัสผ่านสำเร็จ!')
      } else {
        console.log('⚠️  อัพเดทรหัสผ่านไม่สำเร็จ แต่บัญชีสร้างได้แล้ว')
      }

      // 6. ส่งอีเมลเชิญ
      console.log('📬 Step 6: ส่งอีเมลเชิญเข้าใช้งาน...')

      const inviteResponse = await fetch('http://localhost:3000/api/hotels/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        },
        body: JSON.stringify({
          hotelId: resortData.id,
          adminName: 'ทีมแอดมิน The Bliss at Home'
        })
      })

      const inviteResult = await inviteResponse.json()
      if (inviteResult.success) {
        console.log('✅ ส่งอีเมลเชิญสำเร็จ!')
      } else {
        console.log('⚠️  ส่งอีเมลเชิญไม่สำเร็จ:', inviteResult.error)
      }

      console.log('')
      console.log('🎯 ข้อมูลการเข้าสู่ระบบที่แก้ไขแล้ว:')
      console.log(`   🌐 URL: http://localhost:3006/login`)
      console.log(`   📧 อีเมล: ${accountData.email}`)
      console.log(`   🔐 รหัสผ่าน: ${accountData.password}`)
      console.log(`   🏨 โรงแรม: ${resortData.name_th}`)

    } else {
      console.log('❌ สร้างบัญชีไม่สำเร็จ:', createResult.error)

      if (createResult.error && createResult.error.includes('already has an account')) {
        console.log('')
        console.log('💡 บัญชีมีอยู่แล้ว - ข้อมูลปัจจุบัน:')
        console.log(`   📧 อีเมล: ${accountData.email}`)
        console.log(`   🔐 รหัสผ่าน: ${accountData.password}`)
        console.log(`   🏨 โรงแรม: ${resortData.name_th}`)
      }
    }

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
    console.log('')
    console.log('🔍 การตรวจสอบ:')
    console.log('   1. ตรวจสอบ Supabase URL และ Service Key')
    console.log('   2. ตรวจสอบว่า tables ถูกสร้างแล้ว (migrations)')
    console.log('   3. ตรวจสอบ RLS policies')
  }

  console.log('')
  console.log('🚀 ============================================')
  console.log('   การติดตั้งฐานข้อมูลเสร็จสิ้น')
  console.log('🚀 ============================================')
}

// เรียกใช้ function
setupDatabase().catch(console.error)