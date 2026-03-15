-- Advanced Sales Analytics Functions
-- Created: 2026-02-11
-- Purpose: World-class financial reporting and sales analytics

-- ============================================
-- ADVANCED SALES METRICS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_advanced_sales_metrics(
  period_days INTEGER DEFAULT 30
) RETURNS TABLE (
  -- Core Revenue Metrics
  gross_revenue DECIMAL,
  net_revenue DECIMAL,
  refunds_total DECIMAL,

  -- Profitability Metrics
  gross_margin_percent DECIMAL,
  average_order_value DECIMAL,
  revenue_per_customer DECIMAL,

  -- Growth & Performance
  revenue_growth_rate DECIMAL,
  order_growth_rate DECIMAL,
  customer_growth_rate DECIMAL,

  -- Operational Metrics
  conversion_rate DECIMAL,
  cancellation_rate DECIMAL,
  completion_rate DECIMAL,

  -- Financial Health
  cash_flow DECIMAL,
  accounts_receivable DECIMAL,
  payment_collection_rate DECIMAL,

  -- Forecasting
  projected_revenue DECIMAL,
  target_achievement_percent DECIMAL,
  variance_from_forecast DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  start_date TIMESTAMP;
  previous_start_date TIMESTAMP;
  previous_end_date TIMESTAMP;
  monthly_target DECIMAL := 500000; -- Target 500K per month
BEGIN
  start_date := NOW() - INTERVAL '1 day' * period_days;
  previous_start_date := NOW() - INTERVAL '1 day' * (period_days * 2);
  previous_end_date := NOW() - INTERVAL '1 day' * period_days;

  RETURN QUERY
  WITH current_metrics AS (
    SELECT
      -- Revenue calculations
      COALESCE(SUM(b.final_price), 0) as total_revenue,
      COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) as completed_revenue,
      COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'cancelled'), 0) as cancelled_revenue,

      -- Booking metrics
      COUNT(b.id) as total_bookings,
      COUNT(b.id) FILTER (WHERE b.status = 'completed') as completed_bookings,
      COUNT(b.id) FILTER (WHERE b.status = 'cancelled') as cancelled_bookings,
      COUNT(DISTINCT b.customer_id) as unique_customers,

      -- Cost assumptions (in real world, would come from cost table)
      COALESCE(SUM(b.final_price), 0) * 0.30 as estimated_costs -- 30% cost ratio

    FROM bookings b
    WHERE b.created_at >= start_date
  ),

  previous_metrics AS (
    SELECT
      COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) as prev_revenue,
      COUNT(b.id) FILTER (WHERE b.status = 'completed') as prev_bookings,
      COUNT(DISTINCT b.customer_id) as prev_customers
    FROM bookings b
    WHERE b.created_at >= previous_start_date
      AND b.created_at < previous_end_date
  ),

  payment_metrics AS (
    SELECT
      -- Payment collection analysis
      COUNT(b.id) FILTER (WHERE b.payment_status = 'paid') as paid_bookings,
      COUNT(b.id) FILTER (WHERE b.payment_status = 'pending') as pending_payments,
      COALESCE(SUM(b.final_price) FILTER (WHERE b.payment_status = 'pending'), 0) as pending_amount
    FROM bookings b
    WHERE b.created_at >= start_date
  ),

  forecasting AS (
    SELECT
      -- Simple linear projection based on current trend
      CASE
        WHEN cm.completed_revenue > 0 AND period_days > 0 THEN
          (cm.completed_revenue / period_days) * 30 -- Project to 30 days
        ELSE 0
      END as revenue_projection
    FROM current_metrics cm
  )

  SELECT
    -- Core Revenue
    cm.total_revenue as gross_rev,
    cm.completed_revenue as net_rev,
    cm.cancelled_revenue as refunds,

    -- Profitability
    CASE
      WHEN cm.completed_revenue > 0 THEN
        ROUND(((cm.completed_revenue - cm.estimated_costs) / cm.completed_revenue) * 100, 2)
      ELSE 0
    END as gross_margin,

    CASE
      WHEN cm.completed_bookings > 0 THEN
        ROUND(cm.completed_revenue / cm.completed_bookings, 2)
      ELSE 0
    END as avg_order_val,

    CASE
      WHEN cm.unique_customers > 0 THEN
        ROUND(cm.completed_revenue / cm.unique_customers, 2)
      ELSE 0
    END as revenue_per_cust,

    -- Growth Rates
    ROUND(calculate_growth(cm.completed_revenue, pm.prev_revenue), 2) as rev_growth,
    ROUND(calculate_growth(cm.completed_bookings::DECIMAL, pm.prev_bookings::DECIMAL), 2) as order_growth,
    ROUND(calculate_growth(cm.unique_customers::DECIMAL, pm.prev_customers::DECIMAL), 2) as cust_growth,

    -- Operational
    CASE
      WHEN cm.total_bookings > 0 THEN
        ROUND((cm.completed_bookings * 100.0 / cm.total_bookings), 2)
      ELSE 0
    END as conversion,

    CASE
      WHEN cm.total_bookings > 0 THEN
        ROUND((cm.cancelled_bookings * 100.0 / cm.total_bookings), 2)
      ELSE 0
    END as cancellation,

    CASE
      WHEN cm.total_bookings > 0 THEN
        ROUND((cm.completed_bookings * 100.0 / cm.total_bookings), 2)
      ELSE 0
    END as completion,

    -- Financial Health
    cm.completed_revenue - cm.estimated_costs as cash_flow_est,
    pmt.pending_amount as receivable,

    CASE
      WHEN (pmt.paid_bookings + pmt.pending_payments) > 0 THEN
        ROUND((pmt.paid_bookings * 100.0 / (pmt.paid_bookings + pmt.pending_payments)), 2)
      ELSE 0
    END as collection_rate,

    -- Forecasting
    ROUND(f.revenue_projection, 2) as projected_rev,

    CASE
      WHEN monthly_target > 0 THEN
        ROUND((cm.completed_revenue / monthly_target) * 100, 2)
      ELSE 0
    END as target_achievement,

    ROUND(cm.completed_revenue - monthly_target, 2) as forecast_variance

  FROM current_metrics cm
  CROSS JOIN previous_metrics pm
  CROSS JOIN payment_metrics pmt
  CROSS JOIN forecasting f;
