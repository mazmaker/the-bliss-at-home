#!/usr/bin/env node
/**
 * Create Real Hotel Data - สร้างข้อมูลโรงแรมจริงในฐานข้อมูล
 * สร้างรีสอร์ทในฝัน เชียงใหม่ ในฐานข้อมูล Supabase จริง
 */

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.NL_4Ag3zJ8vN4KqPhkFNnL9B7F_5cR2bT9xP1sL6uE8'
const ADMIN_TOKEN = 'admin-secret-token-2026'

// ข้อมูลรีสอร์ทในฝัน เชียงใหม่
const hotelData = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  name_th: 'รีสอร์ทในฝัน เชียงใหม่',
  name_en: 'Dream Resort Chiang Mai',
  contact_person: 'คุณสมชาย รีสอร์ท',
  email: 'sweettuay.bt@gmail.com',  // ใช้เป็น contact email
  login_email: 'sweettuay.bt@gmail.com',  // และ login email
  phone: '053-123-456',
  address: '123 ถนนนิมมานเหมินท์ เชียงใหม่ 50200',
  latitude: 18.7883,
  longitude: 98.9660,
  commission_rate: 15.00,
  discount_rate: 0.00,
  status: 'active',
  login_enabled: true,
  password_change_required: false,
  bank_name: 'ธนาคารกสิกรไทย',
  bank_account_number: '456-7-89012-3',
  bank_account_name: 'บริษัท รีสอร์ทในฝัน จำกัด',
  tax_id: '0123456789013',
  description: 'รีสอร์ทสไตล์บูติก ท่ามกลางธรรมชาติ บรรยากาศเงียบสงบ',
  website: 'https://www.dreamresortchiangmai.com',
  rating: 4.8,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

