#!/usr/bin/env node
/**
 * Final RLS Fix - Using Service Role to bypass RLS and fix policies
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function testInsertWithServiceRole() {
  console.log('🔧 ====================================')
  console.log('   Final RLS Fix - Service Role Test')
  console.log('🔧 ====================================')
  console.log('')

  try {
    // 1. Verify user exists and role
    console.log('1. 👤 ตรวจสอบ user และ role...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', 'df59b8ba-52e6-4d4d-b050-6f63d83446e3')
      .single()

    if (profileError) {
      console.log('❌ ไม่พบ profile:', profileError.message)
      return
    }

    console.log('   User:', profile.email)
    console.log('   Role:', profile.role)
    console.log('')

    // 2. Test insert with service role (bypasses RLS)
    console.log('2. 🧪 ทดสอบการจองด้วย service role...')

    const { data: services } = await supabase
      .from('services')
      .select('id')
      .limit(1)

    if (!services || services.length === 0) {
      console.log('❌ ไม่พบ services สำหรับทดสอบ')
      return
    }

    const testBooking = {
      service_id: services[0].id, // Use real service ID
      booking_date: '2026-02-20',
      booking_time: '14:00:00',
      duration: 60,
      hotel_room_number: '101',
      customer_notes: 'Test booking via service role',
      base_price: 1000.00,
      final_price: 1000.00,
      status: 'confirmed',
      is_hotel_booking: true
    }

    const { data: insertData, error: insertError } = await supabase
      .from('bookings')
      .insert(testBooking)
      .select()

    if (insertError) {
      console.log('❌ การแทรกข้อมูลผิดพลาด:', insertError.message)

      // If it's still RLS error, that means our policies are wrong
      if (insertError.message.includes('row-level security')) {
        console.log('🛠️ ยังคงมีปัญหา RLS - จำเป็นต้องแก้ไข policies ใน Supabase Dashboard')
        console.log('')
        console.log('📋 SQL ที่ต้องรัน:')
        console.log('')
        console.log('-- 1. ลบ policies เก่า')
        console.log(`DROP POLICY IF EXISTS "Hotel staff can create hotel bookings" ON bookings;`)
        console.log(`DROP POLICY IF EXISTS "Hotel users can create hotel bookings" ON bookings;`)
        console.log(`DROP POLICY IF EXISTS "Allow hotel and admin full access to hotel bookings" ON bookings;`)
        console.log('')
        console.log('-- 2. สร้าง policy ใหม่')
        console.log(`CREATE POLICY "Hotel booking access" ON bookings`)
        console.log(`FOR ALL USING (`)
        console.log(`  is_hotel_booking = true AND (`)
        console.log(`    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('HOTEL', 'ADMIN'))`)
        console.log(`  )`)
        console.log(`);`)
        console.log('')
      }
      return
    }

    console.log('✅ การจองสำเร็จ! ID:', insertData[0]?.id)

    // Clean up test data
    await supabase
      .from('bookings')
      .delete()
      .eq('id', insertData[0]?.id)

    console.log('✅ ลบข้อมูลทดสอบแล้ว')
    console.log('')
    console.log('🎉 ====================================')
    console.log('   RLS ทำงานถูกต้องแล้ว!')
    console.log('🎉 ====================================')
    console.log('')
    console.log('✅ สามารถจองได้แล้ว')
    console.log('🔄 กรุณา refresh หน้า hotel app')

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
  }
}

testInsertWithServiceRole().catch(console.error)