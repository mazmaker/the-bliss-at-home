-- Migration: Create Payouts and Bank Accounts Tables for Staff Earnings
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Create payout_status enum
-- ============================================
DO $$ BEGIN
    CREATE TYPE payout_status AS ENUM (
        'pending',
        'processing',
        'completed',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2. Create bank_accounts table
-- ============================================
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Bank info
    bank_code TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,

    -- Status
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for bank_accounts
CREATE INDEX IF NOT EXISTS idx_bank_accounts_staff_id ON bank_accounts(staff_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_primary ON bank_accounts(staff_id, is_primary);

-- ============================================
-- 3. Create payouts table
-- ============================================
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,

    -- Period info
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Amount breakdown
    gross_earnings DECIMAL(10, 2) NOT NULL DEFAULT 0,
    platform_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    net_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tip_amount DECIMAL(10, 2) DEFAULT 0,

    -- Job count
    total_jobs INTEGER NOT NULL DEFAULT 0,

    -- Status
    status payout_status DEFAULT 'pending',

    -- Transfer info
    transfer_reference TEXT,
    transfer_slip_url TEXT,
    transferred_at TIMESTAMPTZ,

    -- Notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for payouts
CREATE INDEX IF NOT EXISTS idx_payouts_staff_id ON payouts(staff_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_period ON payouts(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payouts_staff_status ON payouts(staff_id, status);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at DESC);

-- ============================================
-- 4. Create payout_jobs junction table
-- ============================================
CREATE TABLE IF NOT EXISTS payout_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tip DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(payout_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_payout_jobs_payout_id ON payout_jobs(payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_jobs_job_id ON payout_jobs(job_id);

-- ============================================
-- 5. Enable Row Level Security
-- ============================================
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_jobs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. RLS Policies for bank_accounts
-- ============================================

-- Staff can view their own bank accounts
CREATE POLICY "Staff can view their bank accounts"
ON bank_accounts FOR SELECT
TO authenticated
USING (staff_id = auth.uid());

-- Staff can insert their own bank accounts
CREATE POLICY "Staff can insert bank accounts"
ON bank_accounts FOR INSERT
TO authenticated
WITH CHECK (staff_id = auth.uid());

-- Staff can update their own bank accounts
CREATE POLICY "Staff can update their bank accounts"
ON bank_accounts FOR UPDATE
TO authenticated
USING (staff_id = auth.uid())
WITH CHECK (staff_id = auth.uid());

-- Staff can delete their own bank accounts
CREATE POLICY "Staff can delete their bank accounts"
ON bank_accounts FOR DELETE
TO authenticated
USING (staff_id = auth.uid());

-- ============================================
-- 7. RLS Policies for payouts
-- ============================================

-- Staff can view their own payouts
CREATE POLICY "Staff can view their payouts"
ON payouts FOR SELECT
TO authenticated
USING (staff_id = auth.uid());

-- Only admin/system can insert payouts (via service role)
-- Staff cannot insert payouts directly

-- ============================================
-- 8. RLS Policies for payout_jobs
-- ============================================

-- Staff can view payout_jobs for their payouts
CREATE POLICY "Staff can view their payout jobs"
ON payout_jobs FOR SELECT
TO authenticated
USING (
    payout_id IN (
        SELECT id FROM payouts WHERE staff_id = auth.uid()
    )
);

-- ============================================
-- 9. Enable Realtime for payouts table
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE payouts;

-- ============================================
-- 10. Create triggers for updated_at
-- ============================================

-- Trigger for bank_accounts
CREATE TRIGGER update_bank_accounts_updated_at
    BEFORE UPDATE ON bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for payouts
CREATE TRIGGER update_payouts_updated_at
    BEFORE UPDATE ON payouts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 11. Function to ensure only one primary bank account
-- ============================================
CREATE OR REPLACE FUNCTION ensure_single_primary_bank_account()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting is_primary to true, unset all other primary accounts for this staff
    IF NEW.is_primary = true THEN
        UPDATE bank_accounts
        SET is_primary = false
        WHERE staff_id = NEW.staff_id
          AND id != NEW.id
          AND is_primary = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_primary_bank_account_trigger
    BEFORE INSERT OR UPDATE OF is_primary ON bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_primary_bank_account();

-- ============================================
-- 12. Create view for staff earnings summary
-- ============================================
CREATE OR REPLACE VIEW staff_earnings_summary AS
SELECT
    staff_id,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN net_amount ELSE 0 END), 0) as total_earnings,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN tip_amount ELSE 0 END), 0) as total_tips,
    COALESCE(SUM(CASE WHEN status = 'pending' THEN net_amount + COALESCE(tip_amount, 0) ELSE 0 END), 0) as pending_amount,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN total_jobs ELSE 0 END), 0) as total_completed_jobs
FROM payouts
GROUP BY staff_id;

-- ============================================
-- Done!
-- ============================================
SELECT 'Payouts and Bank Accounts migration completed successfully!' as status;
