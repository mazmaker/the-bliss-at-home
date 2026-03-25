/**
 * Test Page for Extend Session Feature
 * Quick test to verify components work with real database
 */

import React from 'react';
import { ExtendSessionButton } from '../components/ExtendSessionButton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@bliss/supabase/auth';

// Mock booking data for testing
const mockBooking = {
  id: 'test-booking-id',
  booking_number: 'BK2024001',
  guest_name: 'Test Guest',
  room_number: '101',
  service_name: 'นวดไทย',
  duration: 60,
  final_price: 552,
  status: 'confirmed',
  extension_count: 0,
  booking_services: [
    {
      id: 'service-1',
      service_id: 'thai-massage',
      duration: 60,
      price: 552,
      is_extension: false,
      recipient_index: 0,
      recipient_name: 'Test Guest'
    }
  ]
};

function TestExtendSession() {
  // Test database connection
  const { data: dbTest, error } = useQuery(
    ['db-test'],
    async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_number,
          status,
          extension_count,
          booking_services (*)
        `)
        .eq('is_hotel_booking', true)
        .limit(1);

      if (error) throw error;
      return data;
    }
  );

  const handleExtensionComplete = () => {
    console.log('✅ Extension completed!');
    alert('Extension test completed!');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🧪 Test Extend Session Feature</h1>

        {/* Database Connection Test */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="font-semibold mb-3">📊 Database Connection Test:</h2>
          {error ? (
            <div className="text-red-600">❌ Database Error: {error.message}</div>
          ) : dbTest ? (
            <div className="text-green-600">
              ✅ Database Connected - Found {dbTest.length} hotel bookings
              {dbTest.map(booking => (
                <div key={booking.id} className="text-sm mt-2 p-2 bg-gray-50 rounded">
                  🏨 {booking.booking_number} - Extensions: {booking.extension_count || 0}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-600">🔄 Loading database test...</div>
          )}
        </div>

        {/* Component Test with Mock Data */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="font-semibold mb-3">🎛️ Component Test (Mock Data):</h2>
          <div className="border p-4 rounded">
            <div className="mb-4">
              <h3 className="font-medium">Mock Booking:</h3>
              <p className="text-sm text-gray-600">
                {mockBooking.booking_number} - {mockBooking.service_name}
                ({mockBooking.duration} นาที) - ฿{mockBooking.final_price}
              </p>
            </div>

            <ExtendSessionButton
              booking={mockBooking}
              onExtended={handleExtensionComplete}
            />
          </div>
        </div>

        {/* Real Booking Test */}
        {dbTest && dbTest.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="font-semibold mb-3">🔧 Real Booking Test:</h2>
            <div className="border p-4 rounded">
              <div className="mb-4">
                <h3 className="font-medium">Real Booking:</h3>
                <p className="text-sm text-gray-600">
                  {dbTest[0].booking_number} - Status: {dbTest[0].status}
                  - Extensions: {dbTest[0].extension_count || 0}
                </p>
              </div>

              <ExtendSessionButton
                booking={dbTest[0]}
                onExtended={() => {
                  console.log('Real booking extension completed!');
                  // Refetch data
                  window.location.reload();
                }}
              />
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mt-6">
          <h3 className="font-semibold text-blue-800 mb-2">📋 Testing Instructions:</h3>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. ✅ Check database connection shows green</li>
            <li>2. 🎛️ Click "เพิ่มเวลาบริการ" button (mock data)</li>
            <li>3. 📝 Verify modal opens with duration options</li>
            <li>4. ✅ Select a duration and confirm</li>
            <li>5. 🔍 Check browser console for logs</li>
            <li>6. 🏨 Test with real booking (if available)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default TestExtendSession;