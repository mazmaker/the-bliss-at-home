-- Migration: Create Service Analytics Function
-- Description: Add comprehensive service analytics and statistics
-- Version: 20260212140000

-- ============================================
-- SERVICE ANALYTICS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_service_analytics(
  days_range INTEGER DEFAULT 30,
  service_filter UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name_th TEXT,
  name_en TEXT,
  category service_category,
  total_bookings BIGINT,
  total_revenue NUMERIC,
  average_rating NUMERIC,
  avg_duration INTEGER,
  peak_hour TEXT,
  commission_earned NUMERIC,
  growth_rate NUMERIC,
  last_7_days BIGINT,
  popularity_rank INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH date_range AS (
    SELECT
      CURRENT_DATE - INTERVAL '1 day' * days_range AS start_date,
      CURRENT_DATE AS end_date
  ),
  service_stats AS (
    SELECT
      s.id,
      s.name_th,
      s.name_en,
      s.category,

      -- Total bookings in date range
      COUNT(b.id) FILTER (
        WHERE b.created_at >= dr.start_date
        AND b.created_at <= dr.end_date
        AND b.status IN ('confirmed', 'in_progress', 'completed')
      ) as total_bookings,

      -- Total revenue in date range
      COALESCE(SUM(b.final_price) FILTER (
        WHERE b.created_at >= dr.start_date
        AND b.created_at <= dr.end_date
        AND b.status = 'completed'
      ), 0) as total_revenue,

      -- Average rating from reviews
      COALESCE(AVG(r.rating) FILTER (
        WHERE r.created_at >= dr.start_date
        AND r.created_at <= dr.end_date
      ), 0) as average_rating,

      -- Average duration used
      COALESCE(AVG(b.duration) FILTER (
        WHERE b.created_at >= dr.start_date
        AND b.created_at <= dr.end_date
        AND b.status IN ('confirmed', 'in_progress', 'completed')
      ), s.duration) as avg_duration,

      -- Most common booking hour
      MODE() WITHIN GROUP (ORDER BY EXTRACT(hour FROM b.scheduled_date)) FILTER (
        WHERE b.created_at >= dr.start_date
        AND b.created_at <= dr.end_date
        AND b.status IN ('confirmed', 'in_progress', 'completed')
      ) as peak_hour_num,

      -- Commission earned by staff for this service
      COALESCE(SUM(b.staff_earnings) FILTER (
        WHERE b.created_at >= dr.start_date
        AND b.created_at <= dr.end_date
        AND b.status = 'completed'
      ), 0) as commission_earned,

      -- Last 7 days bookings for trend
      COUNT(b.id) FILTER (
        WHERE b.created_at >= CURRENT_DATE - INTERVAL '7 days'
        AND b.status IN ('confirmed', 'in_progress', 'completed')
      ) as last_7_days,

      -- Previous period for growth calculation
      COUNT(b.id) FILTER (
        WHERE b.created_at >= dr.start_date - INTERVAL '1 day' * days_range
        AND b.created_at < dr.start_date
        AND b.status IN ('confirmed', 'in_progress', 'completed')
      ) as previous_period_bookings

    FROM services s
    CROSS JOIN date_range dr
    LEFT JOIN bookings b ON s.id = b.service_id
    LEFT JOIN reviews r ON s.id = r.service_id
    WHERE (service_filter IS NULL OR s.id = service_filter)
      AND s.is_active = true
    GROUP BY s.id, s.name_th, s.name_en, s.category, s.duration, dr.start_date, dr.end_date
  ),
  ranked_services AS (
    SELECT
      *,
      -- Calculate growth rate
      CASE
        WHEN previous_period_bookings > 0
        THEN ((total_bookings::NUMERIC - previous_period_bookings::NUMERIC) / previous_period_bookings::NUMERIC) * 100
        ELSE 0
      END as growth_rate,

      -- Format peak hour
      CASE
        WHEN peak_hour_num IS NOT NULL
        THEN LPAD(peak_hour_num::TEXT, 2, '0') || ':00'
        ELSE 'N/A'
      END as peak_hour,

      -- Rank by total bookings
      RANK() OVER (ORDER BY total_bookings DESC, total_revenue DESC) as popularity_rank

    FROM service_stats
  )
  SELECT
    rs.id,
    rs.name_th,
    rs.name_en,
    rs.category,
    rs.total_bookings,
    rs.total_revenue,
    ROUND(rs.average_rating, 2) as average_rating,
    rs.avg_duration::INTEGER,
    rs.peak_hour,
    rs.commission_earned,
    ROUND(rs.growth_rate, 1) as growth_rate,
    rs.last_7_days,
    rs.popularity_rank::INTEGER
  FROM ranked_services rs
  ORDER BY rs.total_bookings DESC, rs.total_revenue DESC;
END;
$$;

-- ============================================
-- SERVICE PERFORMANCE VIEW
-- ============================================

-- Create a materialized view for better performance on large datasets
CREATE MATERIALIZED VIEW service_performance_summary AS
SELECT
  s.id,
  s.name_th,
  s.name_en,
  s.category,
  s.base_price,
  s.hotel_price,
  s.staff_commission_rate,

  -- Booking statistics (all time)
  COUNT(b.id) as total_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'completed') as completed_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'cancelled') as cancelled_bookings,

  -- Revenue statistics
  COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) as total_revenue,
  COALESCE(AVG(b.final_price) FILTER (WHERE b.status = 'completed'), 0) as avg_booking_value,

  -- Rating statistics
  COUNT(r.id) as total_reviews,
  COALESCE(AVG(r.rating), 0) as average_rating,
  COUNT(r.id) FILTER (WHERE r.rating >= 4) as positive_reviews,

  -- Commission statistics
  COALESCE(SUM(b.staff_earnings) FILTER (WHERE b.status = 'completed'), 0) as total_commission,

  -- Time statistics
  COALESCE(AVG(b.duration), s.duration) as avg_duration_used,

  -- Recent activity (last 30 days)
  COUNT(b.id) FILTER (
    WHERE b.created_at >= CURRENT_DATE - INTERVAL '30 days'
  ) as bookings_last_30_days,

  -- Last updated
  GREATEST(s.updated_at, MAX(b.updated_at), MAX(r.updated_at)) as last_activity

