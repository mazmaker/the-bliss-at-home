-- Migration: Add 7/15/30 Day Payout Cycles
-- Created: 2026-05-29
-- Purpose: Extend payout system to support weekly, bi-weekly, and custom intervals

-- ============================================
-- 1. Create payout schedule enum type if not exists
-- ============================================
DO $$ BEGIN
    -- Create enum type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_schedule_enum') THEN
        CREATE TYPE payout_schedule_enum AS ENUM ('bi_monthly');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2. Add new payout schedule enum values
-- ============================================
DO $$ BEGIN
    -- Add new enum values if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'weekly' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payout_schedule_enum')) THEN
        ALTER TYPE payout_schedule_enum ADD VALUE 'weekly';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'bi_weekly' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payout_schedule_enum')) THEN
        ALTER TYPE payout_schedule_enum ADD VALUE 'bi_weekly';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'monthly' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payout_schedule_enum')) THEN
        ALTER TYPE payout_schedule_enum ADD VALUE 'monthly';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'custom_days' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payout_schedule_enum')) THEN
        ALTER TYPE payout_schedule_enum ADD VALUE 'custom_days';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 3. Add new columns to staff table
-- ============================================
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS payout_schedule payout_schedule_enum DEFAULT 'weekly',
ADD COLUMN IF NOT EXISTS custom_payout_interval INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS next_payout_date DATE,
ADD COLUMN IF NOT EXISTS last_payout_processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payout_start_date DATE DEFAULT CURRENT_DATE;

-- ============================================
-- 4. Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_staff_next_payout_date ON staff(next_payout_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_staff_payout_schedule ON staff(payout_schedule, is_active);

-- ============================================
-- 5. Function to calculate next payout date
-- ============================================
CREATE OR REPLACE FUNCTION calculate_next_payout_date(
    payout_schedule payout_schedule_enum,
    custom_interval INTEGER DEFAULT 30,
    last_payout DATE DEFAULT NULL,
    start_date DATE DEFAULT CURRENT_DATE
) RETURNS DATE AS $$
DECLARE
    base_date DATE;
    interval_days INTEGER;
BEGIN
    -- Use last payout date or start date as base
    base_date := COALESCE(last_payout, start_date);

    -- Determine interval based on schedule type
    CASE payout_schedule
        WHEN 'weekly' THEN interval_days := 7;
        WHEN 'bi_weekly' THEN interval_days := 14;
        WHEN 'monthly' THEN interval_days := 30;
        WHEN 'bi_monthly' THEN
            -- For bi-monthly, calculate next 15th or 1st
            IF EXTRACT(DAY FROM base_date) < 15 THEN
                RETURN DATE_TRUNC('month', base_date) + INTERVAL '14 days'; -- 15th
            ELSE
                RETURN DATE_TRUNC('month', base_date) + INTERVAL '1 month'; -- 1st of next month
            END IF;
        WHEN 'custom_days' THEN interval_days := COALESCE(custom_interval, 30);
        ELSE interval_days := 30;
    END CASE;

    RETURN base_date + (interval_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. Update existing staff records
-- ============================================
-- Set next payout date for existing staff based on their current schedule
UPDATE staff
SET
    next_payout_date = calculate_next_payout_date(
        payout_schedule,
        custom_payout_interval,
        NULL, -- No last payout for existing staff
        COALESCE(payout_start_date, created_at::DATE)
    ),
    payout_start_date = COALESCE(payout_start_date, created_at::DATE)
WHERE next_payout_date IS NULL AND is_active = true;

-- ============================================
-- 7. Trigger to auto-update next payout date
-- ============================================
CREATE OR REPLACE FUNCTION update_next_payout_date_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if payout schedule or custom interval changed
    IF TG_OP = 'INSERT' OR (OLD.payout_schedule != NEW.payout_schedule OR OLD.custom_payout_interval != NEW.custom_payout_interval) THEN
        NEW.next_payout_date := calculate_next_payout_date(
            NEW.payout_schedule,
            NEW.custom_payout_interval,
            NEW.last_payout_processed_at::DATE,
            COALESCE(NEW.payout_start_date, NEW.created_at::DATE)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER staff_payout_date_trigger
    BEFORE INSERT OR UPDATE OF payout_schedule, custom_payout_interval ON staff
    FOR EACH ROW
    EXECUTE FUNCTION update_next_payout_date_trigger();

-- ============================================
-- 8. Create payout schedule settings table
-- ============================================
CREATE TABLE IF NOT EXISTS payout_schedule_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_type payout_schedule_enum NOT NULL,
    display_name_th TEXT NOT NULL,
    display_name_en TEXT NOT NULL,
    description_th TEXT,
    description_en TEXT,
    default_interval_days INTEGER,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default schedule options
INSERT INTO payout_schedule_settings (schedule_type, display_name_th, display_name_en, description_th, description_en, default_interval_days, sort_order) VALUES
('weekly', 'ทุกสัปดาห์', 'Weekly', 'จ่ายเงินทุก 7 วัน', 'Payout every 7 days', 7, 1),
('bi_weekly', 'ทุก 2 สัปดาห์', 'Bi-Weekly', 'จ่ายเงินทุก 15 วัน (2 สัปดาห์)', 'Payout every 15 days (2 weeks)', 15, 2),
('monthly', 'รายเดือน', 'Monthly', 'จ่ายเงินทุก 30 วัน', 'Payout every 30 days', 30, 3),
('bi_monthly', 'กลางเดือน + สิ้นเดือน', 'Bi-Monthly', 'จ่ายเงิน 2 ครั้งต่อเดือน (วันที่ 15 และ 1)', 'Payout twice per month (15th and 1st)', NULL, 4),
('custom_days', 'กำหนดเอง', 'Custom', 'กำหนดจำนวนวันเอง', 'Custom interval in days', 30, 5)
ON CONFLICT DO NOTHING;

-- ============================================
-- 9. Enable RLS for new table
-- ============================================
ALTER TABLE payout_schedule_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read schedule options
CREATE POLICY "Allow read payout schedule settings"
ON payout_schedule_settings FOR SELECT
TO authenticated
USING (is_active = true);

-- ============================================
-- 10. Create view for staff payout summary
-- ============================================
CREATE OR REPLACE VIEW staff_payout_schedule_summary AS
SELECT
    s.id as staff_id,
    s.profile_id,
    s.name_th,
    s.payout_schedule,
    s.custom_payout_interval,
    s.next_payout_date,
    s.last_payout_processed_at,
    s.payout_start_date,
    pss.display_name_th as schedule_display_name,
    pss.description_th as schedule_description,
    CASE
        WHEN s.next_payout_date IS NULL THEN 0
        ELSE (s.next_payout_date - CURRENT_DATE)
    END as days_until_payout,
    CASE
        WHEN s.next_payout_date <= CURRENT_DATE THEN true
        ELSE false
    END as is_payout_due
FROM staff s
LEFT JOIN payout_schedule_settings pss ON pss.schedule_type = s.payout_schedule
WHERE s.is_active = true;

-- ============================================
-- 11. Update updated_at trigger
-- ============================================
CREATE TRIGGER update_payout_schedule_settings_updated_at
    BEFORE UPDATE ON payout_schedule_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Done!
-- ============================================
SELECT 'Payout cycles migration completed successfully!' as status;