-- Create promotions table
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
  usage_count INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  applies_to VARCHAR(20) DEFAULT 'all_services' CHECK (applies_to IN ('all_services', 'specific_services', 'categories')),
  target_services TEXT[], -- Array of service IDs
  target_categories TEXT[], -- Array of category names
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_discount_type ON promotions(discount_type);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Admin users can do everything
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

-- Customer users can only read active promotions
CREATE POLICY "Customers can view active promotions"
  ON promotions
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND NOW() BETWEEN start_date AND end_date
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'customer'
    )
  );

-- Insert sample promotions
INSERT INTO promotions (
  name_th, name_en, description_th, description_en, code,
  discount_type, discount_value, min_order_amount, max_discount,
  usage_limit, start_date, end_date, is_active, applies_to
) VALUES
-- Welcome promotion
(
  'ส่วนลดสมาชิกใหม่', 'New Member Discount',
  'ลด 20% สำหรับสมาชิกใหม่ ยอดขั้นต่ำ 1,000 บาท', 'Get 20% off for new members with minimum order 1,000 THB',
  'WELCOME20',
  'percentage', 20.00, 1000.00, 500.00,
  1000, NOW(), NOW() + INTERVAL '3 months', true, 'all_services'
),
-- Fixed amount discount
(
  'ลด 200 บาท', 'Save 200 THB',
  'ลดทันที 200 บาท เมื่อยอดชำระตั้งแต่ 1,500 บาท', 'Get 200 THB off when you spend 1,500 THB or more',
  'SAVE200',
  'fixed_amount', 200.00, 1500.00, NULL,
  500, NOW(), NOW() + INTERVAL '2 months', true, 'all_services'
),
-- Massage special
(
  'ส่วนลดนวดพิเศษ', 'Massage Special',
  'ลด 15% สำหรับบริการนวดทุกประเภท', 'Get 15% off for all massage services',
  'MASSAGE15',
  'percentage', 15.00, 500.00, 300.00,
  200, NOW(), NOW() + INTERVAL '1 month', true, 'categories'
),
-- Buy 2 Get 1 promotion
(
  'ซื้อ 2 ได้ 1', 'Buy 2 Get 1 Free',
  'ซื้อบริการ 2 ครั้ง รับฟรี 1 ครั้ง สำหรับบริการเล็บ', 'Buy 2 nail services, get 1 free',
  'BUY2GET1',
  'buy_x_get_y', 2.00, 800.00, NULL,
  100, NOW(), NOW() + INTERVAL '6 weeks', true, 'categories'
),
-- Weekend special
(
  'ส่วนลดวันหยุด', 'Weekend Special',
  'ลด 25% ทุกวันเสาร์-อาทิตย์', 'Get 25% off every Saturday-Sunday',
  'WEEKEND25',
  'percentage', 25.00, 1200.00, 400.00,
  NULL, NOW(), NOW() + INTERVAL '2 months', true, 'all_services'
),
-- Inactive promotion for testing
(
  'โปรโมชั่นทดสอบ', 'Test Promotion',
  'โปรโมชั่นสำหรับทดสอบระบบ', 'Test promotion for system testing',
  'TEST50',
  'percentage', 50.00, 100.00, 1000.00,
  10, NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 week', false, 'all_services'
);

-- Set target categories for category-specific promotions
UPDATE promotions
SET target_categories = ARRAY['massage']
WHERE code = 'MASSAGE15';

UPDATE promotions
SET target_categories = ARRAY['nail']
WHERE code = 'BUY2GET1';

COMMENT ON TABLE promotions IS 'Store promotion and discount information';
COMMENT ON COLUMN promotions.discount_type IS 'Type of discount: percentage, fixed_amount, or buy_x_get_y';
COMMENT ON COLUMN promotions.applies_to IS 'What the promotion applies to: all_services, specific_services, or categories';
COMMENT ON COLUMN promotions.target_services IS 'Array of service IDs when applies_to is specific_services';
COMMENT ON COLUMN promotions.target_categories IS 'Array of category names when applies_to is categories';