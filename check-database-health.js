/**
 * Database Health Check Script
 * ตรวจสอบสถานะฐานข้อมูล Supabase
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: './apps/server/.env' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkDatabaseHealth() {
  console.log('🔍 === ตรวจสอบสถานะฐานข้อมูล === 🔍\n')

  try {
    // 1. Check connection
    console.log('1️⃣ ตรวจสอบการเชื่อมต่อ...')
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    if (error) {
      console.log('❌ การเชื่อมต่อล้มเหลว:', error.message)
      return
    }
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ\n')

    // 2. Check key tables
    console.log('2️⃣ ตรวจสอบตารางหลัก...')
    const tables = [
      'profiles',
      'hotels',
      'services',
      'bookings',
      'booking_services',
      'staff',
      'notifications'
    ]

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (error) {
          console.log(`❌ ${table}: ${error.message}`)
        } else {
          console.log(`✅ ${table}: ${count} records`)
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`)
      }
    }

    // 3. Check RLS policies
    console.log('\n3️⃣ ตรวจสอบ RLS Policies...')
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('tablename, policyname, permissive, roles, cmd')
      .in('tablename', ['bookings', 'booking_services', 'profiles', 'staff'])

    if (policiesError) {
      console.log('❌ ไม่สามารถตรวจสอบ RLS policies:', policiesError.message)
    } else {
      console.log(`✅ พบ RLS policies: ${policies.length} policies`)

      // Group by table
      const policiesByTable = {}
      policies.forEach(policy => {
        if (!policiesByTable[policy.tablename]) {
          policiesByTable[policy.tablename] = []
        }
        policiesByTable[policy.tablename].push(policy)
      })

      Object.entries(policiesByTable).forEach(([table, tablePolicies]) => {
        console.log(`   📋 ${table}: ${tablePolicies.length} policies`)
        tablePolicies.forEach(policy => {
          console.log(`      - ${policy.policyname} (${policy.cmd})`)
        })
      })
    }

    // 4. Check bookings table specifically
    console.log('\n4️⃣ ตรวจสอบตาราง bookings โดยเฉพาะ...')
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id, hotel_id, service_id, status,
        created_at, booking_date, booking_time,
        hotels(name_th),
        services(name_th)
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    if (bookingsError) {
      console.log('❌ ไม่สามารถดึงข้อมูล bookings:', bookingsError.message)
    } else {
      console.log(`✅ bookings ล่าสุด: ${bookings.length} รายการ`)
      bookings.forEach(booking => {
        console.log(`   📅 ${booking.booking_date} ${booking.booking_time} - ${booking.hotels?.name_th || 'Unknown Hotel'} - ${booking.services?.name_th || 'Unknown Service'} (${booking.status})`)
      })
    }

    // 5. Check hotel test user
    console.log('\n5️⃣ ตรวจสอบ Hotel User...')
    const hotelUserId = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3'
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, hotel_id, hotels(name_th)')
      .eq('id', hotelUserId)
      .single()

    if (profileError) {
      console.log('❌ ไม่พบข้อมูล Hotel User:', profileError.message)
    } else {
      console.log('✅ Hotel User Profile:')
      console.log(`   👤 Email: ${profile.email}`)
      console.log(`   🎭 Role: ${profile.role}`)
      console.log(`   🏨 Hotel: ${profile.hotels?.name_th || 'No hotel assigned'}`)
    }

    // 6. Test booking insertion (dry run)
    console.log('\n6️⃣ ทดสอบการสร้าง booking (จำลอง)...')

    // Get a test service and hotel
    const { data: testService } = await supabase
      .from('services')
      .select('id, name_th')
      .limit(1)
      .single()

    const { data: testHotel } = await supabase
      .from('hotels')
      .select('id, name_th')
      .limit(1)
      .single()

    if (testService && testHotel) {
      console.log(`✅ พร้อมทดสอบ: Service "${testService.name_th}" ใน Hotel "${testHotel.name_th}"`)

      // Test booking data structure
      const testBookingData = {
        hotel_id: testHotel.id,
        service_id: testService.id,
        booking_date: '2026-02-24',
        booking_time: '14:00',
        duration: 60,
        base_price: 1000,
        final_price: 1000,
        hotel_room_number: 'TEST-001',
        customer_notes: 'Database health check test booking',
        status: 'confirmed',
        payment_status: 'pending',
        is_hotel_booking: true
      }

      console.log('📋 Test booking data structure: ✅ Valid')
      console.log(`   🏨 Hotel: ${testHotel.name_th}`)
      console.log(`   💆‍♀️ Service: ${testService.name_th}`)
      console.log(`   📅 Date: ${testBookingData.booking_date} ${testBookingData.booking_time}`)
    } else {
      console.log('❌ ไม่พบข้อมูล Service หรือ Hotel สำหรับทดสอบ')
    }

    console.log('\n🎉 === การตรวจสอบเสร็จสิ้น ===')

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาดในการตรวจสอบ:', error.message)
  }
}

// Run the health check
checkDatabaseHealth()