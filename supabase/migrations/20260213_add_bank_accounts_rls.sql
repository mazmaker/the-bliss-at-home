-- Enable RLS on bank_accounts table
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Staff can view own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Staff can insert own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Staff can update own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Staff can delete own bank accounts" ON bank_accounts;
DROP POLICY IF EXISTS "Admins can manage all bank accounts" ON bank_accounts;

-- Staff can view their own bank accounts
CREATE POLICY "Staff can view own bank accounts" ON bank_accounts
  FOR SELECT USING (
    staff_id IN (
      SELECT id FROM staff WHERE profile_id = auth.uid()
    )
  );

-- Staff can insert their own bank accounts
CREATE POLICY "Staff can insert own bank accounts" ON bank_accounts
  FOR INSERT WITH CHECK (
    staff_id IN (
      SELECT id FROM staff WHERE profile_id = auth.uid()
    )
  );

-- Staff can update their own bank accounts
CREATE POLICY "Staff can update own bank accounts" ON bank_accounts
  FOR UPDATE USING (
    staff_id IN (
      SELECT id FROM staff WHERE profile_id = auth.uid()
    )
  ) WITH CHECK (
    staff_id IN (
      SELECT id FROM staff WHERE profile_id = auth.uid()
    )
  );

-- Staff can delete their own bank accounts
CREATE POLICY "Staff can delete own bank accounts" ON bank_accounts
  FOR DELETE USING (
    staff_id IN (
      SELECT id FROM staff WHERE profile_id = auth.uid()
    )
  );

-- Admins can manage all bank accounts
CREATE POLICY "Admins can manage all bank accounts" ON bank_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
