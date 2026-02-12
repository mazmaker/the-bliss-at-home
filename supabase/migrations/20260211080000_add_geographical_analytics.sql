-- Geographical Analytics Functions for Reports
-- Created: 2026-02-11
-- Purpose: Add geographical breakdown for bookings and services

-- ============================================
-- GEOGRAPHICAL BREAKDOWN FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_bookings_by_area(
  period_days INTEGER DEFAULT 30,
  area_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  area_name TEXT,
  area_type TEXT, -- 'hotel', 'district', 'province'
  total_bookings INTEGER,
  completed_bookings INTEGER,
  total_revenue DECIMAL,
  avg_booking_value DECIMAL,
  unique_customers INTEGER,
  completion_rate DECIMAL,
  top_services TEXT[],
  growth_rate DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  start_date TIMESTAMP;
  previous_start_date TIMESTAMP;
  previous_end_date TIMESTAMP;
BEGIN
  start_date := NOW() - INTERVAL '1 day' * period_days;
  previous_start_date := NOW() - INTERVAL '1 day' * (period_days * 2);
  previous_end_date := NOW() - INTERVAL '1 day' * period_days;

  RETURN QUERY
  WITH booking_areas AS (
    SELECT
      CASE
        WHEN b.is_hotel_booking AND h.name_th IS NOT NULL THEN h.name_th
        WHEN b.address IS NOT NULL THEN
          CASE
            WHEN b.address ILIKE '%กรุงเทพ%' OR b.address ILIKE '%Bangkok%' THEN 'กรุงเทพมหานคร'
            WHEN b.address ILIKE '%เชียงใหม่%' OR b.address ILIKE '%Chiang Mai%' THEN 'เชียงใหม่'
            WHEN b.address ILIKE '%ภูเก็ต%' OR b.address ILIKE '%Phuket%' THEN 'ภูเก็ต'
            WHEN b.address ILIKE '%พัทยา%' OR b.address ILIKE '%Pattaya%' THEN 'พัทยา'
            WHEN b.address ILIKE '%หัวหิน%' OR b.address ILIKE '%Hua Hin%' THEN 'หัวหิน'
            WHEN b.address ILIKE '%สมุย%' OR b.address ILIKE '%Samui%' THEN 'เกาะสมุย'
            ELSE 'พื้นที่อื่นๆ'
          END
        ELSE 'ไม่ระบุพื้นที่'
      END as area,

      CASE
        WHEN b.is_hotel_booking THEN 'hotel'
        ELSE 'district'
      END as type,

      b.id,
      b.status,
      b.final_price,
      b.customer_id,
      b.service_id,
      s.name_th as service_name,
      b.created_at

    FROM bookings b
    LEFT JOIN hotels h ON h.id = b.hotel_id AND b.is_hotel_booking = true
    LEFT JOIN services s ON s.id = b.service_id
    WHERE b.created_at >= start_date
  ),

  current_period AS (
    SELECT
      ba.area,
      ba.type,
      COUNT(*) as total_bookings,
      COUNT(*) FILTER (WHERE ba.status = 'completed') as completed_bookings,
      COALESCE(SUM(ba.final_price) FILTER (WHERE ba.status = 'completed'), 0) as revenue,
      COUNT(DISTINCT ba.customer_id) as customers,
      ARRAY_AGG(DISTINCT ba.service_name ORDER BY ba.service_name) FILTER (WHERE ba.service_name IS NOT NULL AND ba.status = 'completed') as services
    FROM booking_areas ba
    GROUP BY ba.area, ba.type
  ),

  previous_period AS (
    SELECT
      CASE
        WHEN b.is_hotel_booking AND h.name_th IS NOT NULL THEN h.name_th
        WHEN b.address IS NOT NULL THEN
          CASE
            WHEN b.address ILIKE '%กรุงเทพ%' OR b.address ILIKE '%Bangkok%' THEN 'กรุงเทพมหานคร'
            WHEN b.address ILIKE '%เชียงใหม่%' OR b.address ILIKE '%Chiang Mai%' THEN 'เชียงใหม่'
            WHEN b.address ILIKE '%ภูเก็ต%' OR b.address ILIKE '%Phuket%' THEN 'ภูเก็ต'
            WHEN b.address ILIKE '%พัทยา%' OR b.address ILIKE '%Pattaya%' THEN 'พัทยา'
            WHEN b.address ILIKE '%หัวหิน%' OR b.address ILIKE '%Hua Hin%' THEN 'หัวหิน'
            WHEN b.address ILIKE '%สมุย%' OR b.address ILIKE '%Samui%' THEN 'เกาะสมุย'
            ELSE 'พื้นที่อื่นๆ'
          END
        ELSE 'ไม่ระบุพื้นที่'
      END as area,
      COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) as prev_revenue
    FROM bookings b
    LEFT JOIN hotels h ON h.id = b.hotel_id AND b.is_hotel_booking = true
    WHERE b.created_at >= previous_start_date
      AND b.created_at < previous_end_date
    GROUP BY area
  ),

  area_stats AS (
    SELECT
      cp.area,
      cp.type,
      cp.total_bookings,
      cp.completed_bookings,
      cp.revenue,
      cp.customers,
      cp.services,
      CASE WHEN cp.completed_bookings > 0 THEN
        (cp.revenue / cp.completed_bookings)
      ELSE 0 END as avg_value,
      CASE WHEN cp.total_bookings > 0 THEN
        (cp.completed_bookings * 100.0 / cp.total_bookings)
      ELSE 0 END as completion_pct,
      calculate_growth(cp.revenue, pp.prev_revenue) as growth
    FROM current_period cp
    LEFT JOIN previous_period pp ON pp.area = cp.area
    WHERE cp.total_bookings > 0
  )

  SELECT
    as_table.area,
    as_table.type,
    as_table.total_bookings,
    as_table.completed_bookings,
    as_table.revenue,
    ROUND(as_table.avg_value, 2),
    as_table.customers,
    ROUND(as_table.completion_pct, 1),
    as_table.services[1:5], -- Top 5 services
    ROUND(as_table.growth, 1)
  FROM area_stats as_table
  ORDER BY as_table.revenue DESC
  LIMIT area_limit;
