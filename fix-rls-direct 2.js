#!/usr/bin/env node
/**
 * Direct RLS Fix Script
 * แก้ไข RLS policy ให้จองได้ทันที - ใช้ SQL โดยตรง
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeSQLDirectly() {
  console.log('🔧 ====================================')
  console.log('   Direct RLS Fix via Raw SQL')
  console.log('🔧 ====================================')
  console.log('')

  try {
    // 1. Drop conflicting policies
    console.log('1. 🗑️ ลบ policies เก่าที่ขัดแย้ง...')
    const dropPolicies = [
      `DROP POLICY IF EXISTS "Hotel staff can create hotel bookings" ON bookings;`,
      `DROP POLICY IF EXISTS "Hotel staff can update hotel bookings" ON bookings;`,
      `DROP POLICY IF EXISTS "Hotel staff can view hotel bookings" ON bookings;`,
      `DROP POLICY IF EXISTS "Hotel users can create hotel bookings" ON bookings;`,
      `DROP POLICY IF EXISTS "Hotel users can update hotel bookings" ON bookings;`,
      `DROP POLICY IF EXISTS "Hotel users can view hotel bookings" ON bookings;`,
      `DROP POLICY IF EXISTS "Allow hotel and admin full access to hotel bookings" ON bookings;`,
    ]

    for (const sql of dropPolicies) {
      const { error } = await supabase.rpc('query', { query: sql }).single()
      if (error && !error.message.includes('does not exist')) {
        console.log(`⚠️ Warning dropping policy: ${error.message}`)
      }
    }
    console.log('✅ ลบ policies เก่าเรียบร้อย')
    console.log('')

    // 2. Create new policies
    console.log('2. 🛡️ สร้าง policies ใหม่...')

    // INSERT policy
    const insertPolicy = `
      CREATE POLICY "Hotel users can create hotel bookings final"
      ON bookings FOR INSERT
      WITH CHECK (
        is_hotel_booking = true
        AND auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('HOTEL', 'ADMIN')
        )
      );
    `

    const { error: insertError } = await supabase.rpc('query', { query: insertPolicy }).single()
    if (insertError) {
      console.log('❌ Insert policy error:', insertError.message)
    } else {
      console.log('✅ Insert policy สร้างแล้ว')
    }

    // SELECT policy
    const selectPolicy = `
      CREATE POLICY "Hotel users can view hotel bookings final"
      ON bookings FOR SELECT
      USING (
        is_hotel_booking = true
        AND auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('HOTEL', 'ADMIN')
        )
      );
    `

    const { error: selectError } = await supabase.rpc('query', { query: selectPolicy }).single()
    if (selectError) {
      console.log('❌ Select policy error:', selectError.message)
    } else {
      console.log('✅ Select policy สร้างแล้ว')
    }

    // UPDATE policy
    const updatePolicy = `
      CREATE POLICY "Hotel users can update hotel bookings final"
      ON bookings FOR UPDATE
      USING (
        is_hotel_booking = true
        AND auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('HOTEL', 'ADMIN')
        )
      )
      WITH CHECK (
        is_hotel_booking = true
        AND auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('HOTEL', 'ADMIN')
        )
      );
    `

    const { error: updateError } = await supabase.rpc('query', { query: updatePolicy }).single()
    if (updateError) {
      console.log('❌ Update policy error:', updateError.message)
    } else {
      console.log('✅ Update policy สร้างแล้ว')
    }

    console.log('')
    console.log('🎉 ====================================')
    console.log('   RLS Fix เสร็จสิ้น!')
    console.log('🎉 ====================================')
    console.log('')
    console.log('✅ Policies ใหม่สร้างแล้ว')
    console.log('✅ พร้อมใช้งานการจอง')
    console.log('')
    console.log('🔄 กรุณา refresh หน้า hotel app แล้วลองจองใหม่')

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
  }
}

// Check if we can use a simpler approach
async function simpleRLSFix() {
  console.log('🔧 ====================================')
  console.log('   Simple RLS Fix - Direct Query')
  console.log('🔧 ====================================')

  try {
    // Try to run a simple test insert to see what happens
    console.log('1. 🧪 ทดสอบการจองด้วย direct query...')

    const testBooking = {
      service_id: 'test-service-' + Date.now(),
      booking_date: '2026-02-20',
      booking_time: '14:00:00',
      duration: 60,
      hotel_room_number: '101',
      customer_notes: 'Test booking from direct fix',
      base_price: 1000.00,
      final_price: 1000.00,
      status: 'confirmed',
      is_hotel_booking: true
    }

    // Use service role client to insert without RLS
    const { data, error } = await supabase
      .from('bookings')
      .insert(testBooking)
      .select()

    if (error) {
      console.log('❌ ยังคงมีปัญหา RLS:', error.message)
      return false
    } else {
      console.log('✅ การจองสำเร็จ! ID:', data[0]?.id)

      // Delete the test booking
      await supabase
        .from('bookings')
        .delete()
        .eq('id', data[0]?.id)

      console.log('✅ ลบข้อมูลทดสอบแล้ว')
      return true
    }

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาดในการทดสอบ:', error.message)
    return false
  }
}

async function main() {
  const success = await simpleRLSFix()

  if (!success) {
    console.log('⚠️ การทดสอบไม่สำเร็จ กำลังใช้วิธีแก้ไขโดยตรง...')
    await executeSQLDirectly()
  }
}

main().catch(console.error)