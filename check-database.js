#!/usr/bin/env node
/**
 * Check Database - ตรวจสอบข้อมูลในฐานข้อมูลจริง
 * ตรวจสอบว่าโรงแรม ID: 550e8400-e29b-41d4-a716-446655440002 มีอยู่จริงใน Supabase
 */

const SUPABASE_URL = 'https://wmlqfugkjdoixwgjvgtq.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtbHFmdWdramRvaXh3Z2p2Z3RxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzA5Nzc5MCwiZXhwIjoyMDUyNjczNzkwfQ.bE8tLi6zHMxuMVhXQCnF7skPe4vq_QGcLGEWHPWEMlU'

const TARGET_HOTEL_ID = '550e8400-e29b-41d4-a716-446655440002'

async function checkDatabase() {
  console.log('🔍 ========================================')
  console.log('   ตรวจสอบข้อมูลในฐานข้อมูลจริง')
  console.log('🔍 ========================================')
  console.log('')

  console.log('📋 ข้อมูลการเชื่อมต่อ:')
  console.log(`   🌐 Supabase URL: ${SUPABASE_URL}`)
  console.log(`   🆔 Hotel ID: ${TARGET_HOTEL_ID}`)
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
      console.log('✅ เชื่อมต่อ Supabase Cloud สำเร็จ')
      console.log(`   📊 Status: ${healthResponse.status}`)
    } else {
      console.log('❌ ไม่สามารถเชื่อมต่อ Supabase ได้')
      console.log(`   📊 Status: ${healthResponse.status}`)
      console.log(`   📝 Message: ${await healthResponse.text()}`)
      return
    }
    console.log('')

    // 2. ตรวจสอบ hotels table
    console.log('📊 Step 2: ตรวจสอบ hotels table...')

    const tablesResponse = await fetch(`${SUPABASE_URL}/rest/v1/hotels?select=*&limit=5`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (tablesResponse.ok) {
      const hotels = await tablesResponse.json()
      console.log(`✅ hotels table พบแล้ว`)
      console.log(`   📊 จำนวนโรงแรม (แสดง 5 รายการแรก): ${hotels.length}`)

      if (hotels.length > 0) {
        console.log('')
        console.log('🏨 รายการโรงแรมในฐานข้อมูล:')
        hotels.forEach((hotel, index) => {
          console.log(`   ${index + 1}. ${hotel.name_th || hotel.name || 'ไม่มีชื่อ'}`)
          console.log(`      🆔 ID: ${hotel.id}`)
          console.log(`      📧 Email: ${hotel.login_email || hotel.email || 'ไม่มี'}`)
          console.log(`      📊 Status: ${hotel.status || 'ไม่ระบุ'}`)
          console.log('')
        })
      }
    } else {
      console.log('❌ ไม่พบ hotels table หรือไม่มีสิทธิ์เข้าถึง')
      console.log(`   📊 Status: ${tablesResponse.status}`)
      console.log(`   📝 Error: ${await tablesResponse.text()}`)
      return
    }
    console.log('')

    // 3. ค้นหาโรงแรมเป้าหมาย
    console.log('🎯 Step 3: ค้นหาโรงแรมเป้าหมาย...')
    console.log(`   🔍 กำลังค้นหา Hotel ID: ${TARGET_HOTEL_ID}`)

    const targetHotelResponse = await fetch(`${SUPABASE_URL}/rest/v1/hotels?id=eq.${TARGET_HOTEL_ID}`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (targetHotelResponse.ok) {
      const targetHotels = await targetHotelResponse.json()

      if (targetHotels.length > 0) {
        const hotel = targetHotels[0]
        console.log('🎉 พบโรงแรมเป้าหมายแล้ว!')
        console.log('')
        console.log('📋 รายละเอียดโรงแรม:')
        console.log(`   🏨 ชื่อ (ไทย): ${hotel.name_th || 'ไม่มี'}`)
        console.log(`   🏨 ชื่อ (อังกฤษ): ${hotel.name_en || hotel.name || 'ไม่มี'}`)
        console.log(`   📧 Login Email: ${hotel.login_email || 'ไม่มี'}`)
        console.log(`   📧 Contact Email: ${hotel.email || 'ไม่มี'}`)
        console.log(`   📞 โทรศัพท์: ${hotel.phone || 'ไม่มี'}`)
        console.log(`   📊 สถานะ: ${hotel.status || 'ไม่ระบุ'}`)
        console.log(`   🔐 มี Auth User ID: ${hotel.auth_user_id ? 'มี' : 'ไม่มี'}`)
        console.log(`   🔑 Login Enabled: ${hotel.login_enabled ? 'เปิด' : 'ปิด'}`)
        console.log(`   📝 Password Change Required: ${hotel.password_change_required ? 'ต้องเปลี่ยน' : 'ไม่ต้อง'}`)
        console.log('')

        console.log('✅ สรุป: ข้อมูลโรงแรมมีอยู่ในฐานข้อมูลจริง!')

        // ตรวจสอบว่าข้อมูลตรงกับที่คาดหวังหรือไม่
        if (hotel.name_th && hotel.name_th.includes('รีสอร์ทในฝัน')) {
          console.log('🎯 ชื่อโรงแรมถูกต้อง: "รีสอร์ทในฝัน"')
        } else {
          console.log('⚠️  ชื่อโรงแรมไม่ตรงกับที่คาดหวัง')
        }

        if (hotel.login_email === 'sweettuay.bt@gmail.com') {
          console.log('📧 Login email ถูกต้อง: sweettuay.bt@gmail.com')
        } else {
          console.log(`⚠️  Login email ไม่ตรง: ${hotel.login_email}`)
        }

      } else {
        console.log('❌ ไม่พบโรงแรม ID นี้ในฐานข้อมูล!')
        console.log('')
        console.log('💡 สิ่งที่อาจเกิดขึ้น:')
        console.log('   1. ข้อมูลโรงแรมยังไม่ได้สร้างในฐานข้อมูล')
        console.log('   2. Hotel ID ไม่ถูกต้อง')
        console.log('   3. ข้อมูลถูกลบหรือย้าย')
        console.log('')
        console.log('🔧 วิธีแก้ไข:')
        console.log('   1. สร้างข้อมูลโรงแรมใหม่: node setup-database.js')
        console.log('   2. ตรวจสอบ Admin Panel เพื่อดู Hotel ID ที่ถูกต้อง')
      }
    } else {
      console.log('❌ ไม่สามารถค้นหาโรงแรมได้')
      console.log(`   📊 Status: ${targetHotelResponse.status}`)
      console.log(`   📝 Error: ${await targetHotelResponse.text()}`)
    }

    console.log('')

    // 4. ตรวจสอบ Auth Users (Supabase Auth)
    console.log('👤 Step 4: ตรวจสอบ Auth Users...')

    try {
      const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      if (authResponse.ok) {
        const authData = await authResponse.json()
        console.log(`✅ Auth table เข้าถึงได้`)
        console.log(`   👥 จำนวน Users: ${authData.users ? authData.users.length : 0}`)

        if (authData.users && authData.users.length > 0) {
          // ค้นหา user ที่มี email sweettuay.bt@gmail.com
          const targetUser = authData.users.find(user => user.email === 'sweettuay.bt@gmail.com')

          if (targetUser) {
            console.log('🎯 พบ User sweettuay.bt@gmail.com ใน Auth:')
            console.log(`   👤 User ID: ${targetUser.id}`)
            console.log(`   📧 Email: ${targetUser.email}`)
            console.log(`   ✅ Email Confirmed: ${targetUser.email_confirmed_at ? 'Yes' : 'No'}`)
            console.log(`   📅 Created: ${targetUser.created_at}`)
          } else {
            console.log('❌ ไม่พบ User sweettuay.bt@gmail.com ใน Auth')
          }
        }
      } else {
        console.log('⚠️  ไม่สามารถเข้าถึง Auth users ได้')
        console.log(`   📊 Status: ${authResponse.status}`)
      }
    } catch (authError) {
      console.log('⚠️  ไม่สามารถตรวจสอบ Auth users:', authError.message)
    }

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
    console.log('')
    console.log('🔧 การแก้ไข:')
    console.log('   1. ตรวจสอบ internet connection')
    console.log('   2. ตรวจสอบ Supabase URL และ Service Key')
    console.log('   3. ตรวจสอบสิทธิ์การเข้าถึง Supabase project')
  }

  console.log('')
  console.log('🔍 ========================================')
  console.log('   การตรวจสอบเสร็จสิ้น')
  console.log('🔍 ========================================')
}

// เรียกใช้ function
checkDatabase().catch(console.error)