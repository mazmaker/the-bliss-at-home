/**
 * 🔍 Simple Booking Check
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkBooking() {
  console.log('🔍 Checking booking: BK20260220-0061')

  // Get the booking
  const { data: booking } = await supabase
    .from('bookings')
    .select('booking_number, hotel_id, hotels:hotel_id(name_th)')
    .eq('booking_number', 'BK20260220-0061')
    .single()

  if (booking) {
    console.log(`✅ Found booking: ${booking.booking_number}`)
    console.log(`   Hotel ID: ${booking.hotel_id}`)
    console.log(`   Hotel: ${booking.hotels?.name_th}`)
  } else {
    console.log('❌ Booking not found')
  }

  // Check user mapping
  const { data: user } = await supabase
    .from('profiles')
    .select('email, hotel_id, hotels:hotel_id(name_th)')
    .eq('email', 'info@dusit.com')
    .single()

  if (user) {
    console.log(`\n👤 User: ${user.email}`)
    console.log(`   Hotel ID: ${user.hotel_id}`)
    console.log(`   Hotel: ${user.hotels?.name_th}`)
  }

  console.log('\n🔍 Problem Analysis:')
  if (booking && user) {
    if (booking.hotel_id === user.hotel_id) {
      console.log('✅ Hotel IDs match')
      console.log('🤔 Problem might be in Admin display logic')
    } else {
      console.log('❌ Hotel IDs do NOT match!')
      console.log('💡 Server authentication middleware problem')
    }
  }

  // Show latest bookings
  const { data: latest } = await supabase
    .from('bookings')
    .select('booking_number, hotel_id, hotels:hotel_id(name_th), created_at')
    .order('created_at', { ascending: false })
    .limit(3)

  console.log('\n📊 Latest 3 Bookings:')
  latest?.forEach((b, i) => {
    const date = new Date(b.created_at).toLocaleString()
    console.log(`   ${i+1}. ${b.booking_number} → ${b.hotels?.name_th} (${date})`)
  })
}

checkBooking()