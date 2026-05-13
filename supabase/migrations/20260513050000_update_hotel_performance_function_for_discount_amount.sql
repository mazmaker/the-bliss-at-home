-- Update Hotel Performance Function for discount_amount support
-- Created: 2026-05-13
-- Purpose: Add discount_amount field to get_hotel_performance_detailed function

-- ✅ Drop existing function first (required when changing return type)
DROP FUNCTION IF EXISTS get_hotel_performance_detailed(integer);

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
  discount_amount DECIMAL, -- ✅ เพิ่ม discount_amount field
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
      h.discount_amount as disc_amount, -- ✅ เพิ่ม discount_amount

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
    GROUP BY h.id, h.name, h.phone, h.address, h.commission_rate, h.discount_amount -- ✅ เพิ่ม discount_amount ใน GROUP BY
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
    hs.disc_amount, -- ✅ Return discount_amount

    hs.unique_customers_count,
    GREATEST(hs.unique_customers_count - 5, 0), -- Mock new customers
    LEAST(hs.unique_customers_count, 5),        -- Mock returning customers
    CASE WHEN hs.unique_customers_count > 0 THEN 75.0 ELSE 0 END, -- Mock retention rate

    hs.avg_rating_score,
    hs.reviews_count,
    hs.positive_reviews_count,
    hs.negative_reviews_count,

    hs.staff_working_count,
    COALESCE(hs.staff_names, ARRAY[]::TEXT[]),
    0.0, -- Mock revenue growth
    0.0, -- Mock booking growth
    0.0, -- Mock customer growth
    90, -- Mock avg service duration
    COALESCE(hs.booking_hours_array, ARRAY[]::INTEGER[]),
    COALESCE(hs.service_names, ARRAY[]::TEXT[]),
    hs.phone,
    hs.address,
    ROW_NUMBER() OVER (ORDER BY hs.revenue DESC)::INTEGER
  FROM hotel_stats hs
  ORDER BY hs.revenue DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_hotel_performance_detailed TO anon, authenticated;

-- Add comment
COMMENT ON FUNCTION get_hotel_performance_detailed IS 'Hotel performance analytics with discount_amount support - Updated for fixed discount amounts';