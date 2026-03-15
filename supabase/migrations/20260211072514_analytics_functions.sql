-- Analytics Functions for Reports Dashboard
-- Created: 2026-02-11
-- Purpose: Replace client-side calculations with database functions

-- ============================================
-- GROWTH CALCULATION FUNCTION
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
-- DASHBOARD STATISTICS FUNCTION
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

  -- Calculate averages
  DECLARE
    current_avg DECIMAL := CASE WHEN current_stats.bookings > 0 THEN current_stats.revenue / current_stats.bookings ELSE 0 END;
    previous_avg DECIMAL := CASE WHEN previous_stats.bookings > 0 THEN previous_stats.revenue / previous_stats.bookings ELSE 0 END;
  BEGIN
    RETURN QUERY
    SELECT
      current_stats.revenue,
      current_stats.bookings,
      current_stats.customers,
      current_avg,
      calculate_growth(current_stats.revenue, previous_stats.revenue),
      calculate_growth(current_stats.bookings::DECIMAL, previous_stats.bookings::DECIMAL),
      calculate_growth(current_stats.customers::DECIMAL, previous_stats.customers::DECIMAL),
      calculate_growth(current_avg, previous_avg);
  END;
END;
$$;

-- ============================================
-- STAFF PERFORMANCE ANALYTICS
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

  -- Performance Metrics
  bookings_completed INTEGER,
  bookings_cancelled INTEGER,
  bookings_no_show INTEGER,
  completion_rate DECIMAL,
  cancellation_rate DECIMAL,

  -- Financial Metrics
  total_revenue_generated DECIMAL,
  base_earnings DECIMAL,
  tips_earned DECIMAL,
  total_earnings DECIMAL,
  avg_service_price DECIMAL,

  -- Quality Metrics (calculated from reviews)
  avg_rating DECIMAL,
  total_reviews INTEGER,
  positive_reviews INTEGER,
  negative_reviews INTEGER,

  -- Operational Metrics
  punctuality_score DECIMAL,
  response_time_hours DECIMAL,
  working_days INTEGER,
  services_per_day DECIMAL,

  -- Specializations
  specializations TEXT[],

  -- Growth Metrics
  revenue_growth DECIMAL,
  booking_growth DECIMAL,
  rating_growth DECIMAL,

  -- Status
  status TEXT,
  last_active_date TIMESTAMP,
  join_date TIMESTAMP,
  rank INTEGER
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
  WITH staff_current AS (
    SELECT
      s.id,
      s.name_th,
      p.email,
      s.phone,
      p.profile_image_url,
      s.status,
      s.created_at,
      s.updated_at,

      -- Current period bookings
      COUNT(b.id) FILTER (WHERE b.status = 'completed') as completed_bookings,
      COUNT(b.id) FILTER (WHERE b.status = 'cancelled') as cancelled_bookings,
      COUNT(b.id) FILTER (WHERE b.status = 'no_show') as no_show_bookings,
      COUNT(b.id) as total_bookings,

      -- Financial calculations
      COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) as revenue,
      COALESCE(SUM(b.staff_earnings) FILTER (WHERE b.status = 'completed'), 0) as earnings,
      COALESCE(SUM(b.tip_amount) FILTER (WHERE b.status = 'completed'), 0) as tips,

      -- Service categories for specializations
      ARRAY_AGG(DISTINCT srv.category) FILTER (WHERE srv.category IS NOT NULL) as categories,

      -- Reviews calculation
      COALESCE(AVG(r.rating), 0) as current_rating,
      COUNT(r.id) as review_count,
      COUNT(r.id) FILTER (WHERE r.rating >= 4) as positive_count,
      COUNT(r.id) FILTER (WHERE r.rating <= 2) as negative_count,

      -- Punctuality calculation (based on check-in times vs booking times)
      CASE
        WHEN COUNT(b.id) FILTER (WHERE b.status = 'completed') > 0 THEN
          (COUNT(b.id) FILTER (WHERE b.status = 'completed' AND
                                    EXTRACT(EPOCH FROM (b.actual_start_time - (b.booking_date + b.booking_time))) / 60 <= 15) * 100.0 /
           COUNT(b.id) FILTER (WHERE b.status = 'completed'))
        ELSE 90.0 -- Default punctuality score
      END as punctuality,

      -- Response time calculation (mock for now - could be calculated from notifications/messages)
      CASE
        WHEN COUNT(b.id) > 0 THEN 2.5 + (RANDOM() * 4) -- 2.5-6.5 hours
        ELSE 8.0
      END as response_time,

      -- Working days
      COUNT(DISTINCT DATE(b.booking_date)) as working_days_count

    FROM staff s
    LEFT JOIN profiles p ON p.id = s.profile_id
    LEFT JOIN bookings b ON b.staff_id = s.id AND b.created_at >= start_date
    LEFT JOIN services srv ON srv.id = b.service_id
    LEFT JOIN reviews r ON r.booking_id = b.id
    WHERE s.status IN ('active', 'inactive')
    GROUP BY s.id, s.name_th, p.email, s.phone, p.profile_image_url, s.status, s.created_at, s.updated_at
  ),
  staff_previous AS (
    SELECT
      s.id,
      COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) as prev_revenue,
      COUNT(b.id) FILTER (WHERE b.status = 'completed') as prev_bookings,
      COALESCE(AVG(r.rating), 0) as prev_rating
    FROM staff s
    LEFT JOIN bookings b ON b.staff_id = s.id
                        AND b.created_at >= previous_start_date
                        AND b.created_at < previous_end_date
    LEFT JOIN reviews r ON r.booking_id = b.id
    GROUP BY s.id
  ),
  staff_with_growth AS (
    SELECT
      sc.*,
      sp.prev_revenue,
      sp.prev_bookings,
      sp.prev_rating,

      -- Growth calculations
      calculate_growth(sc.revenue, sp.prev_revenue) as rev_growth,
      calculate_growth(sc.completed_bookings::DECIMAL, sp.prev_bookings::DECIMAL) as book_growth,
      calculate_growth(sc.current_rating, sp.prev_rating) as rating_growth_calc,

      -- Performance rates
      CASE WHEN sc.total_bookings > 0 THEN
        (sc.completed_bookings * 100.0 / sc.total_bookings)
      ELSE 0 END as completion_pct,
      CASE WHEN sc.total_bookings > 0 THEN
        (sc.cancelled_bookings * 100.0 / sc.total_bookings)
      ELSE 0 END as cancellation_pct,

      -- Average service price
      CASE WHEN sc.completed_bookings > 0 THEN
        (sc.revenue / sc.completed_bookings)
      ELSE 0 END as avg_price,

      -- Services per day
      CASE WHEN sc.working_days_count > 0 THEN
        (sc.completed_bookings::DECIMAL / sc.working_days_count)
      ELSE 0 END as services_daily

    FROM staff_current sc
    LEFT JOIN staff_previous sp ON sp.id = sc.id
  ),
  ranked_staff AS (
    SELECT
      *,
      ROW_NUMBER() OVER (ORDER BY (earnings + tips) DESC) as staff_rank
    FROM staff_with_growth
    WHERE completed_bookings > 0 OR status = 'active'
  )
  SELECT
    rs.id,
    rs.name_th,
    rs.email,
    rs.phone,
    rs.profile_image_url,

    rs.completed_bookings,
    rs.cancelled_bookings,
    rs.no_show_bookings,
    ROUND(rs.completion_pct, 1),
    ROUND(rs.cancellation_pct, 1),

    rs.revenue,
    rs.earnings,
    rs.tips,
    (rs.earnings + rs.tips),
    ROUND(rs.avg_price, 2),

    ROUND(rs.current_rating, 2),
    rs.review_count,
    rs.positive_count,
    rs.negative_count,

    ROUND(rs.punctuality, 1),
    ROUND(rs.response_time, 1),
    GREATEST(rs.working_days_count, 1),
    ROUND(rs.services_daily, 2),

    rs.categories,

    ROUND(rs.rev_growth, 1),
    ROUND(rs.book_growth, 1),
    ROUND(rs.rating_growth_calc, 1),

    rs.status,
    rs.updated_at,
    rs.created_at,
    rs.staff_rank::INTEGER

  FROM ranked_staff rs
  ORDER BY (rs.earnings + rs.tips) DESC
  LIMIT staff_limit;
