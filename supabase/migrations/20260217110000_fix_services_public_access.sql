-- Migration: Fix Services Public Access
-- Description: Allow public access to services table for Hotel App
-- Version: 20260217110000

-- ============================================
-- REMOVE OLD CONFLICTING POLICIES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view services" ON services;
DROP POLICY IF EXISTS "Anyone can view active services" ON services;
DROP POLICY IF EXISTS "Public can view services" ON services;
DROP POLICY IF EXISTS "Authenticated can view services" ON services;

-- ============================================
-- CREATE NEW PUBLIC ACCESS POLICY
-- ============================================

CREATE POLICY "Public can view services" ON services
  FOR SELECT USING (true);

-- ============================================
-- VERIFY GRANTS
-- ============================================

GRANT SELECT ON services TO anon, authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Public can view services" ON services
  IS 'Allows public read access to services for Hotel App booking forms';