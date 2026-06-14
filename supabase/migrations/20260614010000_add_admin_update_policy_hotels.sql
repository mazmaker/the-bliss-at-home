-- Migration: Restore ADMIN update capability on hotels (regression fix)
-- Date: 2026-06-14
-- Context: 20260613070000_fix_cross_tenant_rls_hotels_bookings_bills.sql dropped the
-- blanket `using(true)` policy on hotels and added admin policies for INSERT and
-- DELETE, but OMITTED an admin UPDATE policy. The only remaining UPDATE policy is
-- owner-scoped ("Hotels can update own data": id = get_user_hotel_id()), which an
-- ADMIN user does not satisfy. As a result every admin-app client-side UPDATE on
-- hotels (suspend/ban/activate, approve/reject pending, edit hotel info) failed RLS
-- and matched 0 rows -> PostgREST PGRST116 / HTTP 406 ("Cannot coerce the result to
-- a single JSON object"). Repro: admin -> /admin/hotels/:id -> "ระงับการใช้งาน"
-- -> alert "เกิดข้อผิดพลาดในการเปลี่ยนสถานะโรงแรม".
-- Call sites: apps/admin/src/lib/hotelQueries.ts (updateHotelStatus, updateHotel),
-- apps/admin/src/components/HotelForm.tsx (edit existing hotel).
--
-- Fix: add the missing admin UPDATE policy (mirrors the existing "Admins can insert
-- hotels" / "Admins can delete hotels" from the prior migration). Scoped to role
-- ADMIN only, so it does NOT reintroduce the cross-tenant (IDOR) leak that
-- 20260613070000 closed — hotel users remain restricted to their own row.

CREATE POLICY "Admins can update hotels" ON hotels
  FOR UPDATE
  USING      (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));
