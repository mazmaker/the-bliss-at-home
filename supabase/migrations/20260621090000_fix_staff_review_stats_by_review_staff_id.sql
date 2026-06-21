-- B4: staff rating/review showed ★0.0 / "0 รีวิว" for staff who DO have reviews.
-- Root cause: update_staff_review_stats() derived staff via bookings.staff_id (NULL) and
-- never backfilled, so staff.rating/total_reviews stayed 0. Rewrite to aggregate by
-- reviews.staff_id (-> staff.id) on INSERT/UPDATE/DELETE + one-time backfill.
-- NOTE: applied to the remote DB 2026-06-21 via MCP apply_migration; this file is added
-- for version control / reproducibility. Idempotent (CREATE OR REPLACE + DROP IF EXISTS).

CREATE OR REPLACE FUNCTION public.update_staff_review_stats()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_avg NUMERIC;
  v_cnt INTEGER;
  v_new UUID;
  v_old UUID;
BEGIN
  v_new := CASE WHEN TG_OP <> 'DELETE' THEN NEW.staff_id ELSE NULL END;
  v_old := CASE WHEN TG_OP <> 'INSERT' THEN OLD.staff_id ELSE NULL END;

  IF v_new IS NOT NULL THEN
    SELECT ROUND(AVG(rating)::numeric, 2), COUNT(id)
      INTO v_avg, v_cnt FROM reviews WHERE staff_id = v_new;
    UPDATE staff SET rating = COALESCE(v_avg, 0), total_reviews = COALESCE(v_cnt, 0), updated_at = NOW()
      WHERE id = v_new;
  END IF;

  IF v_old IS NOT NULL AND v_old IS DISTINCT FROM v_new THEN
    SELECT ROUND(AVG(rating)::numeric, 2), COUNT(id)
      INTO v_avg, v_cnt FROM reviews WHERE staff_id = v_old;
    UPDATE staff SET rating = COALESCE(v_avg, 0), total_reviews = COALESCE(v_cnt, 0), updated_at = NOW()
      WHERE id = v_old;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trigger_update_staff_review_stats ON public.reviews;
CREATE TRIGGER trigger_update_staff_review_stats
  AFTER INSERT OR DELETE OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION update_staff_review_stats();

-- One-time backfill of all staff from existing reviews
UPDATE staff s SET
  rating        = COALESCE((SELECT ROUND(AVG(r.rating)::numeric, 2) FROM reviews r WHERE r.staff_id = s.id), 0),
  total_reviews = COALESCE((SELECT COUNT(r.id) FROM reviews r WHERE r.staff_id = s.id), 0);
