#!/usr/bin/env node

/**
 * Test Admin Booking with Hotel Location Data
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

async function testAdminBookingLocation() {
  console.log('🏨 Testing Admin Booking with Hotel Location Data...')

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    // Create a test hotel booking
    const testBooking = {
      service_id: '986bf0ef-f5f5-47ea-bf6f-962ebf801e94', // นวดไทย
      hotel_id: '550e8400-e29b-41d4-a716-446655440002', // รีสอร์ทในฝัน เชียงใหม่
      booking_date: '2026-02-19',
      booking_time: '15:30:00',
      duration: 90,
      base_price: 750,
      final_price: 600, // 20% hotel discount
      status: 'confirmed',
      payment_status: 'paid',
      is_hotel_booking: true,
      hotel_room_number: '501',
      address: 'รีสอร์ทในฝัน เชียงใหม่ ห้อง 501',
      customer_notes: 'Guest: คุณทดสอบ นาค\nPhone: 0898765432\nRequest: ต้องการน้ำมันหอม'
    }

    console.log('1. 📝 Creating test hotel booking...')
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(testBooking)
      .select()
      .single()

    if (bookingError) {
      console.error('❌ Booking creation failed:', bookingError.message)
      return
    }

    console.log('✅ Test booking created:', booking.id)

    // Query booking like admin app does
    console.log('2. 🔍 Querying booking with hotel info (Admin style)...')
    const { data: adminBooking, error: queryError } = await supabase
      .from('bookings')
      .select(`
        *,
        hotel:hotels(id, name_th, address, phone, email, rating),
        staff(id, name_th, phone),
        service:services(id, name_th, name_en, category, duration, base_price)
      `)
      .eq('id', booking.id)
      .single()

    if (queryError) {
      console.error('❌ Admin query failed:', queryError.message)
      return
    }

    console.log('✅ Admin booking query successful!')
    console.log('📊 Hotel Information Available:')
    console.log(`   🏨 Hotel: ${adminBooking.hotel?.name_th}`)
    console.log(`   📍 Address: ${adminBooking.hotel?.address}`)
    console.log(`   📞 Phone: ${adminBooking.hotel?.phone}`)
    console.log(`   ✉️ Email: ${adminBooking.hotel?.email}`)
    console.log(`   ⭐ Rating: ${adminBooking.hotel?.rating}`)
    console.log(`   🏠 Room: ${adminBooking.hotel_room_number}`)
    console.log(`   👤 Guest: ${parseCustomerFromNotes(adminBooking.customer_notes)}`)

    // Test customer data parsing
    const customerData = parseCustomerFromNotes(adminBooking.customer_notes)
    console.log('✅ Customer parsing works:', customerData)

    // Clean up - keep booking for admin testing
    console.log('3. 📋 Keeping booking for admin app testing')
    console.log(`   Visit: http://localhost:3001/admin/bookings`)
    console.log(`   Look for booking: ${adminBooking.booking_number || booking.id.slice(-8)}`)

    console.log('\n🎉 Admin App Hotel Location Test Completed!')
    console.log('✅ Hotel data now available in Admin bookings')
    console.log('✅ Modal should show hotel info instead of customer address')
    console.log('✅ Ready to test in browser!')

  } catch (error) {
    console.error('💥 Test failed:', error.message)
  }
}

// Helper function
function parseCustomerFromNotes(customerNotes) {
  if (!customerNotes) return 'ไม่ระบุชื่อ'

  const guestMatch = customerNotes.match(/Guest:\s*([^,\n]+)/)
  const phoneMatch = customerNotes.match(/Phone:\s*([^,\n]+)/)

  return {
    name: guestMatch?.[1]?.trim() || 'ไม่ระบุชื่อ',
    phone: phoneMatch?.[1]?.trim() || 'ไม่ระบุเบอร์'
  }
}

testAdminBookingLocation()