-- Migration: Fix Customers Insert Policy
-- Description: Allow authenticated users to create their own customer record
-- Version: 020

-- ============================================
-- DROP EXISTING POLICIES (if any conflicts)
-- ============================================

DROP POLICY IF EXISTS "Customers can insert own data" ON customers;

-- ============================================
-- CREATE INSERT POLICY
-- ============================================

-- Allow authenticated users to insert their own customer record
CREATE POLICY "Customers can insert own data" ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

-- ============================================
-- GRANT INSERT PERMISSION
-- ============================================

GRANT INSERT ON customers TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Customers can insert own data" ON customers IS
  'Allow authenticated users to create their own customer record';
