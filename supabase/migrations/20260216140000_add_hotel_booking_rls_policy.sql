-- Migration: Add Hotel Booking RLS Policy
-- Description: Allow hotel staff to create bookings for guests
-- Version: 20260216140000

-- ============================================
-- HOTEL BOOKING RLS POLICIES
-- ============================================

-- Hotel staff can create bookings for their hotel guests
CREATE POLICY "Hotel staff can create hotel bookings" ON bookings
  FOR INSERT WITH CHECK (
    is_hotel_booking = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'HOTEL'
    )
  );

-- Hotel staff can view bookings from their hotel
CREATE POLICY "Hotel staff can view hotel bookings" ON bookings
  FOR SELECT USING (
    is_hotel_booking = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'HOTEL'
    )
  );

-- Hotel staff can update bookings from their hotel
CREATE POLICY "Hotel staff can update hotel bookings" ON bookings
  FOR UPDATE USING (
    is_hotel_booking = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'HOTEL'
    )
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Hotel staff can create hotel bookings" ON bookings IS 'Allow hotel staff to create bookings for hotel guests';
COMMENT ON POLICY "Hotel staff can view hotel bookings" ON bookings IS 'Allow hotel staff to view bookings from their hotel';
COMMENT ON POLICY "Hotel staff can update hotel bookings" ON bookings IS 'Allow hotel staff to update bookings from their hotel';