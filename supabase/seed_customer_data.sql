-- Seed Customer Test Data
-- Run this in Supabase SQL Editor to create test customers

-- Delete existing test customers first (optional - comment out if you want to keep existing data)
-- DELETE FROM customers WHERE phone IN ('081-234-5678', '082-345-6789', '083-456-7890', '084-567-8901', '085-678-9012', '086-789-0123', '087-890-1234', '088-901-2345');

-- Insert test customers
INSERT INTO customers (full_name, phone, address, date_of_birth, status, total_bookings, total_spent, created_at)
SELECT * FROM (VALUES
  ('สมชาย ใจดี', '081-234-5678', '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110', '1985-05-15'::date, 'active'::customer_status, 0, 0, NOW() - INTERVAL '90 days'),
  ('วิภาดา สุขสันต์', '082-345-6789', '456 ถนนพระราม 4 แขวงปทุมวัน เขตปทุมวัน กรุงเทพฯ 10330', '1990-08-22'::date, 'active'::customer_status, 0, 0, NOW() - INTERVAL '75 days'),
  ('กิตติ เก่งการค้า', '083-456-7890', '789 ถนนสีลม แขวงสีลม เขตบางรัก กรุงเทพฯ 10500', '1982-03-10'::date, 'active'::customer_status, 0, 0, NOW() - INTERVAL '60 days'),
  ('มานี มีตา', '084-567-8901', '321 ถนนรัชดาภิเษก แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ 10310', '1995-11-28'::date, 'active'::customer_status, 0, 0, NOW() - INTERVAL '45 days'),
  ('ประยุทธ์ มั่งมี', '085-678-9012', '555 ถนนพหลโยธิน แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900', '1978-01-05'::date, 'active'::customer_status, 0, 0, NOW() - INTERVAL '30 days'),
  ('สุดา ดีใจ', '086-789-0123', '888 ถนนเพชรบุรี แขวงมักกะสัน เขตราชเทวี กรุงเทพฯ 10400', '1992-07-19'::date, 'suspended'::customer_status, 0, 0, NOW() - INTERVAL '20 days'),
  ('ธนา รวยทรัพย์', '087-890-1234', '999 ถนนวิภาวดีรังสิต แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900', '1988-12-03'::date, 'active'::customer_status, 0, 0, NOW() - INTERVAL '15 days'),
  ('นภา สวยงาม', '088-901-2345', '111 ถนนรามคำแหง แขวงหัวหมาก เขตบางกะปิ กรุงเทพฯ 10240', '1993-04-25'::date, 'active'::customer_status, 0, 0, NOW() - INTERVAL '10 days')
) AS v(full_name, phone, address, date_of_birth, status, total_bookings, total_spent, created_at)
WHERE NOT EXISTS (
  SELECT 1 FROM customers c WHERE c.phone = v.phone
);

-- Create sample bookings for customers (using existing services)
DO $$
DECLARE
  customer_record RECORD;
  service_record RECORD;
  booking_date DATE;
  booking_count INT;
  total_price DECIMAL;
BEGIN
  -- Get first 5 customers
  FOR customer_record IN
    SELECT id FROM customers ORDER BY created_at DESC LIMIT 5
  LOOP
    booking_count := 0;
    total_price := 0;

    -- Create 3-5 random bookings per customer
    FOR i IN 1..(3 + floor(random() * 3)::int) LOOP
      -- Get a random service
      SELECT id, name_th INTO service_record
      FROM services
      ORDER BY random()
      LIMIT 1;

      EXIT WHEN service_record.id IS NULL;

      -- Random date within last 90 days
      booking_date := CURRENT_DATE - (floor(random() * 90)::int || ' days')::interval;

      -- Random price between 500-2500
      DECLARE
        price DECIMAL := 500 + floor(random() * 2000);
        booking_status TEXT;
        payment_status TEXT;
      BEGIN
        -- Determine status based on booking date
        IF booking_date < CURRENT_DATE - 7 THEN
          booking_status := 'completed';
          payment_status := 'paid';
        ELSIF booking_date < CURRENT_DATE - 2 THEN
          booking_status := 'confirmed';
          payment_status := 'pending';
        ELSE
          booking_status := 'pending';
          payment_status := 'pending';
        END IF;

        -- Insert booking
        INSERT INTO bookings (
          customer_id,
          service_id,
          booking_date,
          booking_time,
          duration,
          base_price,
          discount_amount,
          final_price,
          status,
          payment_status,
          is_hotel_booking,
          created_at
        ) VALUES (
          customer_record.id,
          service_record.id,
          booking_date,
          ((10 + floor(random() * 8))::text || ':00')::time,
          60,
          price,
          0,
          price,
          booking_status::booking_status,
          payment_status::payment_status,
          false,
          booking_date
        );

        booking_count := booking_count + 1;
        total_price := total_price + price;
      END;
    END LOOP;

    -- Update customer statistics
    UPDATE customers
    SET
      total_bookings = booking_count,
      total_spent = total_price,
      last_booking_date = (
        SELECT MAX(b.booking_date)
        FROM bookings b
        WHERE b.customer_id = customer_record.id
      )
    WHERE id = customer_record.id;
  END LOOP;
END $$;

-- Create sample SOS alerts
DO $$
DECLARE
  customer1_id UUID;
  customer2_id UUID;
BEGIN
  -- Get first two customers
  SELECT id INTO customer1_id FROM customers ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO customer2_id FROM customers ORDER BY created_at DESC OFFSET 2 LIMIT 1;

  -- Insert SOS alerts if customers exist
  IF customer1_id IS NOT NULL THEN
    INSERT INTO sos_alerts (
      customer_id,
      latitude,
      longitude,
      location_accuracy,
      message,
      status,
      priority,
      created_at
    ) VALUES (
      customer1_id,
      13.7563,
      100.5018,
      10.5,
      'ต้องการความช่วยเหลือด่วน พนักงานยังไม่มาตามเวลานัด',
      'pending',
      'high',
      NOW() - INTERVAL '2 hours'
    );
  END IF;

  IF customer2_id IS NOT NULL THEN
    INSERT INTO sos_alerts (
      customer_id,
      latitude,
      longitude,
      location_accuracy,
      message,
      status,
      priority,
      created_at
    ) VALUES (
      customer2_id,
      13.7466,
      100.5343,
      8.2,
      'พนักงานไม่มาตามนัด รอมา 30 นาทีแล้ว',
      'acknowledged',
      'medium',
      NOW() - INTERVAL '5 hours'
    );
  END IF;
END $$;

-- Display summary
SELECT
  'Customers' as table_name,
  COUNT(*) as count
FROM customers
UNION ALL
SELECT
  'Bookings',
  COUNT(*)
FROM bookings
WHERE customer_id IN (SELECT id FROM customers)
UNION ALL
SELECT
  'SOS Alerts',
  COUNT(*)
FROM sos_alerts;
