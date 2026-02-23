-- Migration: Fix staff_skills RLS Policies
-- Description: Replace FOR ALL policies with explicit operation policies
-- Date: 2026-02-11
-- Issue: staff_skills policies use FOR ALL with only USING clause, missing WITH CHECK
--        This causes issues with INSERT operations (409 Conflict errors)

-- ============================================
-- DROP OLD POLICIES
-- ============================================

DROP POLICY IF EXISTS "Staff can manage own skills" ON staff_skills;
DROP POLICY IF EXISTS "Admins can manage staff skills" ON staff_skills;

-- ============================================
-- CREATE NEW EXPLICIT POLICIES
-- ============================================

-- Staff can view own skills
CREATE POLICY "Staff can view own skills" ON staff_skills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = staff_skills.staff_id
      AND staff.profile_id = auth.uid()
    )
  );

-- Staff can insert own skills
CREATE POLICY "Staff can insert own skills" ON staff_skills
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = staff_skills.staff_id
      AND staff.profile_id = auth.uid()
    )
  );

-- Staff can update own skills
CREATE POLICY "Staff can update own skills" ON staff_skills
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = staff_skills.staff_id
      AND staff.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = staff_skills.staff_id
      AND staff.profile_id = auth.uid()
    )
  );

-- Staff can delete own skills
CREATE POLICY "Staff can delete own skills" ON staff_skills
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = staff_skills.staff_id
      AND staff.profile_id = auth.uid()
    )
  );

-- Admins can view all staff skills
CREATE POLICY "Admins can view all staff skills" ON staff_skills
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Admins can insert staff skills
CREATE POLICY "Admins can insert staff skills" ON staff_skills
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Admins can update staff skills
CREATE POLICY "Admins can update staff skills" ON staff_skills
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Admins can delete staff skills
CREATE POLICY "Admins can delete staff skills" ON staff_skills
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE staff_skills IS 'Staff skills with proper RLS policies for INSERT/UPDATE/DELETE operations';
