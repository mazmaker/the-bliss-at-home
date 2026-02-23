-- ============================================
-- Cancellation Policy Configuration Tables
-- Migration: 20260220_create_cancellation_policy_tables
-- Description: Creates configurable cancellation/reschedule policy tables
-- ============================================

-- Table: cancellation_policy_tiers
-- Stores configurable cancellation/reschedule rules by time tier
CREATE TABLE IF NOT EXISTS cancellation_policy_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Time range (hours before booking)
  min_hours_before INTEGER NOT NULL,  -- e.g., 3
  max_hours_before INTEGER,           -- e.g., 24 (null = unlimited)

  -- Permissions
  can_cancel BOOLEAN DEFAULT true,
  can_reschedule BOOLEAN DEFAULT true,

  -- Refund settings
  refund_percentage INTEGER DEFAULT 100 CHECK (refund_percentage >= 0 AND refund_percentage <= 100),

  -- Reschedule fee (optional)
  reschedule_fee DECIMAL(10,2) DEFAULT 0,

  -- Display labels
  label_th TEXT,
  label_en TEXT,

  -- Ordering
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: cancellation_policy_settings
-- General cancellation policy settings
CREATE TABLE IF NOT EXISTS cancellation_policy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Display text
  policy_title_th TEXT DEFAULT 'นโยบายการยกเลิก/เลื่อนนัด',
  policy_title_en TEXT DEFAULT 'Cancellation/Reschedule Policy',
  policy_description_th TEXT,
  policy_description_en TEXT,

  -- Limits
  max_reschedules_per_booking INTEGER DEFAULT 2,

  -- Refund processing info
  refund_processing_days INTEGER DEFAULT 14,

  -- Flags
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Seed Default Data
-- ============================================

-- Insert default tiers
INSERT INTO cancellation_policy_tiers
  (min_hours_before, max_hours_before, can_cancel, can_reschedule, refund_percentage, reschedule_fee, label_th, label_en, sort_order)
VALUES
  (24, NULL, true, true, 100, 0, 'มากกว่า 24 ชั่วโมงก่อนนัด', 'More than 24 hours before', 1),
  (3, 24, true, true, 50, 0, '3-24 ชั่วโมงก่อนนัด', '3-24 hours before', 2),
  (0, 3, false, false, 0, 0, 'น้อยกว่า 3 ชั่วโมงก่อนนัด', 'Less than 3 hours before', 3);

-- Insert default settings
INSERT INTO cancellation_policy_settings
  (policy_title_th, policy_title_en, policy_description_th, policy_description_en, max_reschedules_per_booking, refund_processing_days)
VALUES
  (
    'นโยบายการยกเลิก/เลื่อนนัด',
    'Cancellation/Reschedule Policy',
    'ท่านสามารถยกเลิกหรือเลื่อนนัดได้ล่วงหน้าตามเงื่อนไขด้านล่าง การคืนเงินจะดำเนินการภายใน 5-14 วันทำการ',
    'You can cancel or reschedule according to the conditions below. Refunds will be processed within 5-14 business days.',
    2,
    14
  );

-- ============================================
-- RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE cancellation_policy_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_policy_settings ENABLE ROW LEVEL SECURITY;

-- Public read access for policy (customers need to see this)
CREATE POLICY "Public can read active cancellation policy tiers"
  ON cancellation_policy_tiers
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public can read active cancellation policy settings"
  ON cancellation_policy_settings
  FOR SELECT
  USING (is_active = true);

-- Admin full access to tiers
CREATE POLICY "Admins can manage cancellation policy tiers"
  ON cancellation_policy_tiers
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Admin full access to settings
CREATE POLICY "Admins can manage cancellation policy settings"
  ON cancellation_policy_settings
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_cancellation_policy_tiers_active
  ON cancellation_policy_tiers(is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_cancellation_policy_settings_active
  ON cancellation_policy_settings(is_active);

-- ============================================
-- Trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_cancellation_policy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cancellation_policy_tiers_updated_at
  BEFORE UPDATE ON cancellation_policy_tiers
  FOR EACH ROW EXECUTE FUNCTION update_cancellation_policy_updated_at();

CREATE TRIGGER update_cancellation_policy_settings_updated_at
  BEFORE UPDATE ON cancellation_policy_settings
  FOR EACH ROW EXECUTE FUNCTION update_cancellation_policy_updated_at();

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE cancellation_policy_tiers IS 'Configurable cancellation/reschedule rules by time tier';
COMMENT ON TABLE cancellation_policy_settings IS 'General cancellation policy settings';
COMMENT ON COLUMN cancellation_policy_tiers.min_hours_before IS 'Minimum hours before booking for this tier to apply';
COMMENT ON COLUMN cancellation_policy_tiers.max_hours_before IS 'Maximum hours before booking (NULL = unlimited)';
COMMENT ON COLUMN cancellation_policy_tiers.refund_percentage IS 'Percentage of refund (0-100)';
COMMENT ON COLUMN cancellation_policy_settings.max_reschedules_per_booking IS 'Maximum times a booking can be rescheduled';