END;
$$;

-- ============================================
-- SALES CHANNEL ANALYSIS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_sales_channel_analysis(
  period_days INTEGER DEFAULT 30
) RETURNS TABLE (
  channel_name TEXT,
  booking_count INTEGER,
  revenue DECIMAL,
  avg_booking_value DECIMAL,
  conversion_rate DECIMAL,
  growth_rate DECIMAL,
  market_share_percent DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  start_date TIMESTAMP;
  previous_start_date TIMESTAMP;
  previous_end_date TIMESTAMP;
  total_revenue DECIMAL;
BEGIN
  start_date := NOW() - INTERVAL '1 day' * period_days;
  previous_start_date := NOW() - INTERVAL '1 day' * (period_days * 2);
  previous_end_date := NOW() - INTERVAL '1 day' * period_days;

  -- Get total revenue for market share calculation
  SELECT COALESCE(SUM(final_price), 0) INTO total_revenue
  FROM bookings
  WHERE created_at >= start_date AND status = 'completed';

  RETURN QUERY
  WITH channel_current AS (
    SELECT
      CASE
        WHEN b.is_hotel_booking THEN 'Hotel Direct'
        WHEN b.customer_id IS NOT NULL THEN 'Customer App'
        ELSE 'Walk-in'
      END as channel,

      COUNT(b.id) as bookings,
      COUNT(b.id) FILTER (WHERE b.status = 'completed') as completed,
      COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) as channel_revenue

    FROM bookings b
    WHERE b.created_at >= start_date
    GROUP BY channel
  ),

  channel_previous AS (
    SELECT
      CASE
        WHEN b.is_hotel_booking THEN 'Hotel Direct'
        WHEN b.customer_id IS NOT NULL THEN 'Customer App'
        ELSE 'Walk-in'
      END as channel,

      COALESCE(SUM(b.final_price) FILTER (WHERE b.status = 'completed'), 0) as prev_revenue

    FROM bookings b
    WHERE b.created_at >= previous_start_date
      AND b.created_at < previous_end_date
    GROUP BY channel
  )

  SELECT
    cc.channel,
    cc.completed,
    cc.channel_revenue,

    CASE
      WHEN cc.completed > 0 THEN
        ROUND(cc.channel_revenue / cc.completed, 2)
      ELSE 0
    END as avg_value,

    CASE
      WHEN cc.bookings > 0 THEN
        ROUND((cc.completed * 100.0 / cc.bookings), 2)
      ELSE 0
    END as conv_rate,

    ROUND(calculate_growth(cc.channel_revenue, cp.prev_revenue), 2) as growth,

    CASE
      WHEN total_revenue > 0 THEN
        ROUND((cc.channel_revenue / total_revenue) * 100, 2)
      ELSE 0
    END as market_share

  FROM channel_current cc
  LEFT JOIN channel_previous cp ON cp.channel = cc.channel
  ORDER BY cc.channel_revenue DESC;
END;
$$;

