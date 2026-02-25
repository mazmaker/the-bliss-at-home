-- Fix admin user roles in profiles table
-- The handle_new_user() trigger doesn't set the role, so admin users created via migration have role='CUSTOMER'
-- This migration updates the role to 'ADMIN' for known admin users

-- Update admin2@theblissathome.com to have ADMIN role
UPDATE public.profiles
SET role = 'ADMIN'
WHERE email = 'admin2@theblissathome.com';

-- Update any other admin users if they exist
UPDATE public.profiles
SET role = 'ADMIN'
WHERE email IN (
  'admin@theblissathome.com',
  'admin1@theblissathome.com'
);

-- Log the results
DO $$
DECLARE
  admin_count INT;
BEGIN
  SELECT COUNT(*) INTO admin_count
  FROM public.profiles
  WHERE role = 'ADMIN';

  RAISE NOTICE 'Total admin users in profiles table: %', admin_count;
END $$;
