-- Migration: Fix staff_skills RLS policies
-- Problem: Staff users cannot INSERT/UPDATE/DELETE their own skills
-- Root cause: Only SELECT and Admin FOR ALL policies existed, missing per-operation policies for Staff
-- Applied manually to production on 2026-03-23

-- Add INSERT policy for staff
CREATE POLICY "Staff can insert own skills" ON staff_skills
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.id = staff_skills.staff_id
      AND s.profile_id = auth.uid()
    )
  );

-- Add UPDATE policy for staff (needs both USING and WITH CHECK)
CREATE POLICY "Staff can update own skills" ON staff_skills
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.id = staff_skills.staff_id
      AND s.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.id = staff_skills.staff_id
      AND s.profile_id = auth.uid()
    )
  );

-- Add DELETE policy for staff
CREATE POLICY "Staff can delete own skills" ON staff_skills
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.id = staff_skills.staff_id
      AND s.profile_id = auth.uid()
    )
  );
