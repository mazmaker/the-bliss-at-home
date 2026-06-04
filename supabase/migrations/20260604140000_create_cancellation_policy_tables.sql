-- Create Cancellation Policy Tables
-- This migration creates the necessary tables for cancellation policy management

-- ============================================
-- Cancellation Policy Settings Table
-- ============================================
CREATE TABLE IF NOT EXISTS cancellation_policy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_title_th TEXT,
  policy_title_en TEXT,
  policy_description_th TEXT,
  policy_description_en TEXT,
  max_reschedules_per_booking INT NOT NULL DEFAULT 2,
  refund_processing_days INT NOT NULL DEFAULT 7,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Cancellation Policy Tiers Table
-- ============================================
CREATE TABLE IF NOT EXISTS cancellation_policy_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_hours_before INT NOT NULL,
  max_hours_before INT,
  can_cancel BOOLEAN NOT NULL DEFAULT true,
  can_reschedule BOOLEAN NOT NULL DEFAULT true,
  refund_percentage INT NOT NULL DEFAULT 0,
  reschedule_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  label_th TEXT,
  label_en TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cancellation_policy_settings_active ON cancellation_policy_settings (is_active);
CREATE INDEX IF NOT EXISTS idx_cancellation_policy_tiers_active ON cancellation_policy_tiers (is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_cancellation_policy_tiers_hours ON cancellation_policy_tiers (min_hours_before, max_hours_before);

-- ============================================
-- Updated At Triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_cancellation_policy_settings_updated_at ON cancellation_policy_settings;
DROP TRIGGER IF EXISTS update_cancellation_policy_tiers_updated_at ON cancellation_policy_tiers;

-- Create new triggers
CREATE TRIGGER update_cancellation_policy_settings_updated_at
  BEFORE UPDATE ON cancellation_policy_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cancellation_policy_tiers_updated_at
  BEFORE UPDATE ON cancellation_policy_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS Policies
-- ============================================

-- Settings table - public read, admin write
ALTER TABLE cancellation_policy_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read active settings
CREATE POLICY "Anyone can read active cancellation policy settings" ON cancellation_policy_settings
  FOR SELECT USING (is_active = true);

-- Allow admins to manage all settings
CREATE POLICY "Admins can manage cancellation policy settings" ON cancellation_policy_settings
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Tiers table - public read, admin write
ALTER TABLE cancellation_policy_tiers ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read active tiers
CREATE POLICY "Anyone can read active cancellation policy tiers" ON cancellation_policy_tiers
  FOR SELECT USING (is_active = true);

-- Allow admins to manage all tiers
CREATE POLICY "Admins can manage cancellation policy tiers" ON cancellation_policy_tiers
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- ============================================
-- Insert Default Data
-- ============================================

-- Insert default settings
INSERT INTO cancellation_policy_settings (
  policy_title_th,
  policy_description_th,
  max_reschedules_per_booking,
  refund_processing_days,
  is_active
)
VALUES (
  'นโยบายการยกเลิกและคืนเงิน',
  'การยกเลิกการจองและการคืนเงินขึ้นอยู่กับช่วงเวลาก่อนการให้บริการ',
  2,
  7,
  true
)
ON CONFLICT DO NOTHING;

-- Insert default tiers
INSERT INTO cancellation_policy_tiers (
  min_hours_before,
  max_hours_before,
  can_cancel,
  can_reschedule,
  refund_percentage,
  reschedule_fee,
  label_th,
  sort_order,
  is_active
)
VALUES
  -- 72+ hours before: 100% refund
  (72, NULL, true, true, 100, 0, 'ก่อนเวลานัด 3 วัน (100% คืนเงิน)', 1, true),
  -- 24-72 hours before: 75% refund
  (24, 72, true, true, 75, 0, 'ก่อนเวลานัด 1-3 วัน (75% คืนเงิน)', 2, true),
  -- 3-24 hours before: 50% refund
  (3, 24, true, true, 50, 0, 'ก่อนเวลานัด 3-24 ชั่วโมง (50% คืนเงิน)', 3, true),
  -- Less than 3 hours: No refund
  (0, 3, false, false, 0, 0, 'น้อยกว่า 3 ชั่วโมงก่อนเวลานัด (ไม่มีการคืนเงิน)', 4, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE cancellation_policy_settings IS 'Global cancellation policy configuration';
COMMENT ON TABLE cancellation_policy_tiers IS 'Time-based cancellation policy tiers with refund percentages';

COMMENT ON COLUMN cancellation_policy_tiers.min_hours_before IS 'Minimum hours before booking (inclusive)';
COMMENT ON COLUMN cancellation_policy_tiers.max_hours_before IS 'Maximum hours before booking (exclusive), NULL means no upper limit';
COMMENT ON COLUMN cancellation_policy_tiers.refund_percentage IS 'Percentage of refund (0-100)';
COMMENT ON COLUMN cancellation_policy_tiers.sort_order IS 'Display order (ascending)';

SELECT 'Cancellation policy tables created successfully!' as message;