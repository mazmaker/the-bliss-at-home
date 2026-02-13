-- Migration: Fix Staff Table and Staff Skills RLS
-- Description: Enable staff to read own staff record and manage own skills
-- Date: 2026-02-11 12:00:00
-- Issue: staff_skills operations fail because staff can't read their own staff record

-- ============================================
-- STAFF TABLE RLS
-- ============================================

-- Enable RLS on staff table (idempotent)
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Drop old policy if exists, then create new one
DROP POLICY IF EXISTS "Staff can view their own record" ON staff;
CREATE POLICY "Staff can view their own record" ON staff
  FOR SELECT USING (profile_id = auth.uid());

-- ============================================
-- STAFF_SKILLS TABLE RLS
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Staff can manage own skills" ON staff_skills;
DROP POLICY IF EXISTS "Staff can view own skills" ON staff_skills;
DROP POLICY IF EXISTS "Staff can insert own skills" ON staff_skills;
DROP POLICY IF EXISTS "Staff can update own skills" ON staff_skills;
DROP POLICY IF EXISTS "Staff can delete own skills" ON staff_skills;

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
