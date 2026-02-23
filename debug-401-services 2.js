#!/usr/bin/env node
/**
 * Debug 401 Services Error
 * เจาะลึกหาสาเหตุ 401 Unauthorized ของ services query
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const USER_ID = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3'

async function debug401Services() {
  console.log('🔍 ====================================')
  console.log('   Debug 401 Services Error')
  console.log('🔍 ====================================')
  console.log('')

  try {
    // 1. Check if services table has RLS enabled
    console.log('1. 🛡️ ตรวจสอบ RLS status ของ services table...')

    // Try to query services with service role (should work)
    const { data: servicesWithServiceRole, error: serviceRoleError } = await supabase
      .from('services')
      .select('id, name_th, is_active')
      .eq('is_active', true)
      .limit(3)

    if (serviceRoleError) {
      console.log('❌ Service role ก็อ่าน services ไม่ได้:', serviceRoleError.message)
      return
    } else {
      console.log(`✅ Service role อ่านได้ ${servicesWithServiceRole.length} services`)
      servicesWithServiceRole.forEach(s => {
        console.log(`   - ${s.name_th} (${s.id})`)
      })
    }

    // 2. Check user profile
    console.log('')
    console.log('2. 👤 ตรวจสอบ user profile...')
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, created_at')
      .eq('id', USER_ID)
      .single()

    if (profileError) {
      console.log('❌ ไม่พบ user profile:', profileError.message)
      return
    }

    console.log(`   User: ${userProfile.email}`)
    console.log(`   Role: ${userProfile.role}`)
    console.log(`   ID: ${userProfile.id}`)

    // 3. Test the exact RLS condition
    console.log('')
    console.log('3. 🧪 ทดสอบ RLS condition...')

    // Simulate the RLS check
    const rlsTestQuery = `
      SELECT
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = '${USER_ID}'
          AND profiles.role IN ('HOTEL', 'ADMIN', 'CUSTOMER')
        ) as user_has_valid_role
    `

    console.log('   กำลังทดสอบ RLS condition...')
    console.log('   (จำลอง auth.uid() = user ID)')

    // Check if user would pass RLS condition
    const hasValidRole = ['HOTEL', 'ADMIN', 'CUSTOMER'].includes(userProfile.role)
    console.log(`   User role "${userProfile.role}" in allowed roles? ${hasValidRole ? '✅ YES' : '❌ NO'}`)

    // 4. Check current RLS policies on services
    console.log('')
    console.log('4. 📋 ตรวจสอบ RLS policies ปัจจุบัน...')
    console.log('   (ไม่สามารถดู policies ผ่าน JS client ได้)')
    console.log('   💡 ต้องเช็คใน Supabase Dashboard → Authentication → Policies')

    // 5. Try to run the exact same query that's failing in frontend
    console.log('')
    console.log('5. 🎯 ทดสอบ query เดียวกับที่ frontend ใช้...')
    console.log('   Query: SELECT * FROM services WHERE is_active = true ORDER BY sort_order ASC')

    // This will work with service role, but shows the query structure
    const { data: exactQuery, error: exactError } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (exactError) {
      console.log('❌ แม้แต่ service role ก็รัน query นี้ไม่ได้:', exactError.message)
    } else {
      console.log(`✅ Service role รัน query ได้ ${exactQuery.length} results`)
    }

    console.log('')
    console.log('🎯 ====================================')
    console.log('   วินิจฉัยปัญหา')
    console.log('🎯 ====================================')
    console.log('')

    if (hasValidRole) {
      console.log('✅ User มี role ที่ถูกต้อง')
      console.log('❌ ปัญหาน่าจะอยู่ที่:')
      console.log('   1. RLS policy ไม่ได้ถูกสร้างจริง')
      console.log('   2. RLS policy มี syntax ผิด')
      console.log('   3. Frontend ไม่ได้ส่ง auth header')
      console.log('')
      console.log('🛠️ แก้ไข:')
      console.log('   → ต้องเช็ค RLS policies ใน Supabase Dashboard')
      console.log('   → หรือสร้าง policy ใหม่ให้แน่ใจ')
    } else {
      console.log('❌ User role ไม่ถูกต้อง')
      console.log(`   Role ปัจจุบัน: "${userProfile.role}"`)
      console.log('   Role ที่อนุญาต: HOTEL, ADMIN, CUSTOMER')
      console.log('')
      console.log('🛠️ แก้ไข:')
      console.log('   → อัพเดท user role ให้ถูกต้อง')
    }

  } catch (error) {
    console.error('💥 Error:', error.message)
  }
}

debug401Services().catch(console.error)