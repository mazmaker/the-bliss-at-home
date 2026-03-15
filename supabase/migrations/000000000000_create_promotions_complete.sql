-- Create promotions table with all required columns
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_th VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  description_th TEXT,
  description_en TEXT,
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'buy_x_get_y')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2),
  max_discount DECIMAL(10,2),
  usage_limit INTEGER,
  usage_limit_per_user INTEGER DEFAULT NULL,
  usage_count INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'disabled')),
  applies_to VARCHAR(20) DEFAULT 'all_services' CHECK (applies_to IN ('all_services', 'specific_services', 'categories')),
  target_services TEXT[], -- Array of service IDs
  target_categories TEXT[], -- Array of category names
  auto_generate_code BOOLEAN DEFAULT false,
  code_prefix VARCHAR(10) DEFAULT '',
  code_length INTEGER DEFAULT 8,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create promotion_usage table for tracking individual usage
CREATE TABLE IF NOT EXISTS promotion_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  booking_id UUID,
  discount_amount DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create coupon_codes table for managing individual coupon codes
CREATE TABLE IF NOT EXISTS coupon_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL UNIQUE,
  usage_limit INTEGER DEFAULT 1,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions(status);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_discount_type ON promotions(discount_type);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_promotion_id ON promotion_usage(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_user_id ON promotion_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_used_at ON promotion_usage(used_at);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_promotion_id ON coupon_codes(promotion_id);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_code ON coupon_codes(code);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_active ON coupon_codes(is_active);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coupon_codes_updated_at
  BEFORE UPDATE ON coupon_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies for promotions
CREATE POLICY "Admin users can manage all promotions"
  ON promotions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%admin%'
    )
  );

CREATE POLICY "Customers can view active promotions"
  ON promotions
  FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    AND NOW() BETWEEN start_date AND end_date
  );

-- RLS policies for promotion_usage
CREATE POLICY "Users can view their own promotion usage"
  ON promotion_usage
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin can view all promotion usage"
  ON promotion_usage
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%admin%'
    )
  );

CREATE POLICY "System can insert promotion usage"
  ON promotion_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS policies for coupon_codes
CREATE POLICY "Admin can manage coupon codes"
  ON coupon_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email LIKE '%admin%'
    )
  );

CREATE POLICY "Customers can view active coupon codes"
  ON coupon_codes
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (expires_at IS NULL OR NOW() <= expires_at)
  );

-- Function to automatically generate coupon codes
CREATE OR REPLACE FUNCTION generate_coupon_code(
  prefix TEXT DEFAULT '',
  length INTEGER DEFAULT 8
) RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  result := UPPER(prefix);

  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create coupon codes for a promotion
CREATE OR REPLACE FUNCTION create_coupon_codes_for_promotion(
  promotion_id_param UUID,
  count INTEGER DEFAULT 1
) RETURNS TABLE(code TEXT) AS $$
DECLARE
  promotion_rec RECORD;
  generated_code TEXT;
  i INTEGER := 0;
BEGIN
  -- Get promotion details
  SELECT * INTO promotion_rec FROM promotions WHERE id = promotion_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Promotion not found';
  END IF;

  FOR i IN 1..count LOOP
    LOOP
      generated_code := generate_coupon_code(
        promotion_rec.code_prefix,
        promotion_rec.code_length
      );

      -- Check if code already exists
      IF NOT EXISTS (SELECT 1 FROM coupon_codes WHERE coupon_codes.code = generated_code) THEN
        EXIT;
      END IF;
    END LOOP;

    INSERT INTO coupon_codes (promotion_id, code, usage_limit)
    VALUES (promotion_id_param, generated_code, 1);

    RETURN QUERY SELECT generated_code;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get promotion usage statistics
CREATE OR REPLACE FUNCTION get_promotion_stats(promotion_id_param UUID)
RETURNS TABLE(
  total_usage BIGINT,
  unique_users BIGINT,
  total_discount DECIMAL,
  avg_discount DECIMAL,
  usage_by_date JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_usage,
    COUNT(DISTINCT user_id)::BIGINT as unique_users,
    COALESCE(SUM(discount_amount), 0) as total_discount,
    COALESCE(AVG(discount_amount), 0) as avg_discount,
    (
      SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'date', DATE(used_at),
          'count', count,
          'total_discount', total_discount
        ) ORDER BY DATE(used_at)
      )
      FROM (
        SELECT
          DATE(used_at) as used_date,
          COUNT(*) as count,
          SUM(discount_amount) as total_discount
        FROM promotion_usage
        WHERE promotion_usage.promotion_id = promotion_id_param
        GROUP BY DATE(used_at)
        ORDER BY DATE(used_at) DESC
        LIMIT 30
      ) daily_stats
    ) as usage_by_date
  FROM promotion_usage
  WHERE promotion_usage.promotion_id = promotion_id_param;
