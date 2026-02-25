#!/usr/bin/env node
/**
 * Fix Hotel Linkage - แก้ไขการเชื่อมโยง Auth User กับ Hotel ที่ถูกต้อง
 * แก้ปัญหา: Login สำเร็จ แต่แสดงโรงแรมฮิลตันแทนรีสอร์ทในฝัน
 */

const { createClient } = require('@supabase/supabase-js')

// ข้อมูลการเชื่อมต่อ
const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const USER_EMAIL = 'sweettuay.bt@gmail.com'
const CORRECT_HOTEL_ID = '550e8400-e29b-41d4-a716-446655440002' // รีสอร์ทในฝัน เชียงใหม่

async function fixHotelLinkage() {
  console.log('🔧 ========================================')
  console.log('   แก้ไขการเชื่อมโยง Hotel Data')
  console.log('🔧 ========================================')
  console.log('')

  console.log('📋 ข้อมูลการแก้ไข:')
  console.log(`   📧 User Email: ${USER_EMAIL}`)
  console.log(`   🏨 โรงแรมที่ถูกต้อง: รีสอร์ทในฝัน เชียงใหม่`)
  console.log(`   🆔 Hotel ID ที่ถูกต้อง: ${CORRECT_HOTEL_ID}`)
  console.log('')

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 1. หา Auth User
    console.log('🔍 Step 1: ค้นหา Auth User...')

    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.log('❌ ไม่สามารถดึงข้อมูล auth users ได้')
      console.log('   💡 ลองใช้ anon key แทน...')

      // ใช้ anon key เพื่อตรวจสอบ hotels table
      const anonSupabase = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc')

      await fixViaHotelsTable(anonSupabase)
      return
    }

    const targetUser = authUsers.users.find(user => user.email === USER_EMAIL)

    if (!targetUser) {
      console.log('❌ ไม่พบ auth user สำหรับ email นี้')
      return
    }

    console.log('✅ พบ Auth User:')
    console.log(`   👤 User ID: ${targetUser.id}`)
    console.log(`   📧 Email: ${targetUser.email}`)
    console.log(`   🏨 Hotel ID (metadata): ${targetUser.user_metadata?.hotel_id || 'ไม่มี'}`)
    console.log('')

    // 2. ตรวจสอบ hotels table ว่า user นี้เชื่อมโยงกับโรงแรมไหน
    console.log('🔍 Step 2: ตรวจสอบการเชื่อมโยงปัจจุบัน...')

    const { data: currentHotels, error: currentError } = await supabase
      .from('hotels')
      .select('*')
      .eq('auth_user_id', targetUser.id)

    if (currentError) {
      console.log('❌ ไม่สามารถตรวจสอบ hotels table ได้:', currentError.message)
    } else if (currentHotels && currentHotels.length > 0) {
      console.log('🔍 โรงแรมที่เชื่อมโยงปัจจุบัน:')
      currentHotels.forEach((hotel, index) => {
        console.log(`   ${index + 1}. ${hotel.name_th} (ID: ${hotel.id})`)
      })
    } else {
      console.log('❌ ไม่พบการเชื่อมโยงกับโรงแรมใดๆ')
    }
    console.log('')

    // 3. ตรวจสอบโรงแรมที่ถูกต้อง
    console.log('🏨 Step 3: ตรวจสอบโรงแรมที่ถูกต้อง...')

    const { data: correctHotel, error: correctError } = await supabase
      .from('hotels')
      .select('*')
      .eq('id', CORRECT_HOTEL_ID)
      .single()

    if (correctError || !correctHotel) {
      console.log('❌ ไม่พบโรงแรมที่ถูกต้อง:', correctError?.message)
      return
    }

    console.log('✅ พบโรงแรมที่ถูกต้อง:')
    console.log(`   🏨 ชื่อ: ${correctHotel.name_th}`)
    console.log(`   📧 Email: ${correctHotel.email}`)
    console.log(`   🔑 Auth User ID ปัจจุบัน: ${correctHotel.auth_user_id || 'ไม่มี'}`)
    console.log('')

    // 4. ล้างการเชื่อมโยงเก่า
    console.log('🧹 Step 4: ล้างการเชื่อมโยงเก่า...')

    if (currentHotels && currentHotels.length > 0) {
      for (const hotel of currentHotels) {
        if (hotel.id !== CORRECT_HOTEL_ID) {
          const { error: clearError } = await supabase
            .from('hotels')
            .update({
              auth_user_id: null,
              login_email: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', hotel.id)

          if (clearError) {
            console.log(`   ⚠️  ไม่สามารถล้างการเชื่อมโยงของ ${hotel.name_th}: ${clearError.message}`)
          } else {
            console.log(`   ✅ ล้างการเชื่อมโยงของ ${hotel.name_th} แล้ว`)
          }
        }
      }
    }
    console.log('')

    // 5. อัพเดท Auth User metadata
    console.log('👤 Step 5: อัพเดท Auth User metadata...')

    const { data: updatedUser, error: updateUserError } = await supabase.auth.admin.updateUserById(
      targetUser.id,
      {
        user_metadata: {
          role: 'HOTEL',
          hotel_id: CORRECT_HOTEL_ID,
          password_change_required: false
        }
      }
    )

    if (updateUserError) {
      console.log('❌ อัพเดท user metadata ไม่สำเร็จ:', updateUserError.message)
    } else {
      console.log('✅ อัพเดท user metadata สำเร็จ')
    }
    console.log('')

    // 6. เชื่อมโยงโรงแรมที่ถูกต้อง
    console.log('🔗 Step 6: เชื่อมโยงโรงแรมที่ถูกต้อง...')

    const { data: linkedHotel, error: linkError } = await supabase
      .from('hotels')
      .update({
        auth_user_id: targetUser.id,
        login_email: USER_EMAIL,
        login_enabled: true,
        password_change_required: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', CORRECT_HOTEL_ID)
      .select()

    if (linkError) {
      console.log('❌ เชื่อมโยงไม่สำเร็จ:', linkError.message)
    } else {
      console.log('✅ เชื่อมโยงโรงแรมสำเร็จ!')
    }
    console.log('')

    // 7. อัพเดท Profile
    console.log('👤 Step 7: อัพเดท Profile...')

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: targetUser.id,
        email: USER_EMAIL,
        role: 'HOTEL',
        full_name: correctHotel.name_th,
        status: 'ACTIVE',
        language: 'th',
        hotel_id: CORRECT_HOTEL_ID,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.log('⚠️  อัพเดท profile ไม่สำเร็จ:', profileError.message)
    } else {
      console.log('✅ อัพเดท Profile สำเร็จ')
    }

    console.log('')
    console.log('🌟 ========================================')
    console.log('   🎉 การแก้ไขเสร็จสมบูรณ์!')
    console.log('🌟 ========================================')
    console.log('')

    console.log('📱 ขั้นตอนถัดไป:')
    console.log('   1. ออกจากระบบ (Logout) ที่ http://localhost:3006')
    console.log('   2. ล้าง Browser Cache หรือเปิด Incognito Mode')
    console.log('   3. Login ใหม่:')
    console.log(`      📧 อีเมล: ${USER_EMAIL}`)
    console.log(`      🔐 รหัสผ่าน: RY&vf4OzYFZb`)
    console.log('   4. ตรวจสอบว่าแสดง "รีสอร์ทในฝัน เชียงใหม่" แล้ว')
    console.log('')

    console.log('✨ คาดหวัง: แสดงโรงแรมที่ถูกต้องแล้ว!')

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
  }

  console.log('')
  console.log('🔧 ========================================')
  console.log('   การแก้ไขเสร็จสิ้น')
  console.log('🔧 ========================================')
}

// Function สำรองสำหรับแก้ไขผ่าน hotels table
async function fixViaHotelsTable(supabase) {
  console.log('🔄 ใช้วิธีสำรอง: แก้ไขผ่าน hotels table...')

  // หา hotel ที่มี login_email = sweettuay.bt@gmail.com
  const { data: linkedHotels, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('email', USER_EMAIL)
    .or(`login_email.eq.${USER_EMAIL}`)

  if (error) {
    console.log('❌ ไม่สามารถค้นหาโรงแรมได้:', error.message)
    return
  }

  console.log(`✅ พบโรงแรมที่เชื่อมโยงกับ ${USER_EMAIL}:`)
  linkedHotels.forEach((hotel, index) => {
    console.log(`   ${index + 1}. ${hotel.name_th} (ID: ${hotel.id})`)
    console.log(`      📧 Email: ${hotel.email}`)
    console.log(`      📧 Login Email: ${hotel.login_email || 'ไม่มี'}`)
  })

  console.log('')
  console.log('💡 สาเหตุที่แสดงโรงแรมผิด:')
  console.log('   - Auth user อาจเชื่อมโยงกับ hotel ID ผิดตัว')
  console.log('   - หรือ Hotel app cache ข้อมูลเก่า')
  console.log('   - ลอง Logout → Clear cache → Login ใหม่')
}

fixHotelLinkage().catch(console.error)