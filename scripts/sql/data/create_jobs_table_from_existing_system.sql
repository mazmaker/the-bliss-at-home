-- Migration: Create Jobs Table (Based on Existing System Usage)
-- Description: Create jobs table with exact columns used in current migrations
-- Version: 20260320000000

-- ============================================
-- Create jobs table matching existing INSERT statements
-- ============================================

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- References (from sync_booking_to_job and other inserts)
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    hotel_id UUID REFERENCES hotels(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,

    -- Customer info (required in all inserts)
    customer_name TEXT NOT NULL,
    customer_phone TEXT,

    -- Location info (from all job inserts)
    hotel_name TEXT,
    room_number TEXT,
    address TEXT NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    distance_km DECIMAL(8,2),

    -- Service details (from all inserts)
    service_name TEXT NOT NULL,
    service_name_en TEXT,
    duration_minutes INTEGER NOT NULL,

    -- Schedule (required in all inserts)
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,

    -- Pricing (from all inserts)
    amount DECIMAL(10,2) NOT NULL,
    staff_earnings DECIMAL(10,2) DEFAULT 0,

    -- Status (used in all systems)
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),

    -- Notes (from multiple inserts)
    customer_notes TEXT,
    staff_notes TEXT,

    -- Multi-therapist support (from couple booking fixes)
    job_index INTEGER DEFAULT 1,
    total_jobs INTEGER DEFAULT 1,

    -- Timestamps (standard pattern)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- ============================================
-- Create indexes (based on expected queries)
-- ============================================

-- Primary queries from staff app
CREATE INDEX idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX idx_jobs_staff_id ON jobs(staff_id);
CREATE INDEX idx_jobs_booking_id ON jobs(booking_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_scheduled_date ON jobs(scheduled_date);

-- Staff app pending jobs query
CREATE INDEX idx_jobs_pending ON jobs(status, scheduled_date) WHERE status = 'pending';

-- Payout system reference (from payout_jobs table)
CREATE INDEX idx_jobs_completed ON jobs(staff_id, status) WHERE status = 'completed';

-- ============================================
-- Enable RLS (following system pattern)
-- ============================================

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Staff can view pending jobs (staff app main feature)
CREATE POLICY "Staff can view pending jobs" ON jobs
FOR SELECT TO authenticated
USING (status = 'pending' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'STAFF'
));

-- Staff can view their assigned jobs
CREATE POLICY "Staff can view assigned jobs" ON jobs
FOR SELECT TO authenticated
USING (staff_id IN (
    SELECT id FROM staff WHERE profile_id = auth.uid()
));

-- Staff can update their jobs
CREATE POLICY "Staff can update assigned jobs" ON jobs
FOR UPDATE TO authenticated
USING (staff_id IN (
    SELECT id FROM staff WHERE profile_id = auth.uid()
));

-- Customers can view their jobs
CREATE POLICY "Customers can view their jobs" ON jobs
FOR SELECT TO authenticated
USING (customer_id = auth.uid());

-- Admins can manage all jobs (admin app)
CREATE POLICY "Admins can manage jobs" ON jobs
FOR ALL TO authenticated
USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
));

-- Service role can insert jobs (from triggers)
-- No explicit policy needed - service role bypasses RLS

-- ============================================
-- Create updated_at trigger (system standard)
-- ============================================

CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Grant permissions (system standard)
-- ============================================

GRANT SELECT, INSERT, UPDATE ON jobs TO authenticated;
GRANT SELECT ON jobs TO anon; -- For public job listings if needed

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE jobs IS 'Jobs table for staff assignments from bookings - matches existing system usage';
COMMENT ON COLUMN jobs.job_index IS 'For multi-therapist bookings: 1, 2, 3, etc.';
COMMENT ON COLUMN jobs.total_jobs IS 'Total number of therapists needed for this booking';
COMMENT ON COLUMN jobs.status IS 'Job workflow: pending -> assigned -> in_progress -> completed';

-- ============================================
-- Verify table creation
-- ============================================

SELECT
    'Jobs table created successfully with ' || count(*) || ' columns' as status
FROM information_schema.columns
WHERE table_name = 'jobs' AND table_schema = 'public';