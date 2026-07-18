-- P5 STEP C: fix the hotel SELECT RLS on booking_addons.
--
-- The original "Hotels can view own booking addons" policy matched
--   bookings.hotel_id = profiles.hotel_id
-- but profiles.hotel_id is NULL for every hotel account — hotels link to their tenant
-- via hotels.auth_user_id (the whole hotel app, incl. EnhancedLogin, uses that key).
-- So the policy NEVER matched and a hotel could not read its own bookings' add-ons
-- (surfaced by STEP C, the first feature to make hotels read booking_addons — the
-- BookingHistory / MonthlyBill add-on lines came back empty).
--
-- Rewrite the policy to link via hotels.auth_user_id. Still strictly scoped to the
-- hotel's OWN bookings; admins keep their existing "Admins can manage all booking addons".
-- Applied to prod 2026-07-13 via apply_migration p5_stepc_fix_hotel_booking_addons_rls.

DROP POLICY IF EXISTS "Hotels can view own booking addons" ON public.booking_addons;

CREATE POLICY "Hotels can view own booking addons" ON public.booking_addons
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      JOIN public.hotels h ON h.id = b.hotel_id
      WHERE b.id = booking_addons.booking_id
        AND h.auth_user_id = auth.uid()
    )
  );
