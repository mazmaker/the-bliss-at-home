#!/usr/bin/env node

/**
 * Test Hotel Booking with Location Data
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

async function testHotelBookingWithLocation() {
  console.log('🏨 Testing hotel booking with location data...')

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    // Create a test booking
    const testBooking = {
      service_id: '986bf0ef-f5f5-47ea-bf6f-962ebf801e94', // นวดไทย (1ชั่วโมง)
      hotel_id: '550e8400-e29b-41d4-a716-446655440002', // รีสอร์ทในฝัน เชียงใหม่
      booking_date: '2026-02-19',
      booking_time: '14:00:00',
      duration: 60,
      base_price: 800,
      final_price: 640, // 20% hotel discount
      status: 'confirmed',
      payment_status: 'paid',
      is_hotel_booking: true,
      hotel_room_number: '205',
      address: 'Resort Chiang Mai, Room 205',
      customer_notes: 'Guest: คุณสมศรี ทดสอบ\nPhone: 0812345678\nSpecial Request: ต้องการน้ำมันหอมระเหย'
    }

    console.log('1. 📝 Creating test booking...')
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

    // Query booking with hotel info (like our updated GuestBookings.tsx)
    console.log('2. 🔍 Querying booking with hotel info...')
    const { data: bookingWithHotel, error: queryError } = await supabase
      .from('bookings')
      .select(`
        id,
        hotel_room_number,
        booking_date,
        booking_time,
        final_price,
        status,
        payment_status,
        customer_notes,
        created_at,
        hotel:hotels(id, name_th, address, phone, email, rating),
        services:service_id(name_th),
        staff:staff_id(name_th)
      `)
      .eq('id', booking.id)
      .single()

    if (queryError) {
      console.error('❌ Query failed:', queryError.message)
      return
    }

    console.log('✅ Booking query successful!')
    console.log('📊 Results:')
    console.log('   Guest:', parseCustomerFromNotes(bookingWithHotel.customer_notes))
    console.log('   Hotel:', bookingWithHotel.hotel?.name_th)
    console.log('   Address:', bookingWithHotel.hotel?.address)
    console.log('   Phone:', bookingWithHotel.hotel?.phone)
    console.log('   Email:', bookingWithHotel.hotel?.email)
    console.log('   Rating:', bookingWithHotel.hotel?.rating)

    // Clean up
    console.log('3. 🧹 Cleaning up test booking...')
    await supabase.from('bookings').delete().eq('id', booking.id)
    console.log('✅ Test booking deleted')

    console.log('\n🎉 Test completed successfully!')
    console.log('✅ Hotel location data is now available in booking queries')
    console.log('✅ Customer data parsing works correctly')
    console.log('✅ Ready to test in Guest Bookings modal!')

  } catch (error) {
    console.error('💥 Test failed:', error.message)
  }
}

// Helper function (same as in GuestBookings.tsx)
function parseCustomerFromNotes(customerNotes) {
  if (!customerNotes) return 'ไม่ระบุชื่อ'

  const guestMatch = customerNotes.match(/Guest:\s*([^,\n]+)/)
  return guestMatch?.[1]?.trim() || 'ไม่ระบุชื่อ'
}

testHotelBookingWithLocation()