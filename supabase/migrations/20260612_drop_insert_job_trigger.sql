-- Migration: Drop legacy INSERT trigger that created jobs before payment
-- Date: 2026-06-12
-- Applied to production: 2026-06-12 via Management API
--
-- Background:
-- The business rule is "no payment = no job". A previous fix (June 8) replaced
-- the trigger `create_job_from_booking` with the payment-gated
-- `create_job_from_confirmed_booking` (AFTER UPDATE, fires only when
-- payment_status transitions to 'paid'). However, the live database contained
-- a SECOND insert trigger under a different name — `trigger_sync_booking_to_job`
-- (AFTER INSERT, no conditions) — which kept creating jobs the moment a booking
-- was created, before any payment.
--
-- Job creation paths after this migration:
-- 1. DB trigger `create_job_from_confirmed_booking` — when payment_status → 'paid'
-- 2. Server `processBookingConfirmed()` → `createJobsFromBooking()` (idempotent)
--    called from the payment webhook / admin dispatch
-- 3. Hotel bookings — handled by hotel routes; sync_booking_to_job() skips them

DROP TRIGGER IF EXISTS trigger_sync_booking_to_job ON public.bookings;

-- Cleanup performed alongside this migration (19 rows at time of apply):
-- DELETE FROM jobs
-- WHERE staff_id IS NULL
--   AND status = 'pending'
--   AND booking_id IN (SELECT id FROM bookings WHERE payment_status = 'pending');
