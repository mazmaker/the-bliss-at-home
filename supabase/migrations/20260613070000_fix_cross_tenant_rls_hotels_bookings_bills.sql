-- Migration: Fix cross-tenant (IDOR) data leak on hotels / bookings / monthly_bills
-- Date: 2026-06-13
-- Context: A logged-in hotel could read (and in some cases write) ANY other hotel's
-- data — profile incl. bank/tax, and all bookings — because of accumulated
-- over-permissive RLS policies (blanket `using (true)` and role-only policies that
-- were never scoped to the owner hotel). The intended owner-scoped policies relied on
-- get_user_hotel_id() = profiles.metadata->>'hotel_id', which is NULL for every hotel
-- user; the real link is hotels.auth_user_id = auth.uid(). This migration:
--   1. redefines get_user_hotel_id() to use hotels.auth_user_id (the populated link)
--   2. drops every blanket / role-wide / dead policy on hotels, bookings, monthly_bills
--   3. recreates correct owner-scoped + admin/customer/staff policies
-- Server code uses the service-role key (bypasses RLS) so server flows are unaffected.

-- ============================================================
-- 1. Correct the owner-lookup helper
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_hotel_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.hotels WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

COMMENT ON FUNCTION get_user_hotel_id() IS 'Hotel id owned by the current auth user (via hotels.auth_user_id).';

-- ============================================================
-- 2. HOTELS — remove blanket, keep owner+admin, add admin writes
-- ============================================================
DROP POLICY IF EXISTS "Allow all operations on hotels for authenticated users" ON hotels;
-- "Hotels can view own data" (id = get_user_hotel_id() OR admin) and
-- "Hotels can update own data" (id = get_user_hotel_id()) already exist and now work.

CREATE POLICY "Admins can insert hotels" ON hotels
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Admins can delete hotels" ON hotels
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ============================================================
-- 3. BOOKINGS — drop over-permissive / dead, recreate owner-scoped
-- ============================================================
DROP POLICY IF EXISTS "allow_all_authenticated_bookings" ON bookings;   -- ALL using(true)
DROP POLICY IF EXISTS "allow_hotel_bookings_final" ON bookings;         -- ALL any HOTEL
DROP POLICY IF EXISTS "temp_allow_all_bookings" ON bookings;            -- INSERT with_check(true)
DROP POLICY IF EXISTS "customer_booking_access" ON bookings;            -- SELECT using(true)
DROP POLICY IF EXISTS "hotel_users_can_view_bookings" ON bookings;      -- SELECT any HOTEL/ADMIN
DROP POLICY IF EXISTS "hotel_users_read_bookings" ON bookings;          -- SELECT any HOTEL
DROP POLICY IF EXISTS "hotel_insert_bookings_v3" ON bookings;           -- INSERT any HOTEL
DROP POLICY IF EXISTS "Hotel users can create hotel bookings" ON bookings; -- INSERT not hotel-scoped
DROP POLICY IF EXISTS "Hotels can view their bookings (improved)" ON bookings; -- dead (metadata)
DROP POLICY IF EXISTS "Hotels can create own bookings" ON bookings;     -- dead (metadata)
DROP POLICY IF EXISTS "Hotels can update own bookings" ON bookings;     -- dead (metadata)
-- KEPT: "Admins can view all bookings", "Admins can insert bookings",
--       "Admins can update all bookings", "Admins can delete bookings",
--       "Customers can create bookings", "Customers can view own bookings",
--       "Staff can view assigned bookings".

CREATE POLICY "Hotels can view their bookings" ON bookings
  FOR SELECT USING (hotel_id = get_user_hotel_id());

CREATE POLICY "Hotels can create own bookings" ON bookings
  FOR INSERT WITH CHECK (hotel_id = get_user_hotel_id() AND is_hotel_booking = true);

CREATE POLICY "Hotels can update own bookings" ON bookings
  FOR UPDATE USING (hotel_id = get_user_hotel_id())
  WITH CHECK (hotel_id = get_user_hotel_id());

-- ============================================================
-- 4. MONTHLY_BILLS — drop dead policy, add reliable owner-scoped read
-- ============================================================
DROP POLICY IF EXISTS "Hotels can view own bills" ON monthly_bills;     -- dead (metadata)
-- "Hotel users can view own hotel bills" (profiles.hotel_id) kept as-is (harmless).

CREATE POLICY "Hotels can view own bills (v2)" ON monthly_bills
  FOR SELECT USING (hotel_id = get_user_hotel_id());
