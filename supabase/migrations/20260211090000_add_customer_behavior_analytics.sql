-- Customer Behavior Analytics Functions
-- Created: 2026-02-11
-- Purpose: Add customer behavior analysis for repeat booking rates and customer lifetime value

-- ============================================
-- CUSTOMER BEHAVIOR ANALYTICS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_customer_behavior_analytics(
  period_days INTEGER DEFAULT 30
) RETURNS TABLE (
  -- Repeat Booking Metrics
  total_customers INTEGER,
  new_customers INTEGER,
  returning_customers INTEGER,
  repeat_booking_rate DECIMAL,

  -- Customer Lifetime Value
  avg_customer_lifetime_value DECIMAL,
  avg_bookings_per_customer DECIMAL,
  avg_time_between_bookings DECIMAL, -- in days

  -- Retention Metrics
  customer_retention_rate DECIMAL,
  churn_rate DECIMAL,

  -- Growth Metrics
  new_customer_growth DECIMAL,
  returning_customer_growth DECIMAL,
  clv_growth DECIMAL
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
  WITH customer_stats_current AS (
    -- Current period customer analysis
    SELECT
      COUNT(DISTINCT b.customer_id) as total_customers_count,

      -- New customers (first booking ever)
      COUNT(DISTINCT b.customer_id) FILTER (
        WHERE NOT EXISTS (
          SELECT 1 FROM bookings b2
          WHERE b2.customer_id = b.customer_id
          AND b2.created_at < start_date
          AND b2.customer_id IS NOT NULL
        )
      ) as new_customers_count,

      -- Returning customers (had previous bookings)
      COUNT(DISTINCT b.customer_id) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM bookings b2
          WHERE b2.customer_id = b.customer_id
          AND b2.created_at < start_date
          AND b2.customer_id IS NOT NULL
        )
      ) as returning_customers_count,

      -- Average bookings per customer in this period
      CASE
        WHEN COUNT(DISTINCT b.customer_id) > 0 THEN
          COUNT(b.id)::DECIMAL / COUNT(DISTINCT b.customer_id)
        ELSE 0
      END as avg_bookings_per_customer,

      -- Total revenue from customers
      COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) as total_revenue

    FROM bookings b
    WHERE b.created_at >= start_date
      AND b.customer_id IS NOT NULL
  ),

  customer_stats_previous AS (
    -- Previous period for comparison
    SELECT
      COUNT(DISTINCT b.customer_id) as prev_new_customers,
      COUNT(DISTINCT b.customer_id) FILTER (
        WHERE EXISTS (
          SELECT 1 FROM bookings b2
          WHERE b2.customer_id = b.customer_id
          AND b2.created_at < previous_start_date
          AND b2.customer_id IS NOT NULL
        )
      ) as prev_returning_customers,
      COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) as prev_total_revenue
    FROM bookings b
    WHERE b.created_at >= previous_start_date
      AND b.created_at < previous_end_date
      AND b.customer_id IS NOT NULL
  ),

  customer_lifetime_stats AS (
    -- Calculate customer lifetime metrics
    SELECT
      COUNT(DISTINCT c.customer_id) as total_customers_ever,
      AVG(c.customer_revenue) as avg_clv,
      AVG(c.days_between_bookings) as avg_days_between
    FROM (
      SELECT
        b.customer_id,
        COUNT(b.id) as total_bookings,
        COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) as customer_revenue,
        CASE
          WHEN COUNT(b.id) > 1 THEN
            EXTRACT(EPOCH FROM (MAX(b.created_at) - MIN(b.created_at))) / 86400 / (COUNT(b.id) - 1)
          ELSE 0
        END as days_between_bookings
      FROM bookings b
      WHERE b.customer_id IS NOT NULL
        AND b.created_at >= start_date
      GROUP BY b.customer_id
      HAVING COUNT(b.id) > 0
    ) c
  )

  SELECT
    csc.total_customers_count,
    csc.new_customers_count,
    csc.returning_customers_count,

    -- Repeat booking rate calculation
    CASE
      WHEN csc.total_customers_count > 0 THEN
        ROUND((csc.returning_customers_count * 100.0 / csc.total_customers_count), 2)
      ELSE 0
    END as repeat_rate,

    -- Customer Lifetime Value
    ROUND(COALESCE(cls.avg_clv, 0), 2) as clv,
    ROUND(csc.avg_bookings_per_customer, 2) as avg_bookings,
    ROUND(COALESCE(cls.avg_days_between, 0), 1) as days_between,

    -- Retention rate (returning customers / total customers from previous period who are still active)
    CASE
      WHEN csp.prev_returning_customers > 0 THEN
        ROUND((csc.returning_customers_count * 100.0 / csp.prev_returning_customers), 2)
      ELSE 0
    END as retention_rate,

    -- Churn rate (customers who didn't return)
    CASE
      WHEN csp.prev_returning_customers > 0 THEN
        ROUND(100.0 - (csc.returning_customers_count * 100.0 / csp.prev_returning_customers), 2)
      ELSE 0
    END as churn_rate,

    -- Growth calculations
    ROUND(calculate_growth(csc.new_customers_count::DECIMAL, csp.prev_new_customers::DECIMAL), 1) as new_growth,
    ROUND(calculate_growth(csc.returning_customers_count::DECIMAL, csp.prev_returning_customers::DECIMAL), 1) as returning_growth,
    ROUND(calculate_growth(csc.total_revenue, csp.prev_total_revenue), 1) as clv_growth_calc

  FROM customer_stats_current csc
  CROSS JOIN customer_stats_previous csp
  CROSS JOIN customer_lifetime_stats cls;
END;
$$;

-- ============================================
-- CUSTOMER SEGMENTATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_customer_segments(
  period_days INTEGER DEFAULT 30
) RETURNS TABLE (
  segment_name TEXT,
  customer_count INTEGER,
  avg_booking_value DECIMAL,
  total_revenue DECIMAL,
  avg_bookings_per_customer DECIMAL,
  percentage_of_total DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  start_date TIMESTAMP;
  total_customers_in_period INTEGER;
BEGIN
  start_date := NOW() - INTERVAL '1 day' * period_days;

  -- Get total customers for percentage calculation
  SELECT COUNT(DISTINCT customer_id) INTO total_customers_in_period
  FROM bookings
  WHERE created_at >= start_date AND customer_id IS NOT NULL;

  RETURN QUERY
  WITH customer_segments AS (
    SELECT
      b.customer_id,
      COUNT(b.id) as booking_count,
      COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) as customer_revenue,
      COALESCE(AVG(b.final_price) FILTER (WHERE b.status = 'completed'), 0) as avg_booking_val,

      -- Determine segment based on booking frequency and value
      CASE
        WHEN COUNT(b.id) >= 10 OR COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) >= 10000 THEN 'VIP Customers'
        WHEN COUNT(b.id) >= 5 OR COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) >= 5000 THEN 'Loyal Customers'
        WHEN COUNT(b.id) >= 2 THEN 'Regular Customers'
        ELSE 'New Customers'
      END as segment

    FROM bookings b
    WHERE b.created_at >= start_date
      AND b.customer_id IS NOT NULL
    GROUP BY b.customer_id
  ),

  segment_summary AS (
    SELECT
      cs.segment,
      COUNT(*) as customers,
      AVG(cs.avg_booking_val) as avg_value,
      SUM(cs.customer_revenue) as segment_revenue,
      AVG(cs.booking_count) as avg_bookings
    FROM customer_segments cs
    GROUP BY cs.segment
  )

  SELECT
    ss.segment,
    ss.customers,
    ROUND(ss.avg_value, 2),
    ss.segment_revenue,
    ROUND(ss.avg_bookings, 1),
    CASE
      WHEN total_customers_in_period > 0 THEN
        ROUND((ss.customers * 100.0 / total_customers_in_period), 1)
      ELSE 0
    END
  FROM segment_summary ss
  ORDER BY ss.segment_revenue DESC;
