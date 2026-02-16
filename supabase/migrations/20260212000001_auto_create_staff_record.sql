-- Migration: Auto-create staff record for STAFF role users
-- Description: Fix trigger to read role from metadata and auto-create staff record
-- Version: 20260212000000

-- ============================================
-- STEP 1: Update handle_new_user() trigger to read role from metadata
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role user_role;
BEGIN
  -- Get role from metadata, default to CUSTOMER if not specified
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::user_role,
    'CUSTOMER'::user_role
  );

  -- Create profile with role from metadata
  INSERT INTO public.profiles (id, email, full_name, role, avatar_url, status, language)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    user_role,
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE((NEW.raw_user_meta_data->>'status')::user_status, 'ACTIVE'::user_status),
    COALESCE(NEW.raw_user_meta_data->>'language', 'th')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-create profile on user signup, reading role and other fields from metadata';

-- ============================================
-- STEP 2: Create trigger to auto-create staff record for STAFF role
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
      'active'::staff_status,            -- Set as active by default for LINE login
      NOW(),
      NOW()
    )
    -- If staff record already exists (shouldn't happen), ignore
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles INSERT
CREATE TRIGGER on_staff_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_staff_profile();

COMMENT ON FUNCTION public.handle_new_staff_profile() IS 'Auto-create staff record when profile with STAFF role is created';
COMMENT ON TRIGGER on_staff_profile_created ON public.profiles IS 'Trigger to auto-create staff record for STAFF role users';

-- ============================================
-- STEP 3: Create staff records for existing STAFF profiles
-- ============================================

-- Find all STAFF profiles without staff records and create them
INSERT INTO public.staff (
  profile_id,
  name_th,
  name_en,
  phone,
  avatar_url,
  status,
  created_at,
  updated_at
)
SELECT
  p.id,
  COALESCE(p.full_name, 'Staff'),
  COALESCE(p.full_name, 'Staff'),
  COALESCE(p.phone, '0000000000'),
  p.avatar_url,
  'active'::staff_status,
  p.created_at,
  NOW()
FROM public.profiles p
LEFT JOIN public.staff s ON s.profile_id = p.id
WHERE
  p.role = 'STAFF'
  AND s.id IS NULL  -- Only create if staff record doesn't exist
ON CONFLICT (profile_id) DO NOTHING;

-- Log how many staff records were created
DO $$
DECLARE
  created_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO created_count
  FROM public.profiles p
  INNER JOIN public.staff s ON s.profile_id = p.id
  WHERE p.role = 'STAFF';

  RAISE NOTICE 'Auto-created staff records. Total STAFF profiles with staff records: %', created_count;
END $$;
