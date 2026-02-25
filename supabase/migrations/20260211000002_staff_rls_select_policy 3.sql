-- Add RLS policy to allow staff to read their own record
-- This is needed for staff_skills operations

-- Enable RLS on staff table (if not already enabled)
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Create policy for staff to select their own record
CREATE POLICY "Staff can view their own record" ON staff
  FOR SELECT USING (
    profile_id = auth.uid()
  );
