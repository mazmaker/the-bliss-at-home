-- Quick Fix for Analytics Timestamp Issues
-- Run this directly in Supabase SQL Editor

-- Fix the staff performance function to return correct timestamp types
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
  last_active_date TIMESTAMPTZ,  -- Fixed: was TIMESTAMP
  join_date TIMESTAMPTZ,         -- Fixed: was TIMESTAMP
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
    ss.updated_at,  -- Now properly returns TIMESTAMPTZ
    ss.created_at,  -- Now properly returns TIMESTAMPTZ
    ROW_NUMBER() OVER (ORDER BY (ss.earnings + ss.tips) DESC)::INTEGER
  FROM staff_stats ss
  ORDER BY (ss.earnings + ss.tips) DESC
  LIMIT staff_limit;
END;
$$;