async function createRealHotelData() {
  console.log('🏨 ========================================')
  console.log('   สร้างข้อมูลโรงแรมจริงในฐานข้อมูล')
  console.log('🏨 ========================================')
  console.log('')

  console.log('📋 ข้อมูลโรงแรมที่จะสร้าง:')
  console.log(`   🏨 ชื่อ: ${hotelData.name_th}`)
  console.log(`   🆔 ID: ${hotelData.id}`)
  console.log(`   📧 Email: ${hotelData.email}`)
  console.log(`   🌐 Supabase: ${SUPABASE_URL}`)
  console.log('')

  try {
    // 1. ทดสอบการเชื่อมต่อ Supabase
    console.log('🔗 Step 1: ทดสอบการเชื่อมต่อ Supabase...')

    const healthResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    })

    if (healthResponse.ok) {
      console.log('✅ เชื่อมต่อ Supabase สำเร็จ')
    } else {
      console.log('❌ ไม่สามารถเชื่อมต่อ Supabase ได้')
      console.log(`   Status: ${healthResponse.status}`)
      return
    }
    console.log('')

    // 2. ตรวจสอบ hotels table
    console.log('📊 Step 2: ตรวจสอบ hotels table...')

    const checkTableResponse = await fetch(`${SUPABASE_URL}/rest/v1/hotels?select=count&limit=1`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    })

    if (checkTableResponse.ok) {
      const countHeader = checkTableResponse.headers.get('content-range')
      console.log('✅ hotels table พบแล้ว')
      console.log(`   📊 จำนวนโรงแรมทั้งหมด: ${countHeader ? countHeader.split('/')[1] : 'Unknown'}`)
    } else {
      console.log('❌ ไม่พบ hotels table')
      console.log('   💡 อาจจะต้อง run migrations ก่อน')
      return
    }
    console.log('')

    // 3. ตรวจสอบว่ามีโรงแรมนี้อยู่แล้วหรือไม่
    console.log('🔍 Step 3: ตรวจสอบโรงแรมที่มีอยู่...')

    const existingHotelResponse = await fetch(`${SUPABASE_URL}/rest/v1/hotels?id=eq.${hotelData.id}`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (existingHotelResponse.ok) {
      const existingHotels = await existingHotelResponse.json()

      if (existingHotels.length > 0) {
        console.log('⚠️  โรงแรมนี้มีอยู่แล้ว')
        console.log(`   🏨 ชื่อ: ${existingHotels[0].name_th}`)
        console.log(`   📧 Email: ${existingHotels[0].email}`)

        // อัพเดทข้อมูลให้ตรงกับที่ต้องการ
        console.log('🔧 กำลังอัพเดทข้อมูล...')

        const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/hotels?id=eq.${hotelData.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            login_email: hotelData.login_email,
            email: hotelData.email,
            login_enabled: true,
            password_change_required: false,
            updated_at: hotelData.updated_at
          })
        })

        if (updateResponse.ok) {
          console.log('✅ อัพเดทข้อมูลโรงแรมสำเร็จ')
        } else {
          console.log('❌ อัพเดทไม่สำเร็จ:', await updateResponse.text())
        }

      } else {
        console.log('💫 ไม่พบโรงแรม - กำลังสร้างใหม่...')

        // สร้างโรงแรมใหม่
        const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/hotels`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(hotelData)
        })

        if (createResponse.ok) {
          const createdHotel = await createResponse.json()
          console.log('🎉 สร้างโรงแรมสำเร็จ!')
          console.log(`   🏨 ชื่อ: ${createdHotel[0].name_th}`)
          console.log(`   🆔 ID: ${createdHotel[0].id}`)
        } else {
          console.log('❌ สร้างโรงแรมไม่สำเร็จ')
          const error = await createResponse.text()
          console.log(`   Error: ${error}`)
          return
        }
      }
    } else {
      console.log('❌ ไม่สามารถตรวจสอบโรงแรมได้')
      return
    }
    console.log('')

    // 4. สร้าง auth account ผ่าน server API
    console.log('👤 Step 4: สร้าง auth account...')

    const createAccountResponse = await fetch('http://localhost:3000/api/hotels/create-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        hotelId: hotelData.id,
        loginEmail: hotelData.login_email,
        name: hotelData.name_th
      })
    })

    const accountResult = await createAccountResponse.json()

    if (accountResult.success) {
      console.log('🎉 สร้าง auth account สำเร็จ!')
      console.log(`   👤 User ID: ${accountResult.userId}`)
      console.log(`   📧 Login Email: ${accountResult.loginEmail}`)
      console.log(`   🔐 Temporary Password: ${accountResult.temporaryPassword}`)

      // ส่งอีเมล
      console.log('')
      console.log('📧 Step 5: ส่งอีเมลเชิญ...')

      const emailResponse = await fetch('http://localhost:3000/api/hotels/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        },
        body: JSON.stringify({
          hotelId: hotelData.id,
          adminName: 'ทีมแอดมิน The Bliss at Home'
        })
      })

      const emailResult = await emailResponse.json()
      if (emailResult.success) {
        console.log('✅ ส่งอีเมลเชิญสำเร็จ!')
      } else {
        console.log('⚠️  ส่งอีเมลไม่สำเร็จ:', emailResult.error)
      }

      console.log('')
      console.log('🎯 ข้อมูลการเข้าสู่ระบบที่ถูกต้อง:')
      console.log(`   🌐 URL: http://localhost:3006/login`)
      console.log(`   📧 อีเมล: ${accountResult.loginEmail}`)
      console.log(`   🔐 รหัสผ่าน: ${accountResult.temporaryPassword}`)
      console.log(`   🏨 โรงแรม: ${hotelData.name_th}`)

    } else if (accountResult.error && accountResult.error.includes('already has an account')) {
      console.log('✅ บัญชีมีอยู่แล้ว!')
      console.log('   💡 ลอง reset password...')

      const resetResponse = await fetch('http://localhost:3000/api/hotels/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        },
        body: JSON.stringify({
          hotelId: hotelData.id
        })
      })

      const resetResult = await resetResponse.json()
      if (resetResult.success) {
        console.log('✅ Reset password สำเร็จ!')
        console.log('')
        console.log('🎯 ข้อมูลการเข้าสู่ระบบ:')
        console.log(`   🌐 URL: http://localhost:3006/login`)
        console.log(`   📧 อีเมล: ${hotelData.login_email}`)
        console.log(`   🔐 รหัสผ่าน: ${resetResult.data.temporaryPassword}`)
        console.log(`   🏨 โรงแรม: ${hotelData.name_th}`)
      } else {
        console.log('❌ Reset password ไม่สำเร็จ:', resetResult.error)
      }

    } else {
      console.log('❌ สร้าง auth account ไม่สำเร็จ:', accountResult.error)
    }

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
  }

  console.log('')
  console.log('🏨 ========================================')
  console.log('   การสร้างข้อมูลเสร็จสิ้น')
  console.log('🏨 ========================================')
  console.log('')

  console.log('📧 ข้อมูล Ethereal Email ใหม่:')
  console.log('   🌐 https://ethereal.email')
  console.log('   👤 User: n7jxb5zr2uducdvt@ethereal.email')
  console.log('   🔐 Pass: eWav2pm5CFza1MU8US')
}

// เรียกใช้ function
createRealHotelData().catch(console.error)