END;
$$;

-- ============================================
-- SERVICE REVENUE BY CATEGORY FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_service_revenue_by_category(
  period_days INTEGER DEFAULT 30
) RETURNS TABLE (
  category TEXT,
  category_th TEXT,
  total_bookings INTEGER,
  total_revenue DECIMAL,
  avg_price DECIMAL,
  completion_rate DECIMAL,
  top_service_name TEXT,
  growth_rate DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  start_date TIMESTAMP;
  previous_start_date TIMESTAMP;
  previous_end_date TIMESTAMP;
BEGIN
  start_date := NOW() - INTERVAL '1 day' * period_days;
  previous_start_date := NOW() - INTERVAL '1 day' * (period_days * 2);
  previous_end_date := NOW() - INTERVAL '1 day' * period_days;

  RETURN QUERY
  WITH current_stats AS (
    SELECT
      s.category,
      CASE s.category
        WHEN 'massage' THEN 'นวดและทำสปา'
        WHEN 'spa' THEN 'บำบัดสปา'
        WHEN 'nail' THEN 'ทำเล็บ'
        WHEN 'facial' THEN 'ดูแลผิวหน้า'
        WHEN 'body_treatment' THEN 'ดูแลร่างกาย'
        ELSE 'บริการอื่นๆ'
      END as category_thai,
      COUNT(*) as bookings,
      COUNT(*) FILTER (WHERE b.status = 'completed') as completed,
      COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) as revenue,
      (SELECT s2.name_th FROM services s2
       LEFT JOIN bookings b2 ON b2.service_id = s2.id AND b2.created_at >= start_date AND b2.status = 'completed'
       WHERE s2.category = s.category
       GROUP BY s2.id, s2.name_th
       ORDER BY COUNT(b2.id) DESC
       LIMIT 1) as top_service
    FROM services s
    LEFT JOIN bookings b ON b.service_id = s.id AND b.created_at >= start_date
    GROUP BY s.category
    HAVING COUNT(*) > 0
  ),

  previous_stats AS (
    SELECT
      s.category,
      COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) as prev_revenue
    FROM services s
    LEFT JOIN bookings b ON b.service_id = s.id
      AND b.created_at >= previous_start_date
      AND b.created_at < previous_end_date
    GROUP BY s.category
  )

  SELECT
    cs.category,
    cs.category_thai,
    cs.bookings,
    cs.revenue,
    CASE WHEN cs.completed > 0 THEN ROUND(cs.revenue / cs.completed, 2) ELSE 0 END,
    CASE WHEN cs.bookings > 0 THEN ROUND(cs.completed * 100.0 / cs.bookings, 1) ELSE 0 END,
    COALESCE(cs.top_service, 'N/A'),
    ROUND(calculate_growth(cs.revenue, ps.prev_revenue), 1)
  FROM current_stats cs
  LEFT JOIN previous_stats ps ON ps.category = cs.category
  ORDER BY cs.revenue DESC;
END;
$$;

-- ============================================
-- MONTHLY SERVICE TRENDS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_monthly_service_trends(
  months_back INTEGER DEFAULT 6
) RETURNS TABLE (
  service_name TEXT,
  service_category TEXT,
  month_year TEXT,
  bookings INTEGER,
  revenue DECIMAL,
  rank_position INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH monthly_data AS (
    SELECT
      s.name_th,
      s.category,
      TO_CHAR(b.created_at, 'YYYY-MM') as month_yr,
      COUNT(*) FILTER (WHERE b.status = 'completed') as booking_count,
      COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) as month_revenue
    FROM services s
    LEFT JOIN bookings b ON b.service_id = s.id
    WHERE b.created_at >= NOW() - INTERVAL '1 month' * months_back
    GROUP BY s.id, s.name_th, s.category, month_yr
    HAVING COUNT(*) FILTER (WHERE b.status = 'completed') > 0
  ),

  ranked_monthly AS (
    SELECT
      md.*,
      ROW_NUMBER() OVER (PARTITION BY md.month_yr ORDER BY md.month_revenue DESC) as rank
    FROM monthly_data md
  )

  SELECT
    rm.name_th,
    rm.category,
    rm.month_yr,
    rm.booking_count,
    rm.month_revenue,
    rm.rank::INTEGER
  FROM ranked_monthly rm
  WHERE rm.rank <= 5 -- Top 5 per month
  ORDER BY rm.month_yr DESC, rm.rank;
END;
$$;

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index for geographical queries
CREATE INDEX IF NOT EXISTS idx_bookings_location_analysis
ON bookings(is_hotel_booking, hotel_id, created_at DESC)
WHERE created_at IS NOT NULL;

-- Index for address-based location searches
CREATE INDEX IF NOT EXISTS idx_bookings_address_search
ON bookings USING gin(address gin_trgm_ops)
WHERE address IS NOT NULL;

-- Install pg_trgm extension if not exists (for address search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_bookings_by_area TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_service_revenue_by_category TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_service_trends TO anon, authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_bookings_by_area IS 'Get booking statistics grouped by geographical areas (hotels, districts, provinces)';
COMMENT ON FUNCTION get_service_revenue_by_category IS 'Get detailed revenue breakdown by service categories with growth metrics';
COMMENT ON FUNCTION get_monthly_service_trends IS 'Get monthly trending analysis of most popular services over time';