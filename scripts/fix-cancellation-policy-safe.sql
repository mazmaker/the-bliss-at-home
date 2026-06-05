-- Safe Update for Cancellation Policy Tables
-- This version handles existing tables and policies

-- ============================================
-- Create Tables (Safe)
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
-- Create Indexes (Safe)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cancellation_policy_settings_active ON cancellation_policy_settings (is_active);
CREATE INDEX IF NOT EXISTS idx_cancellation_policy_tiers_active ON cancellation_policy_tiers (is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_cancellation_policy_tiers_hours ON cancellation_policy_tiers (min_hours_before, max_hours_before);

-- ============================================
-- Enable RLS (Safe)
-- ============================================
ALTER TABLE cancellation_policy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_policy_tiers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Drop and Recreate Policies (Safe)
-- ============================================

-- Settings table policies
DROP POLICY IF EXISTS "Anyone can read active cancellation policy settings" ON cancellation_policy_settings;
DROP POLICY IF EXISTS "Admins can manage cancellation policy settings" ON cancellation_policy_settings;

CREATE POLICY "Anyone can read active cancellation policy settings" ON cancellation_policy_settings
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage cancellation policy settings" ON cancellation_policy_settings
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Tiers table policies
DROP POLICY IF EXISTS "Anyone can read active cancellation policy tiers" ON cancellation_policy_tiers;
DROP POLICY IF EXISTS "Admins can manage cancellation policy tiers" ON cancellation_policy_tiers;

CREATE POLICY "Anyone can read active cancellation policy tiers" ON cancellation_policy_tiers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage cancellation policy tiers" ON cancellation_policy_tiers
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- ============================================
-- Insert Default Data (Safe)
-- ============================================

-- Clear existing data first (optional, remove if you want to keep existing data)
-- DELETE FROM cancellation_policy_tiers;
-- DELETE FROM cancellation_policy_settings;

-- Insert default settings
INSERT INTO cancellation_policy_settings (
  policy_title_th,
  policy_description_th,
  max_reschedules_per_booking,
  refund_processing_days,
  is_active
)
SELECT
  'นโยบายการยกเลิกและคืนเงิน',
  'การยกเลิกการจองและการคืนเงินขึ้นอยู่กับช่วงเวลาก่อนการให้บริการ',
  2,
  7,
  true
WHERE NOT EXISTS (SELECT 1 FROM cancellation_policy_settings WHERE is_active = true);

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
SELECT * FROM (VALUES
  -- 72+ hours before: 100% refund
  (72, NULL, true, true, 100, 0, 'ก่อนเวลานัด 3 วัน (100% คืนเงิน)', 1, true),
  -- 24-72 hours before: 75% refund
  (24, 72, true, true, 75, 0, 'ก่อนเวลานัด 1-3 วัน (75% คืนเงิน)', 2, true),
  -- 3-24 hours before: 50% refund
  (3, 24, true, true, 50, 0, 'ก่อนเวลานัด 3-24 ชั่วโมง (50% คืนเงิน)', 3, true),
  -- Less than 3 hours: No refund
  (0, 3, false, false, 0, 0, 'น้อยกว่า 3 ชั่วโมงก่อนเวลานัด (ไม่มีการคืนเงิน)', 4, true)
) AS new_tiers(min_hours_before, max_hours_before, can_cancel, can_reschedule, refund_percentage, reschedule_fee, label_th, sort_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM cancellation_policy_tiers WHERE is_active = true);

-- ============================================
-- Verify Installation
-- ============================================
SELECT
  'Tables created successfully!' as message,
  (SELECT COUNT(*) FROM cancellation_policy_settings WHERE is_active = true) as active_settings,
  (SELECT COUNT(*) FROM cancellation_policy_tiers WHERE is_active = true) as active_tiers;