FROM services s
LEFT JOIN bookings b ON s.id = b.service_id
LEFT JOIN reviews r ON s.id = r.service_id
WHERE s.is_active = true
GROUP BY s.id, s.name_th, s.name_en, s.category, s.base_price, s.hotel_price, s.staff_commission_rate, s.duration, s.updated_at;

-- Create index for better performance
CREATE INDEX idx_service_performance_summary_bookings ON service_performance_summary(total_bookings DESC);
CREATE INDEX idx_service_performance_summary_revenue ON service_performance_summary(total_revenue DESC);
CREATE INDEX idx_service_performance_summary_rating ON service_performance_summary(average_rating DESC);

-- ============================================
-- REFRESH FUNCTION FOR MATERIALIZED VIEW
-- ============================================

CREATE OR REPLACE FUNCTION refresh_service_performance()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW service_performance_summary;

  -- Log the refresh
  INSERT INTO system_logs (action, details, created_at)
  VALUES (
    'refresh_materialized_view',
    '{"view": "service_performance_summary", "status": "completed"}',
    NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error if refresh fails
    INSERT INTO system_logs (action, details, created_at)
    VALUES (
      'refresh_materialized_view',
      json_build_object(
        'view', 'service_performance_summary',
        'status', 'failed',
        'error', SQLERRM
      ),
      NOW()
    );
    RAISE;
END;
$$;

-- ============================================
-- PERMISSIONS
-- ============================================

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_service_analytics(INTEGER, UUID) TO authenticated;
GRANT SELECT ON service_performance_summary TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_service_performance() TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION get_service_analytics(INTEGER, UUID) IS 'Get comprehensive analytics for services within specified date range';
COMMENT ON MATERIALIZED VIEW service_performance_summary IS 'Cached service performance metrics for dashboard display';
COMMENT ON FUNCTION refresh_service_performance() IS 'Refresh service performance materialized view';

-- ============================================
-- INITIAL DATA REFRESH
-- ============================================

-- Refresh the materialized view on deployment
SELECT refresh_service_performance();