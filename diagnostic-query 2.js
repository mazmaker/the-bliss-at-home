#!/usr/bin/env node
/**
 * Diagnostic Query - ทดสอบ query ฐานข้อมูลแบบเดียวกับ server
 * ทดสอบว่า server เชื่อมต่อฐานข้อมูลได้หรือไม่
 */

const { createClient } = require('@supabase/supabase-js')

// ข้อมูลเชื่อมต่อเดียวกับ server (.env)
const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.NL_4Ag3zJ8vN4KqPhkFNnL9B7F_5cR2bT9xP1sL6uE8'

// Hotel ID ที่ลองค้นหา
const HOTEL_ID = '3082d55a-b185-49b9-b4fc-01c00d61e7e1'

async function diagnosticQuery() {
  console.log('🔍 ========================================')
  console.log('   Diagnostic Query - ทดสอบฐานข้อมูล')
  console.log('🔍 ========================================')
  console.log('')

  console.log('📋 ข้อมูลการเชื่อมต่อ:')
  console.log(`   🌐 URL: ${SUPABASE_URL}`)
  console.log(`   🔑 Service Key: ${SUPABASE_SERVICE_KEY.substring(0, 50)}...`)
  console.log(`   🆔 Hotel ID: ${HOTEL_ID}`)
  console.log('')

  try {
    // สร้าง Supabase client แบบเดียวกับ server
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 1. ทดสอบการเชื่อมต่อพื้นฐาน
    console.log('🔗 Step 1: ทดสอบการเชื่อมต่อพื้นฐาน...')

    try {
      // ลองทำ query ง่ายๆ
      const { data: health, error: healthError } = await supabase
        .from('hotels')
        .select('count', { count: 'exact' })
        .limit(1)

      if (healthError) {
        console.log('❌ ไม่สามารถเชื่อมต่อฐานข้อมูลได้')
        console.log(`   Error: ${healthError.message}`)
        console.log(`   Code: ${healthError.code}`)
        console.log(`   Details: ${JSON.stringify(healthError.details)}`)
        return
      } else {
        console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ')
      }
    } catch (connectionError) {
      console.log('💥 Connection error:', connectionError.message)
      return
    }

    console.log('')

    // 2. ทดสอบ query หาโรงแรมทั้งหมด
    console.log('📊 Step 2: ดูโรงแรมทั้งหมดในตาราง...')

    const { data: allHotels, error: allError } = await supabase
      .from('hotels')
      .select('*')

    if (allError) {
      console.log('❌ ไม่สามารถดึงข้อมูลโรงแรมได้')
      console.log(`   Error: ${allError.message}`)
      console.log(`   Code: ${allError.code}`)
    } else {
      console.log(`✅ พบโรงแรมทั้งหมด: ${allHotels.length} รายการ`)

      if (allHotels.length > 0) {
        console.log('')
        console.log('🏨 รายการโรงแรมในฐานข้อมูล:')
        allHotels.forEach((hotel, index) => {
          console.log(`   ${index + 1}. ${hotel.name_th || hotel.name || 'ไม่มีชื่อ'}`)
          console.log(`      🆔 ID: ${hotel.id}`)
          console.log(`      📧 Email: ${hotel.email || 'ไม่มี'}`)
          console.log(`      📊 Status: ${hotel.status || 'ไม่ระบุ'}`)
          console.log('')
        })
      }
    }

    console.log('')

    // 3. ทดสอบ query หาโรงแรมเป้าหมาย (เหมือน server ทุกประการ)
    console.log('🎯 Step 3: ค้นหาโรงแรมเป้าหมายแบบเดียวกับ server...')
    console.log(`   🔍 ค้นหา ID: ${HOTEL_ID}`)

    const { data: targetHotel, error: targetError } = await supabase
      .from('hotels')
      .select('*')
      .eq('id', HOTEL_ID)
      .single()

    if (targetError || !targetHotel) {
      console.log('❌ ไม่พบโรงแรมเป้าหมาย')
      if (targetError) {
        console.log(`   Error: ${targetError.message}`)
        console.log(`   Code: ${targetError.code}`)
        console.log(`   Details: ${JSON.stringify(targetError.details)}`)
      }

      console.log('')
      console.log('🔍 Debug: ลองค้นหาด้วยวิธีอื่น...')

      // ลองค้นหาแบบไม่ใช้ .single()
      const { data: hotelsArray, error: arrayError } = await supabase
        .from('hotels')
        .select('*')
        .eq('id', HOTEL_ID)

      if (arrayError) {
        console.log('❌ ค้นหาแบบ array ก็ไม่ได้:', arrayError.message)
      } else {
        console.log(`✅ ค้นหาแบบ array: พบ ${hotelsArray.length} รายการ`)
        if (hotelsArray.length > 0) {
          const hotel = hotelsArray[0]
          console.log(`   🏨 ชื่อ: ${hotel.name_th}`)
          console.log(`   📧 Email: ${hotel.email}`)
          console.log(`   🔐 Login Email: ${hotel.login_email || 'ไม่มี'}`)
          console.log(`   🔑 Auth User ID: ${hotel.auth_user_id || 'ไม่มี'}`)
        }
      }

    } else {
      console.log('🎉 พบโรงแรมเป้าหมายแล้ว!')
      console.log('')
      console.log('📋 รายละเอียดโรงแรม:')
      console.log(`   🏨 ชื่อ (ไทย): ${targetHotel.name_th}`)
      console.log(`   🏨 ชื่อ (อังกฤษ): ${targetHotel.name_en || 'ไม่มี'}`)
      console.log(`   📧 Contact Email: ${targetHotel.email}`)
      console.log(`   📧 Login Email: ${targetHotel.login_email || 'ไม่มี'}`)
      console.log(`   📞 โทรศัพท์: ${targetHotel.phone}`)
      console.log(`   📊 สถานะ: ${targetHotel.status}`)
      console.log(`   🔑 Auth User ID: ${targetHotel.auth_user_id || 'ไม่มี'}`)
      console.log(`   🔐 Login Enabled: ${targetHotel.login_enabled ? 'เปิด' : 'ปิด'}`)

      console.log('')
      console.log('💡 การวิเคราะห์:')

      if (targetHotel.auth_user_id) {
        console.log('   ⚠️  โรงแรมมี auth account แล้ว')
        console.log('   💭 สาเหตุที่ server fail อาจเป็น:')
        console.log('       1. Email ซ้ำ')
        console.log('       2. Auth API error')
        console.log('       3. Permission issue')
      } else {
        console.log('   ✅ โรงแรมยังไม่มี auth account')
        console.log('   ✅ สามารถสร้าง account ได้')
      }
    }

    console.log('')

    // 4. ทดสอบ Auth API
    console.log('👤 Step 4: ทดสอบ Supabase Auth API...')

    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

      if (authError) {
        console.log('❌ ไม่สามารถเข้าถึง Auth API ได้')
        console.log(`   Error: ${authError.message}`)
      } else {
        console.log(`✅ Auth API ทำงานปกติ`)
        console.log(`   👥 จำนวน Users: ${authUsers.users.length}`)

        // ค้นหา user ที่มี email sweettuay.bt@gmail.com
        const targetUser = authUsers.users.find(user => user.email === 'sweettuay.bt@gmail.com')

        if (targetUser) {
          console.log('   🎯 พบ User sweettuay.bt@gmail.com ใน Auth:')
          console.log(`      👤 User ID: ${targetUser.id}`)
          console.log(`      📧 Email: ${targetUser.email}`)
          console.log(`      ✅ Confirmed: ${targetUser.email_confirmed_at ? 'Yes' : 'No'}`)
        } else {
          console.log('   ❌ ไม่พบ User sweettuay.bt@gmail.com ใน Auth')
        }
      }
    } catch (authApiError) {
      console.log('💥 Auth API Error:', authApiError.message)
    }

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาดใหญ่:', error.message)
    console.error('   Stack:', error.stack)
  }

  console.log('')
  console.log('🔍 ========================================')
  console.log('   Diagnostic เสร็จสิ้น')
  console.log('🔍 ========================================')
}

// เรียกใช้ function
diagnosticQuery().catch(console.error)