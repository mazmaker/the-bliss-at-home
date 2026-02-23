/**
 * 🧪 BOOKING ATTRIBUTION TEST
 * Run after cache clearing to verify fixes work
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🧪 BOOKING ATTRIBUTION TEST');
console.log('===========================');

async function testBookingAttribution() {
  try {
    console.log('\n📊 BEFORE TEST: Current Booking Distribution');

    // Get current booking distribution
    const { data: beforeBookings } = await supabase
      .from('bookings')
      .select(`
        booking_number,
        hotel_id,
        hotels(name_th, hotel_slug)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    const beforeCount = {};
    beforeBookings?.forEach(booking => {
      const hotelName = booking.hotels?.name_th || 'UNKNOWN';
      beforeCount[hotelName] = (beforeCount[hotelName] || 0) + 1;
    });

    console.log('Current Distribution:');
    Object.entries(beforeCount).forEach(([hotel, count]) => {
      console.log(`  ${hotel}: ${count} bookings`);
    });

    console.log('\n🎯 TESTING INSTRUCTIONS:');
    console.log('========================');
    console.log('1. Clear browser cache using clear-browser-cache.js');
    console.log('2. Hard refresh: Ctrl+F5 / Cmd+Shift+R');
    console.log('3. Visit: http://localhost:3003/hotel/dusit-thani-bangkok');
    console.log('4. Login with: info@dusit.com');
    console.log('5. Create a test booking');
    console.log('6. Run this script again to see new distribution');

    console.log('\n🔍 EXPECTED RESULTS AFTER TEST:');
    console.log('- New booking should have hotel_id: 550e8400-e29b-41d4-a716-446655440003');
    console.log('- Admin should show booking under "โรงแรมดุสิต ธานี"');
    console.log('- NOT under "รีสอร์ทในฝัน เชียงใหม่"');

    // Monitor for new bookings in real-time
    console.log('\n👀 MONITORING FOR NEW BOOKINGS...');
    console.log('(Press Ctrl+C to stop monitoring)');

    const subscription = supabase
      .channel('bookings-test')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'bookings'
      }, (payload) => {
        console.log('\n🚨 NEW BOOKING DETECTED!');
        console.log('Booking ID:', payload.new.id);
        console.log('Hotel ID:', payload.new.hotel_id);
        console.log('Booking Number:', payload.new.booking_number);

        if (payload.new.hotel_id === '550e8400-e29b-41d4-a716-446655440003') {
          console.log('✅ SUCCESS: Booking attributed to Dusit Thani!');
        } else if (payload.new.hotel_id === '550e8400-e29b-41d4-a716-446655440002') {
          console.log('❌ PROBLEM: Still going to Resort Chiang Mai');
        } else {
          console.log('🤔 UNKNOWN: Unexpected hotel_id');
        }
      })
      .subscribe();

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testBookingAttribution();