END;
$$;

-- ============================================
-- CUSTOMER SATISFACTION METRICS
-- ============================================

CREATE OR REPLACE FUNCTION get_customer_satisfaction_metrics(
  period_days INTEGER DEFAULT 30
) RETURNS TABLE (
  avg_rating DECIMAL,
  total_reviews INTEGER,
  satisfaction_rate DECIMAL, -- % of 4+ star reviews
  nps_score DECIMAL, -- Net Promoter Score approximation
  review_growth DECIMAL,
  avg_rating_growth DECIMAL
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
  WITH current_satisfaction AS (
    SELECT
      COUNT(r.id) as review_count,
      AVG(r.rating) as average_rating,
      COUNT(r.id) FILTER (WHERE r.rating >= 4) as positive_reviews,
      COUNT(r.id) FILTER (WHERE r.rating >= 9) as promoters,
      COUNT(r.id) FILTER (WHERE r.rating <= 6) as detractors
    FROM reviews r
    JOIN bookings b ON b.id = r.booking_id
    WHERE b.created_at >= start_date
  ),

  previous_satisfaction AS (
    SELECT
      COUNT(r.id) as prev_review_count,
      AVG(r.rating) as prev_average_rating
    FROM reviews r
    JOIN bookings b ON b.id = r.booking_id
    WHERE b.created_at >= previous_start_date
      AND b.created_at < previous_end_date
  )

  SELECT
    ROUND(COALESCE(cs.average_rating, 0), 2),
    COALESCE(cs.review_count, 0),
    CASE
      WHEN cs.review_count > 0 THEN
        ROUND((cs.positive_reviews * 100.0 / cs.review_count), 1)
      ELSE 0
    END,
    CASE
      WHEN cs.review_count > 0 THEN
        ROUND(((cs.promoters - cs.detractors) * 100.0 / cs.review_count), 1)
      ELSE 0
    END,
    ROUND(calculate_growth(cs.review_count::DECIMAL, ps.prev_review_count::DECIMAL), 1),
    ROUND(calculate_growth(cs.average_rating, ps.prev_average_rating), 1)

  FROM current_satisfaction cs
  CROSS JOIN previous_satisfaction ps;
END;
$$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_customer_behavior_analytics TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_customer_segments TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_customer_satisfaction_metrics TO anon, authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_customer_behavior_analytics IS 'Get comprehensive customer behavior metrics including repeat booking rates, CLV, and retention';
COMMENT ON FUNCTION get_customer_segments IS 'Get customer segmentation analysis based on booking frequency and value';
COMMENT ON FUNCTION get_customer_satisfaction_metrics IS 'Get customer satisfaction metrics from reviews and ratings';