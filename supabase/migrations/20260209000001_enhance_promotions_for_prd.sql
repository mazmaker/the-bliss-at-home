-- Enhance promotions table according to PRD requirements

-- Add new columns for PRD features
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'disabled'));
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS usage_limit_per_user INTEGER DEFAULT NULL;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS auto_generate_code BOOLEAN DEFAULT false;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS code_prefix VARCHAR(10) DEFAULT '';
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS code_length INTEGER DEFAULT 8;

-- Create promotion_usage table for tracking individual usage
CREATE TABLE IF NOT EXISTS promotion_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_promotion_usage_promotion_id ON promotion_usage(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_user_id ON promotion_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_used_at ON promotion_usage(used_at);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_promotion_id ON coupon_codes(promotion_id);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_code ON coupon_codes(code);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_active ON coupon_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions(status);

-- Create updated_at trigger for coupon_codes
CREATE TRIGGER update_coupon_codes_updated_at
  BEFORE UPDATE ON coupon_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update existing RLS policies
DROP POLICY IF EXISTS "Admin users can manage all promotions" ON promotions;
DROP POLICY IF EXISTS "Customers can view active promotions" ON promotions;

-- Enhanced RLS policies for promotions
CREATE POLICY "Admin users can manage all promotions"
  ON promotions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Customers can view active promotions"
  ON promotions
  FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    AND NOW() BETWEEN start_date AND end_date
    AND (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'customer'
      )
      OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    )
  );

-- RLS policies for promotion_usage
ALTER TABLE promotion_usage ENABLE ROW LEVEL SECURITY;

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
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert promotion usage"
  ON promotion_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS policies for coupon_codes
ALTER TABLE coupon_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage coupon codes"
  ON coupon_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Customers can view active coupon codes"
  ON coupon_codes
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (expires_at IS NULL OR NOW() <= expires_at)
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'customer'
    )
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

-- Update existing promotions to use new status field
UPDATE promotions
SET status = CASE
  WHEN is_active = true AND NOW() BETWEEN start_date AND end_date THEN 'active'
  WHEN is_active = true AND NOW() > end_date THEN 'expired'
  WHEN is_active = false THEN 'disabled'
  ELSE 'draft'
END;

-- Create sample coupon codes for existing promotions
DO $$
DECLARE
  promo RECORD;
BEGIN
  FOR promo IN SELECT id, code FROM promotions WHERE status = 'active' LOOP
    -- Create 5 auto-generated coupon codes for each active promotion
    PERFORM create_coupon_codes_for_promotion(promo.id, 5);
  END LOOP;
END $$;

-- Create some sample promotion usage data
INSERT INTO promotion_usage (promotion_id, user_id, discount_amount, used_at)
SELECT
  p.id,
  (SELECT id FROM profiles WHERE role = 'customer' LIMIT 1),
  CASE
    WHEN p.discount_type = 'percentage' THEN 100.00
    WHEN p.discount_type = 'fixed_amount' THEN p.discount_value
    ELSE 50.00
  END,
  NOW() - (random() * INTERVAL '30 days')
FROM promotions p
WHERE p.status = 'active'
AND EXISTS (SELECT 1 FROM profiles WHERE role = 'customer')
LIMIT 10;

COMMENT ON TABLE promotion_usage IS 'Track individual promotion usage by users';
COMMENT ON TABLE coupon_codes IS 'Individual coupon codes for promotions';
COMMENT ON COLUMN promotions.status IS 'Promotion status: draft, active, expired, disabled';
COMMENT ON COLUMN promotions.usage_limit_per_user IS 'Maximum times a single user can use this promotion';
COMMENT ON COLUMN promotions.auto_generate_code IS 'Whether to auto-generate coupon codes';
COMMENT ON COLUMN promotions.code_prefix IS 'Prefix for auto-generated codes';
COMMENT ON COLUMN promotions.code_length IS 'Length of auto-generated code suffix';