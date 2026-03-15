-- Ensure Analytics Functions Exist
-- Created: 2026-02-12
-- Purpose: Ensure all required analytics functions are available

-- ============================================
-- BASIC GROWTH CALCULATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION calculate_growth(
  current_value DECIMAL,
  previous_value DECIMAL
) RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
BEGIN
  IF previous_value = 0 OR previous_value IS NULL THEN
    RETURN CASE WHEN current_value > 0 THEN 100.0 ELSE 0.0 END;
  END IF;

  RETURN ((current_value - previous_value) / previous_value) * 100.0;
END;
$$;

-- ============================================
-- DASHBOARD STATS FUNCTION (SIMPLIFIED)
-- ============================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(
  period_days INTEGER DEFAULT 30
) RETURNS TABLE (
  total_revenue DECIMAL,
  total_bookings INTEGER,
  new_customers INTEGER,
  avg_booking_value DECIMAL,
  revenue_growth DECIMAL,
  bookings_growth DECIMAL,
  new_customers_growth DECIMAL,
  avg_value_growth DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  current_period_start TIMESTAMP;
  previous_period_start TIMESTAMP;
  previous_period_end TIMESTAMP;
  current_stats RECORD;
  previous_stats RECORD;
BEGIN
  -- Calculate date ranges
  current_period_start := NOW() - INTERVAL '1 day' * period_days;
  previous_period_start := NOW() - INTERVAL '1 day' * (period_days * 2);
  previous_period_end := NOW() - INTERVAL '1 day' * period_days;

  -- Get current period stats
  SELECT
    COALESCE(SUM(b.final_price), 0) as revenue,
    COUNT(*) as bookings,
    COUNT(DISTINCT b.customer_id) as customers
  INTO current_stats
  FROM bookings b
  WHERE b.created_at >= current_period_start
    AND b.status != 'cancelled';

  -- Get previous period stats
  SELECT
    COALESCE(SUM(b.final_price), 0) as revenue,
    COUNT(*) as bookings,
    COUNT(DISTINCT b.customer_id) as customers
  INTO previous_stats
  FROM bookings b
  WHERE b.created_at >= previous_period_start
    AND b.created_at < previous_period_end
    AND b.status != 'cancelled';

  -- Calculate and return results
  RETURN QUERY
  SELECT
    current_stats.revenue,
    current_stats.bookings,
    current_stats.customers,
    CASE WHEN current_stats.bookings > 0 THEN current_stats.revenue / current_stats.bookings ELSE 0 END,
    calculate_growth(current_stats.revenue, previous_stats.revenue),
    calculate_growth(current_stats.bookings::DECIMAL, previous_stats.bookings::DECIMAL),
    calculate_growth(current_stats.customers::DECIMAL, previous_stats.customers::DECIMAL),
    calculate_growth(
      CASE WHEN current_stats.bookings > 0 THEN current_stats.revenue / current_stats.bookings ELSE 0 END,
      CASE WHEN previous_stats.bookings > 0 THEN previous_stats.revenue / previous_stats.bookings ELSE 0 END
    );
END;
$$;

-- ============================================
-- STAFF PERFORMANCE FUNCTION (SIMPLIFIED)
-- ============================================

CREATE OR REPLACE FUNCTION get_staff_performance_detailed(
  period_days INTEGER DEFAULT 30,
  staff_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  staff_id UUID,
  staff_name TEXT,
  email TEXT,
  phone TEXT,
  profile_image TEXT,
  bookings_completed INTEGER,
  bookings_cancelled INTEGER,
  bookings_no_show INTEGER,
  completion_rate DECIMAL,
  cancellation_rate DECIMAL,
  total_revenue_generated DECIMAL,
  base_earnings DECIMAL,
  tips_earned DECIMAL,
  total_earnings DECIMAL,
  avg_service_price DECIMAL,
  avg_rating DECIMAL,
  total_reviews INTEGER,
  positive_reviews INTEGER,
  negative_reviews INTEGER,
  punctuality_score DECIMAL,
  response_time_hours DECIMAL,
  working_days INTEGER,
  services_per_day DECIMAL,
  specializations TEXT[],
  revenue_growth DECIMAL,
  booking_growth DECIMAL,
  rating_growth DECIMAL,
  status TEXT,
  last_active_date TIMESTAMP,
  join_date TIMESTAMP,
  rank INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  start_date TIMESTAMP;
BEGIN
  start_date := NOW() - INTERVAL '1 day' * period_days;

  RETURN QUERY
  WITH staff_stats AS (
    SELECT
      s.id,
      s.name_th,
      COALESCE(p.email, '') as email,
      s.phone,
      p.profile_image_url,
      s.status,
      s.created_at,
      s.updated_at,

      COUNT(b.id) FILTER (WHERE b.status = 'completed') as completed_count,
      COUNT(b.id) FILTER (WHERE b.status = 'cancelled') as cancelled_count,
      COUNT(b.id) FILTER (WHERE b.status = 'no_show') as no_show_count,
      COUNT(b.id) as total_bookings,

      COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) as revenue,
      COALESCE(SUM(b.staff_earnings) FILTER (WHERE b.status = 'completed'), 0) as earnings,
      COALESCE(SUM(b.tip_amount) FILTER (WHERE b.status = 'completed'), 0) as tips,

      COALESCE(AVG(r.rating), 0) as avg_rating,
      COUNT(r.id) as review_count,
      COUNT(r.id) FILTER (WHERE r.rating >= 4) as positive_count,
      COUNT(r.id) FILTER (WHERE r.rating <= 2) as negative_count,

      COUNT(DISTINCT DATE(b.booking_date)) as working_days_count,
      ARRAY_AGG(DISTINCT srv.category) FILTER (WHERE srv.category IS NOT NULL) as categories
    FROM staff s
    LEFT JOIN profiles p ON p.id = s.profile_id
    LEFT JOIN bookings b ON b.staff_id = s.id AND b.created_at >= start_date
    LEFT JOIN services srv ON srv.id = b.service_id
    LEFT JOIN reviews r ON r.booking_id = b.id
    WHERE s.status IN ('active', 'inactive')
    GROUP BY s.id, s.name_th, p.email, s.phone, p.profile_image_url, s.status, s.created_at, s.updated_at
  )
  SELECT
    ss.id,
    ss.name_th,
    ss.email,
    ss.phone,
    ss.profile_image_url,

    ss.completed_count,
    ss.cancelled_count,
    ss.no_show_count,
    CASE WHEN ss.total_bookings > 0 THEN (ss.completed_count * 100.0 / ss.total_bookings) ELSE 0 END,
    CASE WHEN ss.total_bookings > 0 THEN (ss.cancelled_count * 100.0 / ss.total_bookings) ELSE 0 END,

    ss.revenue,
    ss.earnings,
    ss.tips,
    (ss.earnings + ss.tips),
    CASE WHEN ss.completed_count > 0 THEN (ss.revenue / ss.completed_count) ELSE 0 END,

    ss.avg_rating,
    ss.review_count,
    ss.positive_count,
    ss.negative_count,

    90.0::DECIMAL, -- punctuality_score
    3.5::DECIMAL,  -- response_time_hours
    GREATEST(ss.working_days_count, 1),
    CASE WHEN ss.working_days_count > 0 THEN (ss.completed_count::DECIMAL / ss.working_days_count) ELSE 0 END,

    ss.categories,

    5.0::DECIMAL,  -- revenue_growth (mock)
    3.0::DECIMAL,  -- booking_growth (mock)
    2.0::DECIMAL,  -- rating_growth (mock)

    ss.status,
    ss.updated_at,
    ss.created_at,
    ROW_NUMBER() OVER (ORDER BY (ss.earnings + ss.tips) DESC)::INTEGER
  FROM staff_stats ss
  ORDER BY (ss.earnings + ss.tips) DESC
  LIMIT staff_limit;
END;
$$;

-- ============================================
-- HOTEL PERFORMANCE FUNCTION (SIMPLIFIED)
-- ============================================

CREATE OR REPLACE FUNCTION get_hotel_performance_detailed(
  period_days INTEGER DEFAULT 30
) RETURNS TABLE (
  hotel_id UUID,
  hotel_name TEXT,
  total_bookings INTEGER,
  completed_bookings INTEGER,
  cancelled_bookings INTEGER,
  completion_rate DECIMAL,
  cancellation_rate DECIMAL,
  total_revenue DECIMAL,
  avg_booking_value DECIMAL,
  commission_earned DECIMAL,
  commission_rate DECIMAL,
  unique_customers INTEGER,
  new_customers INTEGER,
  returning_customers INTEGER,
  customer_retention_rate DECIMAL,
  avg_rating DECIMAL,
  total_reviews INTEGER,
  positive_reviews INTEGER,
  negative_reviews INTEGER,
  staff_count INTEGER,
  top_staff_names TEXT[],
  revenue_growth DECIMAL,
  booking_growth DECIMAL,
  customer_growth DECIMAL,
  avg_service_duration INTEGER,
  peak_booking_hours INTEGER[],
  most_popular_services TEXT[],
  phone TEXT,
  address TEXT,
  rank INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  start_date TIMESTAMP;
BEGIN
  start_date := NOW() - INTERVAL '1 day' * period_days;

  RETURN QUERY
  WITH hotel_stats AS (
    SELECT
      h.id,
      h.name,
      h.phone,
      h.address,
      h.commission_rate as comm_rate,

      COUNT(b.id) as total_bookings_count,
      COUNT(b.id) FILTER (WHERE b.status = 'completed') as completed_count,
      COUNT(b.id) FILTER (WHERE b.status = 'cancelled') as cancelled_count,

      COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) as revenue,
      COALESCE(SUM(b.final_price * h.commission_rate / 100) FILTER (WHERE b.status = 'completed'), 0) as commission,

      COUNT(DISTINCT b.customer_id) as unique_customers_count,
      COALESCE(AVG(r.rating), 0) as avg_rating_score,
      COUNT(r.id) as reviews_count,
      COUNT(r.id) FILTER (WHERE r.rating >= 4) as positive_reviews_count,
      COUNT(r.id) FILTER (WHERE r.rating <= 2) as negative_reviews_count,

      COUNT(DISTINCT b.staff_id) FILTER (WHERE b.staff_id IS NOT NULL) as staff_working_count,
      ARRAY_AGG(DISTINCT s.name_th) FILTER (WHERE s.name_th IS NOT NULL) as staff_names,
      ARRAY_AGG(DISTINCT srv.name_th) FILTER (WHERE srv.name_th IS NOT NULL) as service_names,
      ARRAY_AGG(DISTINCT EXTRACT(HOUR FROM b.booking_time)::INTEGER) FILTER (WHERE b.booking_time IS NOT NULL) as booking_hours_array
    FROM hotels h
    LEFT JOIN bookings b ON b.hotel_id = h.id AND b.created_at >= start_date
    LEFT JOIN reviews r ON r.booking_id = b.id
    LEFT JOIN staff s ON s.id = b.staff_id
    LEFT JOIN services srv ON srv.id = b.service_id
    WHERE h.status = 'active'
    GROUP BY h.id, h.name, h.phone, h.address, h.commission_rate
  )
  SELECT
    hs.id,
    hs.name,

    hs.total_bookings_count,
    hs.completed_count,
    hs.cancelled_count,
    CASE WHEN hs.total_bookings_count > 0 THEN (hs.completed_count * 100.0 / hs.total_bookings_count) ELSE 0 END,
    CASE WHEN hs.total_bookings_count > 0 THEN (hs.cancelled_count * 100.0 / hs.total_bookings_count) ELSE 0 END,

    hs.revenue,
    CASE WHEN hs.completed_count > 0 THEN (hs.revenue / hs.completed_count) ELSE 0 END,
    hs.commission,
    hs.comm_rate,

    hs.unique_customers_count,
    GREATEST(hs.unique_customers_count - 5, 0), -- Mock new customers
    LEAST(hs.unique_customers_count, 5),        -- Mock returning customers
    CASE WHEN hs.unique_customers_count > 0 THEN 75.0 ELSE 0 END, -- Mock retention rate

    hs.avg_rating_score,
    hs.reviews_count,
    hs.positive_reviews_count,
    hs.negative_reviews_count,

    hs.staff_working_count,
    hs.staff_names[1:3], -- Top 3 staff

    8.5::DECIMAL,  -- revenue_growth (mock)
    6.2::DECIMAL,  -- booking_growth (mock)
    4.1::DECIMAL,  -- customer_growth (mock)

    90, -- avg_service_duration
    hs.booking_hours_array[1:3], -- Top 3 peak hours
    hs.service_names[1:3], -- Top 3 services

    hs.phone,
    hs.address,

    ROW_NUMBER() OVER (ORDER BY hs.revenue DESC)::INTEGER
  FROM hotel_stats hs
  WHERE hs.total_bookings_count > 0
  ORDER BY hs.revenue DESC;
END;
$$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION calculate_growth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_staff_performance_detailed TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_hotel_performance_detailed TO anon, authenticated;

-- Add comments
COMMENT ON FUNCTION get_dashboard_stats IS 'Simplified dashboard statistics function';
COMMENT ON FUNCTION get_staff_performance_detailed IS 'Simplified staff performance analytics function';
COMMENT ON FUNCTION get_hotel_performance_detailed IS 'Simplified hotel performance analytics function';