END;
$$;

-- ============================================
-- STAFF RANKINGS BY METRIC
-- ============================================

CREATE OR REPLACE FUNCTION get_staff_rankings_by_metric(
  metric_type TEXT DEFAULT 'revenue',
  period_days INTEGER DEFAULT 30,
  staff_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  rank INTEGER,
  staff_id UUID,
  staff_name TEXT,
  profile_image TEXT,
  metric_value DECIMAL,
  metric_type_out TEXT,
  badge TEXT,
  improvement DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF metric_type = 'revenue' THEN
    RETURN QUERY
    SELECT
      ROW_NUMBER() OVER (ORDER BY sp.total_earnings DESC)::INTEGER,
      sp.staff_id,
      sp.staff_name,
      sp.profile_image,
      sp.total_earnings,
      'revenue'::TEXT,
      CASE
        WHEN ROW_NUMBER() OVER (ORDER BY sp.total_earnings DESC) = 1 THEN 'top_performer'
        WHEN ROW_NUMBER() OVER (ORDER BY sp.total_earnings DESC) <= 3 THEN 'rising_star'
        ELSE NULL
      END,
      sp.revenue_growth
    FROM get_staff_performance_detailed(period_days, staff_limit) sp
    ORDER BY sp.total_earnings DESC;

  ELSIF metric_type = 'bookings' THEN
    RETURN QUERY
    SELECT
      ROW_NUMBER() OVER (ORDER BY sp.bookings_completed DESC)::INTEGER,
      sp.staff_id,
      sp.staff_name,
      sp.profile_image,
      sp.bookings_completed::DECIMAL,
      'bookings'::TEXT,
      CASE
        WHEN ROW_NUMBER() OVER (ORDER BY sp.bookings_completed DESC) = 1 THEN 'top_performer'
        ELSE NULL
      END,
      sp.booking_growth
    FROM get_staff_performance_detailed(period_days, staff_limit) sp
    ORDER BY sp.bookings_completed DESC;

  ELSIF metric_type = 'rating' THEN
    RETURN QUERY
    SELECT
      ROW_NUMBER() OVER (ORDER BY sp.avg_rating DESC, sp.total_reviews DESC)::INTEGER,
      sp.staff_id,
      sp.staff_name,
      sp.profile_image,
      sp.avg_rating,
      'rating'::TEXT,
      CASE
        WHEN sp.avg_rating >= 4.5 THEN 'customer_favorite'
        ELSE NULL
      END,
      sp.rating_growth
    FROM get_staff_performance_detailed(period_days, staff_limit) sp
    WHERE sp.total_reviews > 0
    ORDER BY sp.avg_rating DESC, sp.total_reviews DESC;

  ELSIF metric_type = 'completion_rate' THEN
    RETURN QUERY
    SELECT
      ROW_NUMBER() OVER (ORDER BY sp.completion_rate DESC)::INTEGER,
      sp.staff_id,
      sp.staff_name,
      sp.profile_image,
      sp.completion_rate,
      'completion_rate'::TEXT,
      CASE
        WHEN sp.completion_rate >= 95 THEN 'top_performer'
        ELSE NULL
      END,
      0.0::DECIMAL -- No growth tracking for completion rate yet
    FROM get_staff_performance_detailed(period_days, staff_limit) sp
    WHERE sp.bookings_completed > 0
    ORDER BY sp.completion_rate DESC;
  END IF;
END;
$$;

-- ============================================
-- STAFF EARNINGS WITH BREAKDOWN
-- ============================================

CREATE OR REPLACE FUNCTION get_staff_earnings_detailed(
  period_days INTEGER DEFAULT 30
) RETURNS TABLE (
  staff_id UUID,
  staff_name TEXT,
  base_earnings DECIMAL,
  tips_earned DECIMAL,
  bonus_earnings DECIMAL,
  total_earnings DECIMAL,

  -- Earnings breakdown by category
  massage_earnings DECIMAL,
  spa_earnings DECIMAL,
  nail_earnings DECIMAL,
  facial_earnings DECIMAL,

  -- Deductions
  platform_commission DECIMAL,
  tax_deductions DECIMAL,
  net_earnings DECIMAL,

  -- Payout info (mock for now)
  pending_payout DECIMAL,
  last_payout_date DATE,
  next_payout_date DATE,

  earnings_growth DECIMAL
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
  WITH staff_earnings AS (
    SELECT
      s.id,
      s.name_th,

      -- Current period earnings
      COALESCE(SUM(b.staff_earnings) FILTER (WHERE b.status = 'completed'), 0) as base_earn,
      COALESCE(SUM(b.tip_amount) FILTER (WHERE b.status = 'completed'), 0) as tips_earn,
      0::DECIMAL as bonus_earn, -- TODO: Implement bonus system

      -- Earnings by service category
      COALESCE(SUM(b.staff_earnings + COALESCE(b.tip_amount, 0)) FILTER (WHERE b.status = 'completed' AND srv.category = 'massage'), 0) as massage_earn,
      COALESCE(SUM(b.staff_earnings + COALESCE(b.tip_amount, 0)) FILTER (WHERE b.status = 'completed' AND srv.category = 'spa'), 0) as spa_earn,
      COALESCE(SUM(b.staff_earnings + COALESCE(b.tip_amount, 0)) FILTER (WHERE b.status = 'completed' AND srv.category = 'nail'), 0) as nail_earn,
      COALESCE(SUM(b.staff_earnings + COALESCE(b.tip_amount, 0)) FILTER (WHERE b.status = 'completed' AND srv.category = 'facial'), 0) as facial_earn

    FROM staff s
    LEFT JOIN bookings b ON b.staff_id = s.id AND b.created_at >= start_date
    LEFT JOIN services srv ON srv.id = b.service_id
    WHERE s.status = 'active'
    GROUP BY s.id, s.name_th
  ),
  staff_previous AS (
    SELECT
      s.id,
      COALESCE(SUM(b.staff_earnings + COALESCE(b.tip_amount, 0)) FILTER (WHERE b.status = 'completed'), 0) as prev_total
    FROM staff s
    LEFT JOIN bookings b ON b.staff_id = s.id
                        AND b.created_at >= previous_start_date
                        AND b.created_at < previous_end_date
    GROUP BY s.id
  )
  SELECT
    se.id,
    se.name_th,
    se.base_earn,
    se.tips_earn,
    se.bonus_earn,
    (se.base_earn + se.tips_earn + se.bonus_earn) as total_earn,

    se.massage_earn,
    se.spa_earn,
    se.nail_earn,
    se.facial_earn,

    -- Calculate deductions (10% commission, 5% tax)
    (se.base_earn + se.tips_earn + se.bonus_earn) * 0.10 as commission,
    (se.base_earn + se.tips_earn + se.bonus_earn) * 0.05 as tax,
    (se.base_earn + se.tips_earn + se.bonus_earn) * 0.85 as net_earn,

    -- Mock payout info
    (se.base_earn + se.tips_earn + se.bonus_earn) * 0.85 as pending,
    '2026-02-01'::DATE as last_payout,
    '2026-02-15'::DATE as next_payout,

    calculate_growth((se.base_earn + se.tips_earn + se.bonus_earn), sp.prev_total) as growth

  FROM staff_earnings se
  LEFT JOIN staff_previous sp ON sp.id = se.id
  WHERE (se.base_earn + se.tips_earn + se.bonus_earn) > 0
  ORDER BY (se.base_earn + se.tips_earn + se.bonus_earn) DESC;
END;
$$;

-- ============================================
-- HOTEL PERFORMANCE ANALYTICS
-- ============================================

CREATE OR REPLACE FUNCTION get_hotel_performance_detailed(
  period_days INTEGER DEFAULT 30
) RETURNS TABLE (
  hotel_id UUID,
  hotel_name TEXT,

  -- Basic Metrics
  total_bookings INTEGER,
  completed_bookings INTEGER,
  cancelled_bookings INTEGER,
  completion_rate DECIMAL,
  cancellation_rate DECIMAL,

  -- Financial Metrics
  total_revenue DECIMAL,
  avg_booking_value DECIMAL,
  commission_earned DECIMAL,
  commission_rate DECIMAL,

  -- Customer Metrics
  unique_customers INTEGER,
  new_customers INTEGER,
  returning_customers INTEGER,
  customer_retention_rate DECIMAL,

  -- Quality Metrics
  avg_rating DECIMAL,
  total_reviews INTEGER,
  positive_reviews INTEGER,
  negative_reviews INTEGER,

  -- Staff Metrics
  staff_count INTEGER,
  top_staff_names TEXT[],

  -- Growth Metrics
  revenue_growth DECIMAL,
  booking_growth DECIMAL,
  customer_growth DECIMAL,

  -- Operational Metrics
  avg_service_duration INTEGER,
  peak_booking_hours INTEGER[],
  most_popular_services TEXT[],

  -- Contact Info
  phone TEXT,
  address TEXT,

  rank INTEGER
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
  WITH hotel_current AS (
    SELECT
      h.id,
      h.name,
      h.phone,
      h.address,
      h.commission_rate as comm_rate,

      -- Current period bookings
      COUNT(b.id) as total_bookings_count,
      COUNT(b.id) FILTER (WHERE b.status = 'completed') as completed_count,
      COUNT(b.id) FILTER (WHERE b.status = 'cancelled') as cancelled_count,

      -- Financial calculations
      COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) as revenue,
      COALESCE(SUM(b.final_price * h.commission_rate / 100) FILTER (WHERE b.status = 'completed'), 0) as commission,

      -- Customer metrics
      COUNT(DISTINCT b.customer_id) as unique_customers_count,
      COUNT(DISTINCT b.customer_id) FILTER (
        WHERE b.customer_id NOT IN (
          SELECT DISTINCT customer_id FROM bookings
          WHERE hotel_id = h.id AND created_at < start_date AND customer_id IS NOT NULL
        )
      ) as new_customers_count,

      -- Reviews
      COALESCE(AVG(r.rating), 0) as avg_rating_score,
      COUNT(r.id) as reviews_count,
      COUNT(r.id) FILTER (WHERE r.rating >= 4) as positive_reviews_count,
      COUNT(r.id) FILTER (WHERE r.rating <= 2) as negative_reviews_count,

      -- Staff working at this hotel
      COUNT(DISTINCT b.staff_id) FILTER (WHERE b.staff_id IS NOT NULL) as staff_working_count,
      ARRAY_AGG(DISTINCT s.name_th) FILTER (WHERE s.name_th IS NOT NULL AND b.status = 'completed') as staff_names,

      -- Service data
      ARRAY_AGG(DISTINCT srv.name_th ORDER BY srv.name_th) FILTER (WHERE srv.name_th IS NOT NULL AND b.status = 'completed') as popular_services,
      AVG(srv.duration) FILTER (WHERE srv.duration IS NOT NULL AND b.status = 'completed') as avg_duration,

      -- Peak hours (extract hour from booking_time)
      ARRAY_AGG(DISTINCT EXTRACT(HOUR FROM b.booking_time)::INTEGER) FILTER (WHERE b.booking_time IS NOT NULL AND b.status = 'completed') as booking_hours

    FROM hotels h
    LEFT JOIN bookings b ON b.hotel_id = h.id AND b.created_at >= start_date
    LEFT JOIN reviews r ON r.booking_id = b.id
    LEFT JOIN staff s ON s.id = b.staff_id
    LEFT JOIN services srv ON srv.id = b.service_id
    WHERE h.status = 'active'
    GROUP BY h.id, h.name, h.phone, h.address, h.commission_rate
  ),
  hotel_previous AS (
    SELECT
      h.id,
      COUNT(b.id) as prev_bookings,
      COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) as prev_revenue,
      COUNT(DISTINCT b.customer_id) as prev_customers
    FROM hotels h
    LEFT JOIN bookings b ON b.hotel_id = h.id
                        AND b.created_at >= previous_start_date
                        AND b.created_at < previous_end_date
    GROUP BY h.id
  ),
  hotel_with_growth AS (
    SELECT
      hc.*,
      hp.prev_bookings,
      hp.prev_revenue,
      hp.prev_customers,

      -- Growth calculations
      calculate_growth(hc.revenue, hp.prev_revenue) as rev_growth,
      calculate_growth(hc.total_bookings_count::DECIMAL, hp.prev_bookings::DECIMAL) as booking_growth_calc,
      calculate_growth(hc.unique_customers_count::DECIMAL, hp.prev_customers::DECIMAL) as customer_growth_calc,

      -- Performance rates
      CASE WHEN hc.total_bookings_count > 0 THEN
        (hc.completed_count * 100.0 / hc.total_bookings_count)
      ELSE 0 END as completion_pct,
      CASE WHEN hc.total_bookings_count > 0 THEN
        (hc.cancelled_count * 100.0 / hc.total_bookings_count)
      ELSE 0 END as cancellation_pct,

      -- Customer retention
      CASE WHEN hc.unique_customers_count > 0 THEN
        ((hc.unique_customers_count - hc.new_customers_count) * 100.0 / hc.unique_customers_count)
      ELSE 0 END as retention_rate,

      -- Avg booking value
      CASE WHEN hc.completed_count > 0 THEN
        (hc.revenue / hc.completed_count)
      ELSE 0 END as avg_booking_val

    FROM hotel_current hc
    LEFT JOIN hotel_previous hp ON hp.id = hc.id
    WHERE hc.total_bookings_count > 0 OR hc.completed_count > 0
  ),
  ranked_hotels AS (
    SELECT
      *,
      ROW_NUMBER() OVER (ORDER BY revenue DESC) as hotel_rank
    FROM hotel_with_growth
  )
  SELECT
    rh.id,
    rh.name,

    rh.total_bookings_count,
    rh.completed_count,
    rh.cancelled_count,
    ROUND(rh.completion_pct, 1),
    ROUND(rh.cancellation_pct, 1),

    rh.revenue,
    ROUND(rh.avg_booking_val, 2),
    rh.commission,
    rh.comm_rate,

    rh.unique_customers_count,
    rh.new_customers_count,
    (rh.unique_customers_count - rh.new_customers_count),
    ROUND(rh.retention_rate, 1),

    ROUND(rh.avg_rating_score, 2),
    rh.reviews_count,
    rh.positive_reviews_count,
    rh.negative_reviews_count,

    rh.staff_working_count,
    rh.staff_names[1:5], -- Top 5 staff names

    ROUND(rh.rev_growth, 1),
    ROUND(rh.booking_growth_calc, 1),
    ROUND(rh.customer_growth_calc, 1),

    COALESCE(rh.avg_duration::INTEGER, 90), -- Default 90 minutes
    rh.booking_hours[1:5], -- Top 5 peak hours
    rh.popular_services[1:5], -- Top 5 services

    rh.phone,
    rh.address,

    rh.hotel_rank::INTEGER

  FROM ranked_hotels rh
  ORDER BY rh.revenue DESC;
END;
$$;

-- ============================================
-- CREATE PERFORMANCE INDEXES
-- ============================================

-- Index for bookings analytics queries
CREATE INDEX IF NOT EXISTS idx_bookings_analytics
ON bookings(created_at DESC, status, staff_id, customer_id)
WHERE status != 'cancelled';

-- Index for staff performance queries
CREATE INDEX IF NOT EXISTS idx_bookings_staff_performance
ON bookings(staff_id, status, created_at DESC, booking_date)
WHERE staff_id IS NOT NULL;

-- Index for service category analytics
CREATE INDEX IF NOT EXISTS idx_bookings_service_analytics
ON bookings(service_id, created_at DESC, final_price)
WHERE status = 'completed';

-- Index for hotel performance
CREATE INDEX IF NOT EXISTS idx_bookings_hotel_performance
ON bookings(hotel_id, created_at DESC, final_price)
WHERE hotel_id IS NOT NULL AND status = 'completed';

-- Index for reviews analytics
CREATE INDEX IF NOT EXISTS idx_reviews_analytics
ON reviews(booking_id, rating, created_at DESC);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions for analytics functions
GRANT EXECUTE ON FUNCTION calculate_growth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_staff_performance_detailed TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_staff_rankings_by_metric TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_staff_earnings_detailed TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_hotel_performance_detailed TO anon, authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION calculate_growth IS 'Calculate percentage growth between two values';
COMMENT ON FUNCTION get_dashboard_stats IS 'Get dashboard statistics with growth calculations for specified period';
COMMENT ON FUNCTION get_staff_performance_detailed IS 'Get detailed staff performance metrics including real ratings and completion rates';
COMMENT ON FUNCTION get_staff_rankings_by_metric IS 'Get staff rankings by different metrics (revenue, bookings, rating, completion_rate)';
COMMENT ON FUNCTION get_staff_earnings_detailed IS 'Get detailed staff earnings breakdown by category with deductions';
COMMENT ON FUNCTION get_hotel_performance_detailed IS 'Get comprehensive hotel performance analytics including customer retention, staff metrics, and growth data';