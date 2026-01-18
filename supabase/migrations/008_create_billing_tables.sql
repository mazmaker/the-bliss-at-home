-- Migration: Create Billing Tables
-- Description: Monthly bills for hotels and payouts for staff
-- Version: 008

-- ============================================
-- MONTHLY BILLS TABLE (Hotels)
-- ============================================

CREATE TABLE monthly_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  bill_number TEXT UNIQUE NOT NULL,

  -- Billing period
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Totals
  total_bookings INTEGER DEFAULT 0,
  total_base_price DECIMAL(12,2) DEFAULT 0,
  total_discount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
  due_date DATE,
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hotel_id, month, year)
);

-- ============================================
-- PAYOUTS TABLE (Staff)
-- ============================================

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  payout_number TEXT UNIQUE NOT NULL,

  -- Payout period
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Totals
  total_bookings INTEGER DEFAULT 0,
  total_earnings DECIMAL(12,2) DEFAULT 0,
  total_tips DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'paid'
  paid_at TIMESTAMPTZ,
  transfer_receipt TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, month, year)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_monthly_bills_hotel ON monthly_bills(hotel_id);
CREATE INDEX idx_monthly_bills_period ON monthly_bills(year, month);
CREATE INDEX idx_monthly_bills_status ON monthly_bills(status);
CREATE INDEX idx_payouts_staff ON payouts(staff_id);
CREATE INDEX idx_payouts_period ON payouts(year, month);
CREATE INDEX idx_payouts_status ON payouts(status);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_monthly_bills_updated_at
  BEFORE UPDATE ON monthly_bills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE monthly_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Monthly bills policies
CREATE POLICY "Hotels can view own bills" ON monthly_bills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hotels
      WHERE hotels.id = monthly_bills.hotel_id
      -- TODO: link hotels to profiles
      AND true
    )
  );

CREATE POLICY "Admins can manage all bills" ON monthly_bills
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Payouts policies
CREATE POLICY "Staff can view own payouts" ON payouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = payouts.staff_id
      AND staff.profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all payouts" ON payouts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ============================================
-- GRANTS
-- ============================================

GRANT SELECT ON monthly_bills TO authenticated;
GRANT SELECT ON payouts TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE monthly_bills IS 'Monthly bills for hotel partners';
COMMENT ON TABLE payouts IS 'Monthly payouts for service providers';
