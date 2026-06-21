-- B6: admin customer stats (customers.total_bookings / total_spent) were summing ALL
-- bookings incl. cancelled+refunded -> over-count. Canonical definition of a valid
-- customer booking = booking_status <> 'cancelled' AND payment_status = 'paid'.
-- last_booking_date kept unfiltered (last interaction of any status), as before.
-- NOTE: applied to the remote DB 2026-06-21 via MCP apply_migration; this file is added
-- for version control / reproducibility. Idempotent (CREATE OR REPLACE + backfill).

CREATE OR REPLACE FUNCTION public.sync_customer_booking_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  target_customer_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_customer_id := OLD.customer_id;
  ELSE
    target_customer_id := NEW.customer_id;
  END IF;

  IF target_customer_id IS NOT NULL THEN
    UPDATE customers SET
      total_bookings = (SELECT count(*) FROM bookings
        WHERE customer_id = target_customer_id AND status <> 'cancelled' AND payment_status = 'paid'),
      total_spent = (SELECT COALESCE(sum(final_price), 0) FROM bookings
        WHERE customer_id = target_customer_id AND status <> 'cancelled' AND payment_status = 'paid'),
      last_booking_date = (SELECT max(created_at) FROM bookings WHERE customer_id = target_customer_id)
    WHERE id = target_customer_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.customer_id IS DISTINCT FROM NEW.customer_id AND OLD.customer_id IS NOT NULL THEN
    UPDATE customers SET
      total_bookings = (SELECT count(*) FROM bookings
        WHERE customer_id = OLD.customer_id AND status <> 'cancelled' AND payment_status = 'paid'),
      total_spent = (SELECT COALESCE(sum(final_price), 0) FROM bookings
        WHERE customer_id = OLD.customer_id AND status <> 'cancelled' AND payment_status = 'paid'),
      last_booking_date = (SELECT max(created_at) FROM bookings WHERE customer_id = OLD.customer_id)
    WHERE id = OLD.customer_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- One-time backfill of all existing customers to the canonical definition
UPDATE customers c SET
  total_bookings = COALESCE((SELECT count(*) FROM bookings b
    WHERE b.customer_id = c.id AND b.status <> 'cancelled' AND b.payment_status = 'paid'), 0),
  total_spent = COALESCE((SELECT sum(final_price) FROM bookings b
    WHERE b.customer_id = c.id AND b.status <> 'cancelled' AND b.payment_status = 'paid'), 0);
