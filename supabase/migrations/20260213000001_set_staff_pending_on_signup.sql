-- Migration: Set staff status to 'pending' on signup
-- Description: Update trigger to set staff.status='pending' instead of 'active' for new staff registrations
-- This requires admin approval before staff can start working
-- Version: 20260213000000

-- ============================================
-- Update handle_new_staff_profile() trigger function
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_staff_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create staff record if role is STAFF
  IF NEW.role = 'STAFF' THEN
    -- Create staff record with basic info from profile
    INSERT INTO public.staff (
      profile_id,
      name_th,
      name_en,
      phone,
      avatar_url,
      status,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.full_name, 'Staff'),  -- Use full_name as name_th
      COALESCE(NEW.full_name, 'Staff'),  -- Use full_name as name_en
      COALESCE(NEW.phone, '0000000000'), -- Placeholder phone (can be updated later)
      NEW.avatar_url,
      'pending'::staff_status,           -- *** CHANGED: Set as pending for admin approval ***
      NOW(),
      NOW()
    )
    -- If staff record already exists (shouldn't happen), ignore
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_staff_profile() IS 'Auto-create staff record with pending status when profile with STAFF role is created';

-- ============================================
-- Update existing staff records that are 'active' but shouldn't be
-- (Optional: Only run if you want to reset existing staff to pending)
-- ============================================

-- Uncomment the following block if you want to reset ALL existing staff to 'pending'
-- so they need to be re-approved by admin:

/*
UPDATE public.staff
SET
  status = 'pending'::staff_status,
  updated_at = NOW()
WHERE
  status = 'active'::staff_status
  -- Add additional conditions here if you want to be more selective
  -- For example, only reset staff created after a certain date
  -- AND created_at > '2026-02-12'
;
*/

-- Log the change
DO $$
BEGIN
  RAISE NOTICE 'Updated handle_new_staff_profile() trigger: new staff will be created with status=pending';
END $$;
