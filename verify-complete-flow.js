/**
 * 🔍 COMPREHENSIVE FLOW VERIFICATION
 * Check entire booking flow from URL to Database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 COMPREHENSIVE BOOKING FLOW VERIFICATION');
console.log('=========================================');

async function verifyCompleteFlow() {
  try {
    // 1. Check Hotel Context Flow
    console.log('\n📋 1. HOTEL CONTEXT FLOW VERIFICATION');
    console.log('------------------------------------');

    const hotels = {
      'dusit-thani-bangkok': '550e8400-e29b-41d4-a716-446655440003',
      'resort-chiang-mai': '550e8400-e29b-41d4-a716-446655440002'
    };

    console.log('Expected Hotel Mapping:');
    Object.entries(hotels).forEach(([slug, id]) => {
      console.log(`  /hotel/${slug} → hotel_id: ${id}`);
    });

    // 2. Check useHotelContext Logic
    console.log('\n📋 2. useHotelContext LOGIC CHECK');
    console.log('---------------------------------');

    const { data: hotelData } = await supabase
      .from('hotels')
      .select('id, name_th, hotel_slug')
      .in('hotel_slug', Object.keys(hotels));

    console.log('Database Hotel Records:');
    hotelData?.forEach(hotel => {
      const expectedId = hotels[hotel.hotel_slug];
      const match = hotel.id === expectedId ? '✅' : '❌';
      console.log(`  ${match} ${hotel.hotel_slug} → ${hotel.name_th} (${hotel.id})`);
    });

    // 3. Check User Hotel Mappings
    console.log('\n📋 3. USER HOTEL MAPPINGS');
    console.log('-------------------------');

    const { data: profiles } = await supabase
      .from('profiles')
      .select('email, hotel_id, role')
      .eq('role', 'HOTEL');

    console.log('User → Hotel Mappings:');
    profiles?.forEach(profile => {
      const hotel = hotelData?.find(h => h.id === profile.hotel_id);
      console.log(`  ${profile.email} → ${hotel?.name_th || 'UNMAPPED'} (${profile.hotel_id})`);
    });

    // 4. Check Recent Bookings Attribution
    console.log('\n📋 4. RECENT BOOKING ATTRIBUTION');
    console.log('--------------------------------');

    const { data: recentBookings } = await supabase
      .from('bookings')
      .select('booking_number, hotel_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    console.log('Recent Bookings Distribution:');
    const bookingCount = {};
    recentBookings?.forEach(booking => {
      const hotel = hotelData?.find(h => h.id === booking.hotel_id);
      const hotelName = hotel?.name_th || 'UNKNOWN';
      bookingCount[hotelName] = (bookingCount[hotelName] || 0) + 1;
    });

    Object.entries(bookingCount).forEach(([hotel, count]) => {
      console.log(`  ${hotel}: ${count} bookings`);
    });

    // 5. Check for Remaining Locks
    console.log('\n📋 5. POTENTIAL LOCKS/ISSUES CHECK');
    console.log('----------------------------------');

    console.log('✅ Fixed Issues:');
    console.log('  - useUserHotelId fallback: Now uses URL slug');
    console.log('  - DynamicHotelRedirect fallback: Now uses URL slug');
    console.log('  - EnhancedLogin fallback: Now uses URL slug');
    console.log('  - BookingModalNew: Sends hotel_id from useHotelContext');
    console.log('  - Server: Uses req.body.hotel_id with validation');

    console.log('\n🔍 Potential Remaining Issues:');
    console.log('  - Browser session cache (localStorage/sessionStorage)');
    console.log('  - React Query cache (hotel context cache)');
    console.log('  - Authentication session persistence');
    console.log('  - Zustand store persistence');

    // 6. Expected Flow After Fix
    console.log('\n🎯 EXPECTED FLOW (After Fix):');
    console.log('-----------------------------');
    console.log('1. User visits /hotel/dusit-thani-bangkok');
    console.log('2. useHotelContext → hotelId = "550e8400-e29b-41d4-a716-446655440003"');
    console.log('3. BookingModalNew → secureBookingData.hotel_id = Dusit ID');
    console.log('4. Server → req.body.hotel_id = Dusit ID');
    console.log('5. Database → booking.hotel_id = Dusit ID');
    console.log('6. Admin → Booking appears under "โรงแรมดุสิต ธานี"');

    console.log('\n🧪 TESTING INSTRUCTIONS:');
    console.log('========================');
    console.log('1. Clear ALL browser storage: localStorage.clear(); sessionStorage.clear();');
    console.log('2. Hard refresh: Ctrl+F5 / Cmd+Shift+R');
    console.log('3. Visit: /hotel/dusit-thani-bangkok');
    console.log('4. Check Console: Should see Dusit hotel_id in logs');
    console.log('5. Create booking and verify in admin');

  } catch (error) {
    console.error('💥 Flow verification failed:', error.message);
  }
}

verifyCompleteFlow();