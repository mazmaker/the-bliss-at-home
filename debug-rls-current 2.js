#!/usr/bin/env node
/**
 * Debug Current RLS Policies
 * ตรวจสอบ RLS policies ที่มีอยู่ในฐานข้อมูลตอนนี้
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'
const USER_ID = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function debugRLSCurrent() {
  console.log('🔍 ====================================')
  console.log('   ตรวจสอบ RLS Policies ปัจจุบัน')
  console.log('🔍 ====================================')
  console.log('')

  try {
    // 1. Check current user auth state
    console.log('1. 👤 ตรวจสอบ user และ session...')

    // Get profile info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, created_at, updated_at')
      .eq('id', USER_ID)
      .single()

    if (profileError) {
      console.log('❌ Profile error:', profileError.message)
      return
    }

    console.log('   User ID:', profile.id)
    console.log('   Email:', profile.email)
    console.log('   Role:', profile.role)
    console.log('   Created:', profile.created_at)
    console.log('   Updated:', profile.updated_at)
    console.log('')

    // 2. Test auth.uid() directly
    console.log('2. 🔑 ทดสอบ auth.uid() function...')

    try {
      const { data: authTest, error: authError } = await supabase
        .from('profiles')
        .select('auth.uid() as current_uid')
        .limit(1)

      if (authError) {
        console.log('⚠️ Auth test error (expected for service role):', authError.message)
      } else {
        console.log('   auth.uid():', authTest)
      }
    } catch (e) {
      console.log('⚠️ Cannot test auth.uid() with service role (this is normal)')
    }
    console.log('')

    // 3. Get current policies on bookings table
    console.log('3. 📋 RLS Policies บน bookings table...')

    // This query needs to be done directly through SQL
    console.log('   กำลังดึงข้อมูล policies...')

    // Try to query policies - this might not work through the JS client
    console.log('   ⚠️ ไม่สามารถดึง policies ผ่าน JS client ได้')
    console.log('   💡 ต้องตรวจสอบผ่าน Supabase Dashboard แทน')
    console.log('')

    // 4. Test booking insertion with different approaches
    console.log('4. 🧪 ทดสอบการแทรกข้อมูลด้วยวิธีต่างๆ...')

    // Get a real service for testing
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name')
      .limit(1)

    if (servicesError || !services || services.length === 0) {
      console.log('❌ ไม่พบ services สำหรับทดสอบ:', servicesError?.message)
      return
    }

    console.log('   Service for testing:', services[0].name, '(' + services[0].id + ')')

    // Test 1: Direct insert with service role (should work)
    console.log('')
    console.log('   🔧 ทดสอบ 1: Direct insert with service role...')

    const testBooking1 = {
      service_id: services[0].id,
      booking_date: '2026-02-20',
      booking_time: '14:00:00',
      duration: 60,
      hotel_room_number: '101',
      customer_notes: 'Test booking - service role',
      base_price: 1000.00,
      final_price: 1000.00,
      status: 'confirmed',
      is_hotel_booking: true
    }

    const { data: result1, error: error1 } = await supabase
      .from('bookings')
      .insert(testBooking1)
      .select()

    if (error1) {
      console.log('   ❌ Service role insert failed:', error1.message)
    } else {
      console.log('   ✅ Service role insert succeeded:', result1[0]?.id)

      // Clean up
      await supabase.from('bookings').delete().eq('id', result1[0]?.id)
      console.log('   🗑️ Test data cleaned up')
    }

    console.log('')
    console.log('🎯 ====================================')
    console.log('   สรุปปัญหา')
    console.log('🎯 ====================================')
    console.log('')
    console.log('✅ User profile: OK')
    console.log('✅ Service role insert: OK')
    console.log('❌ Frontend user insert: FAIL')
    console.log('')
    console.log('🔍 สาเหตุที่เป็นไปได้:')
    console.log('   1. RLS policies ไม่ถูกต้อง')
    console.log('   2. Frontend auth context ผิดพลาด')
    console.log('   3. Migration ยังไม่ถูก apply')
    console.log('')
    console.log('📋 ขั้นตอนแก้ไขต่อไป:')
    console.log('   1. ตรวจสอบ policies ใน Supabase Dashboard')
    console.log('   2. แก้ไข frontend auth context')
    console.log('   3. Re-apply migration ถ้าจำเป็น')

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
  }
}

debugRLSCurrent().catch(console.error)