-- RPC functions for public review display (SECURITY DEFINER to bypass customer RLS)

-- Function 1: Get aggregated review stats per service
CREATE OR REPLACE FUNCTION get_service_review_stats(p_service_id uuid DEFAULT NULL)
RETURNS TABLE(
  service_id uuid,
  avg_rating numeric,
  review_count bigint,
  avg_cleanliness numeric,
  avg_professionalism numeric,
  avg_skill numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  RETURN QUERY
  SELECT
    r.service_id,
    ROUND(AVG(r.rating)::numeric, 1) AS avg_rating,
    COUNT(*)::bigint AS review_count,
    ROUND(AVG(r.cleanliness_rating)::numeric, 1) AS avg_cleanliness,
    ROUND(AVG(r.professionalism_rating)::numeric, 1) AS avg_professionalism,
    ROUND(AVG(r.skill_rating)::numeric, 1) AS avg_skill
  FROM reviews r
  WHERE r.is_visible = true
    AND (p_service_id IS NULL OR r.service_id = p_service_id)
  GROUP BY r.service_id;
END;
$fn$;

-- Function 2: Get individual visible reviews with privacy-safe customer names
CREATE OR REPLACE FUNCTION get_visible_reviews(
  p_service_id uuid DEFAULT NULL,
  p_limit int DEFAULT 5,
  p_min_rating int DEFAULT 1
)
RETURNS TABLE(
  id uuid,
  rating smallint,
  review text,
  cleanliness_rating smallint,
  professionalism_rating smallint,
  skill_rating smallint,
  created_at timestamptz,
  customer_display_name text,
  service_id uuid,
  service_name_th text,
  service_name_en text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.rating,
    r.review,
    r.cleanliness_rating,
    r.professionalism_rating,
    r.skill_rating,
    r.created_at,
    CASE
      WHEN c.full_name IS NOT NULL AND LENGTH(TRIM(c.full_name)) > 0 THEN
        SPLIT_PART(TRIM(c.full_name), ' ', 1) ||
        CASE
          WHEN SPLIT_PART(TRIM(c.full_name), ' ', 2) <> '' THEN ' ' || LEFT(SPLIT_PART(TRIM(c.full_name), ' ', 2), 1) || '.'
          ELSE ''
        END
      ELSE 'Anonymous'
    END AS customer_display_name,
    r.service_id,
    s.name_th AS service_name_th,
    s.name_en AS service_name_en
  FROM reviews r
  LEFT JOIN customers c ON c.id = r.customer_id
  LEFT JOIN services s ON s.id = r.service_id
  WHERE r.is_visible = true
    AND r.rating >= p_min_rating
    AND (p_service_id IS NULL OR r.service_id = p_service_id)
  ORDER BY r.created_at DESC
  LIMIT p_limit;
END;
$fn$;

-- Grant access to both roles
GRANT EXECUTE ON FUNCTION get_service_review_stats(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_visible_reviews(uuid, int, int) TO anon, authenticated;
