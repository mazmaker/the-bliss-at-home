-- Migration: Create Jobs and Related Tables for Staff App
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Create job_status enum
-- ============================================
DO $$ BEGIN
    CREATE TYPE job_status AS ENUM (
        'pending',
        'assigned',
        'confirmed',
        'traveling',
        'arrived',
        'in_progress',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2. Create job_payment_status enum
-- ============================================
DO $$ BEGIN
    CREATE TYPE job_payment_status AS ENUM (
        'pending',
        'paid',
        'refunded'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 3. Create jobs table
-- ============================================
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID,
    staff_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    hotel_id UUID REFERENCES hotels(id) ON DELETE SET NULL,

    -- Customer info (denormalized for quick access)
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_avatar_url TEXT,

    -- Location info
    hotel_name TEXT,
    room_number TEXT,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_km DOUBLE PRECISION,

    -- Service info
    service_name TEXT NOT NULL,
    service_name_en TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,

    -- Payment info
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    staff_earnings DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tip_amount DECIMAL(10, 2) DEFAULT 0,
    payment_status job_payment_status DEFAULT 'pending',

    -- Job status
    status job_status DEFAULT 'pending',
    accepted_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    cancelled_by TEXT CHECK (cancelled_by IN ('STAFF', 'CUSTOMER', 'ADMIN')),

    -- Notes
    customer_notes TEXT,
    staff_notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_jobs_staff_id ON jobs(staff_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date ON jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_jobs_staff_date ON jobs(staff_id, scheduled_date);

-- ============================================
-- 4. Create job_ratings table
-- ============================================
CREATE TABLE IF NOT EXISTS job_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_ratings_staff_id ON job_ratings(staff_id);
CREATE INDEX IF NOT EXISTS idx_job_ratings_job_id ON job_ratings(job_id);

-- ============================================
-- 5. Create sos_reports table
-- ============================================
CREATE TABLE IF NOT EXISTS sos_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    message TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'cancelled')),
    resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_reports_staff_id ON sos_reports(staff_id);
CREATE INDEX IF NOT EXISTS idx_sos_reports_status ON sos_reports(status);

-- ============================================
-- 6. Enable Row Level Security
-- ============================================
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. RLS Policies for jobs
-- ============================================

-- Staff can view their assigned jobs
CREATE POLICY "Staff can view their jobs"
ON jobs FOR SELECT
TO authenticated
USING (
    staff_id = auth.uid() OR
    customer_id = auth.uid() OR
    (status = 'pending' AND staff_id IS NULL)
);

-- Staff can update their assigned jobs
CREATE POLICY "Staff can update their jobs"
ON jobs FOR UPDATE
TO authenticated
USING (staff_id = auth.uid())
WITH CHECK (staff_id = auth.uid());

-- Staff can accept pending jobs
CREATE POLICY "Staff can accept pending jobs"
ON jobs FOR UPDATE
TO authenticated
USING (status = 'pending' AND staff_id IS NULL)
WITH CHECK (staff_id = auth.uid());

-- ============================================
-- 8. RLS Policies for job_ratings
-- ============================================

-- Users can view ratings for their jobs
CREATE POLICY "Users can view job ratings"
ON job_ratings FOR SELECT
TO authenticated
USING (staff_id = auth.uid() OR customer_id = auth.uid());

-- Customers can insert ratings
CREATE POLICY "Customers can rate jobs"
ON job_ratings FOR INSERT
TO authenticated
WITH CHECK (customer_id = auth.uid());

-- ============================================
-- 9. RLS Policies for sos_reports
-- ============================================

-- Staff can view their own SOS reports
CREATE POLICY "Staff can view their SOS reports"
ON sos_reports FOR SELECT
TO authenticated
USING (staff_id = auth.uid());

-- Staff can create SOS reports
CREATE POLICY "Staff can create SOS reports"
ON sos_reports FOR INSERT
TO authenticated
WITH CHECK (staff_id = auth.uid());

-- ============================================
-- 10. Enable Realtime for jobs table
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;

-- ============================================
-- 11. Create trigger for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 12. Insert sample jobs for testing (optional)
-- ============================================
-- Uncomment below to add test data

/*
INSERT INTO jobs (
    customer_id, customer_name, customer_phone,
    service_name, service_name_en, duration_minutes,
    scheduled_date, scheduled_time,
    address, amount, staff_earnings,
    status
) VALUES
(
    (SELECT id FROM profiles WHERE role = 'CUSTOMER' LIMIT 1),
    'ทดสอบ ลูกค้า',
    '0812345678',
    'นวดแผนไทย 2 ชั่วโมง',
    'Thai Massage 2 hours',
    120,
    CURRENT_DATE,
    '14:00',
    '123 ถนนสุขุมวิท กรุงเทพฯ',
    1200,
    800,
    'pending'
),
(
    (SELECT id FROM profiles WHERE role = 'CUSTOMER' LIMIT 1),
    'Jane Customer',
    '0898765432',
    'นวดน้ำมัน 1.5 ชั่วโมง',
    'Oil Massage 1.5 hours',
    90,
    CURRENT_DATE,
    '16:30',
    '456 ถนนสีลม กรุงเทพฯ',
    900,
    600,
    'pending'
);
*/

-- ============================================
-- Done!
-- ============================================
SELECT 'Migration completed successfully!' as status;
