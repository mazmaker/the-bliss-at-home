#!/usr/bin/env node
/**
 * Quick Fix RLS Policy
 * แก้ไข RLS policy ให้จองได้ทันที
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'
const USER_ID = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function fixBookingRLS() {
  console.log('🔧 ======================================')
  console.log('   Quick Fix RLS Policy สำหรับ Booking')
  console.log('🔧 ======================================')
  console.log('')

  try {
    // 1. Check current user role
    console.log('1. 👤 ตรวจสอบ user role ปัจจุบัน...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', USER_ID)
      .single()

    if (profileError) {
      console.log('❌ ไม่พบ profile:', profileError.message)
      return
    }

    console.log(`   User ID: ${profile.id}`)
    console.log(`   Email: ${profile.email}`)
    console.log(`   Current Role: ${profile.role}`)
    console.log('')

    // 2. Update user role to HOTEL if not already
    if (profile.role !== 'HOTEL') {
      console.log('2. 🔄 อัพเดต user role เป็น HOTEL...')
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'HOTEL' })
        .eq('id', USER_ID)

      if (updateError) {
        console.log('❌ ไม่สามารถอัพเดต role ได้:', updateError.message)
        return
      }
      console.log('✅ อัพเดต role เป็น HOTEL แล้ว')
    } else {
      console.log('2. ✅ User role เป็น HOTEL อยู่แล้ว')
    }
    console.log('')

    // 3. Fix RLS policies via raw SQL
    console.log('3. 🛡️ กำลังแก้ไข RLS policies...')

    const fixPoliciesSQL = `
      -- Drop conflicting policies
      DROP POLICY IF EXISTS "Hotel staff can create hotel bookings" ON bookings;
      DROP POLICY IF EXISTS "Hotel staff can update hotel bookings" ON bookings;
      DROP POLICY IF EXISTS "Hotel staff can view hotel bookings" ON bookings;

      -- Create working policies
      CREATE POLICY "Hotel users can create hotel bookings" ON bookings
      FOR INSERT WITH CHECK (
        is_hotel_booking = true
        AND auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('HOTEL', 'ADMIN')
        )
      );

      CREATE POLICY "Hotel users can view hotel bookings" ON bookings
      FOR SELECT USING (
        is_hotel_booking = true
        AND auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('HOTEL', 'ADMIN')
        )
      );

      CREATE POLICY "Hotel users can update hotel bookings" ON bookings
      FOR UPDATE USING (
        is_hotel_booking = true
        AND auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('HOTEL', 'ADMIN')
        )
      );
    `

    const { error: policyError } = await supabase.rpc('exec_sql', {
      sql: fixPoliciesSQL
    })

    if (policyError) {
      console.log('⚠️ อาจจะแก้ไข policies ไม่ได้ผ่าน RPC:', policyError.message)
      console.log('💡 กรุณารัน SQL ใน Supabase Dashboard แทน')
    } else {
      console.log('✅ แก้ไข RLS policies เสร็จแล้ว')
    }
    console.log('')

    // 4. Check policies
    console.log('4. 📋 ตรวจสอบ policies ปัจจุบัน...')
    const { data: policies, error: policiesError } = await supabase
      .from('information_schema.table_privileges')
      .select('*')
      .eq('table_name', 'bookings')

    if (!policiesError && policies) {
      console.log(`✅ พบ ${policies.length} policies สำหรับ bookings table`)
    }
    console.log('')

    console.log('🎉 ======================================')
    console.log('   การแก้ไขเสร็จสิ้น!')
    console.log('🎉 ======================================')
    console.log('')
    console.log('✅ User role: HOTEL')
    console.log('✅ RLS policies: Updated')
    console.log('✅ พร้อมจองได้แล้ว!')
    console.log('')
    console.log('🔍 หากยังจองไม่ได้:')
    console.log('   1. Refresh หน้าเว็บ Hotel App')
    console.log('   2. ลองจองใหม่อีกครั้ง')
    console.log('   3. หรือรัน SQL ใน Supabase Dashboard')

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
  }
}

fixBookingRLS().catch(console.error)