END;
$$ LANGUAGE plpgsql;

-- Insert sample promotions
INSERT INTO promotions (
  name_th, name_en, description_th, description_en, code,
  discount_type, discount_value, min_order_amount, max_discount,
  usage_limit, start_date, end_date, status, applies_to
) VALUES
-- Welcome promotion
(
  'ส่วนลดสมาชิกใหม่', 'New Member Discount',
  'ลด 20% สำหรับสมาชิกใหม่ ยอดขั้นต่ำ 1,000 บาท', 'Get 20% off for new members with minimum order 1,000 THB',
  'WELCOME20',
  'percentage', 20.00, 1000.00, 500.00,
  1000, NOW(), NOW() + INTERVAL '3 months', 'active', 'all_services'
),
-- Fixed amount discount
(
  'ลด 200 บาท', 'Save 200 THB',
  'ลดทันที 200 บาท เมื่อยอดชำระตั้งแต่ 1,500 บาท', 'Get 200 THB off when you spend 1,500 THB or more',
  'SAVE200',
  'fixed_amount', 200.00, 1500.00, NULL,
  500, NOW(), NOW() + INTERVAL '2 months', 'active', 'all_services'
),
-- Massage special
(
  'ส่วนลดนวดพิเศษ', 'Massage Special',
  'ลด 15% สำหรับบริการนวดทุกประเภท', 'Get 15% off for all massage services',
  'MASSAGE15',
  'percentage', 15.00, 500.00, 300.00,
  200, NOW(), NOW() + INTERVAL '1 month', 'active', 'categories'
),
-- Buy 2 Get 1 promotion
(
  'ซื้อ 2 ได้ 1', 'Buy 2 Get 1 Free',
  'ซื้อบริการ 2 ครั้ง รับฟรี 1 ครั้ง สำหรับบริการเล็บ', 'Buy 2 nail services, get 1 free',
  'BUY2GET1',
  'buy_x_get_y', 2.00, 800.00, NULL,
  100, NOW(), NOW() + INTERVAL '6 weeks', 'active', 'categories'
),
-- Weekend special
(
  'ส่วนลดวันหยุด', 'Weekend Special',
  'ลด 25% ทุกวันเสาร์-อาทิตย์', 'Get 25% off every Saturday-Sunday',
  'WEEKEND25',
  'percentage', 25.00, 1200.00, 400.00,
  NULL, NOW(), NOW() + INTERVAL '2 months', 'active', 'all_services'
),
-- Draft promotion for testing
(
  'โปรโมชั่นทดสอบ', 'Test Promotion',
  'โปรโมชั่นสำหรับทดสอบระบบ', 'Test promotion for system testing',
  'TEST50',
  'percentage', 50.00, 100.00, 1000.00,
  10, NOW(), NOW() + INTERVAL '1 month', 'draft', 'all_services'
)
ON CONFLICT (code) DO NOTHING;

-- Set target categories for category-specific promotions
UPDATE promotions
SET target_categories = ARRAY['massage']
WHERE code = 'MASSAGE15';

UPDATE promotions
SET target_categories = ARRAY['nail']
WHERE code = 'BUY2GET1';

COMMENT ON TABLE promotions IS 'Store promotion and discount information';
COMMENT ON TABLE promotion_usage IS 'Track individual promotion usage by users';
COMMENT ON TABLE coupon_codes IS 'Individual coupon codes for promotions';
COMMENT ON COLUMN promotions.status IS 'Promotion status: draft, active, expired, disabled';
COMMENT ON COLUMN promotions.usage_limit_per_user IS 'Maximum times a single user can use this promotion';
COMMENT ON COLUMN promotions.auto_generate_code IS 'Whether to auto-generate coupon codes';
COMMENT ON COLUMN promotions.code_prefix IS 'Prefix for auto-generated codes';
COMMENT ON COLUMN promotions.code_length IS 'Length of auto-generated code suffix';