-- ============================================
-- PAYMENT METHOD ANALYSIS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_payment_method_analysis(
  period_days INTEGER DEFAULT 30
) RETURNS TABLE (
  payment_method TEXT,
  transaction_count INTEGER,
  total_amount DECIMAL,
  avg_transaction_value DECIMAL,
  success_rate DECIMAL,
  processing_fees_estimated DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  start_date TIMESTAMP;
BEGIN
  start_date := NOW() - INTERVAL '1 day' * period_days;

  RETURN QUERY
  WITH payment_analysis AS (
    SELECT
      COALESCE(b.payment_method, 'Cash') as method,
      COUNT(b.id) as transactions,
      COUNT(b.id) FILTER (WHERE b.payment_status = 'paid') as successful,
      COALESCE(SUM(b.final_price) FILTER (WHERE b.payment_status = 'paid'), 0) as paid_amount

    FROM bookings b
    WHERE b.created_at >= start_date
      AND b.status = 'completed'
    GROUP BY method
  )

  SELECT
    pa.method,
    pa.successful,
    pa.paid_amount,

    CASE
      WHEN pa.successful > 0 THEN
        ROUND(pa.paid_amount / pa.successful, 2)
      ELSE 0
    END as avg_transaction,

    CASE
      WHEN pa.transactions > 0 THEN
        ROUND((pa.successful * 100.0 / pa.transactions), 2)
      ELSE 0
    END as success_pct,

    -- Estimated processing fees (2.9% for card, 0% for cash)
    CASE
      WHEN pa.method = 'Cash' THEN 0
      ELSE ROUND(pa.paid_amount * 0.029, 2)
    END as fees_estimated

  FROM payment_analysis pa
  ORDER BY pa.paid_amount DESC;
END;
$$;

-- ============================================
-- TIME-BASED REVENUE ANALYSIS
-- ============================================

CREATE OR REPLACE FUNCTION get_time_based_revenue_analysis(
  period_days INTEGER DEFAULT 30
) RETURNS TABLE (
  analysis_type TEXT,
  time_period TEXT,
  revenue DECIMAL,
  booking_count INTEGER,
  avg_booking_value DECIMAL,
  performance_score DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  start_date TIMESTAMP;
BEGIN
  start_date := NOW() - INTERVAL '1 day' * period_days;

  RETURN QUERY
  -- Peak Hours Analysis
  SELECT
    'Peak Hours'::TEXT,
    EXTRACT(HOUR FROM b.booking_time)::TEXT || ':00',
    COALESCE(SUM(b.final_price), 0),
    COUNT(b.id)::INTEGER,
    CASE
      WHEN COUNT(b.id) > 0 THEN
        ROUND(COALESCE(SUM(b.final_price), 0) / COUNT(b.id), 2)
      ELSE 0
    END,
    -- Performance score based on revenue vs average
    ROUND(
      COALESCE(SUM(b.final_price), 0) / NULLIF(
        (SELECT AVG(hourly_rev) FROM (
          SELECT COALESCE(SUM(final_price), 0) as hourly_rev
          FROM bookings
          WHERE created_at >= start_date AND status = 'completed'
          GROUP BY EXTRACT(HOUR FROM booking_time)
        ) hr), 0
      ) * 100, 2
    )
  FROM bookings b
  WHERE b.created_at >= start_date
    AND b.status = 'completed'
    AND b.booking_time IS NOT NULL
  GROUP BY EXTRACT(HOUR FROM b.booking_time)

  UNION ALL

  -- Peak Days Analysis
  SELECT
    'Peak Days'::TEXT,
    TO_CHAR(b.booking_date, 'Day'),
    COALESCE(SUM(b.final_price), 0),
    COUNT(b.id)::INTEGER,
    CASE
      WHEN COUNT(b.id) > 0 THEN
        ROUND(COALESCE(SUM(b.final_price), 0) / COUNT(b.id), 2)
      ELSE 0
    END,
    ROUND(
      COALESCE(SUM(b.final_price), 0) / NULLIF(
        (SELECT AVG(daily_rev) FROM (
          SELECT COALESCE(SUM(final_price), 0) as daily_rev
          FROM bookings
          WHERE created_at >= start_date AND status = 'completed'
          GROUP BY TO_CHAR(booking_date, 'Day')
        ) dr), 0
      ) * 100, 2
    )
  FROM bookings b
  WHERE b.created_at >= start_date
    AND b.status = 'completed'
    AND b.booking_date IS NOT NULL
  GROUP BY TO_CHAR(b.booking_date, 'Day')

  ORDER BY revenue DESC;
END;
$$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_advanced_sales_metrics TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_sales_channel_analysis TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_payment_method_analysis TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_time_based_revenue_analysis TO anon, authenticated;

-- Add comments
COMMENT ON FUNCTION get_advanced_sales_metrics IS 'Comprehensive sales performance metrics including profitability, growth, and forecasting';
COMMENT ON FUNCTION get_sales_channel_analysis IS 'Analysis of revenue performance across different sales channels';
COMMENT ON FUNCTION get_payment_method_analysis IS 'Payment method breakdown with success rates and fee analysis';
COMMENT ON FUNCTION get_time_based_revenue_analysis IS 'Peak hours and days analysis for revenue optimization';