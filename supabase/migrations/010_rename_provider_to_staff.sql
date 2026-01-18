-- Migration: Rename PROVIDER role to STAFF
-- Description: Update user_role enum from PROVIDER to STAFF
-- Version: 010

-- Step 1: Drop all policies that reference the role column (to be recreated later)
DROP POLICY IF EXISTS "Admins can manage services" ON services;
DROP POLICY IF EXISTS "Admins can manage service images" ON service_images;
DROP POLICY IF EXISTS "Admins can manage skills" ON skills;
DROP POLICY IF EXISTS "Admins can manage staff" ON staff;
DROP POLICY IF EXISTS "Admins can manage staff skills" ON staff_skills;
DROP POLICY IF EXISTS "Hotel staff can view their hotel" ON hotels;
DROP POLICY IF EXISTS "Admins can manage hotels" ON hotels;
DROP POLICY IF EXISTS "Admins can view all customers" ON customers;
DROP POLICY IF EXISTS "Admins can manage customers" ON customers;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can manage all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can manage reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can manage all notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can manage all bills" ON monthly_bills;
DROP POLICY IF EXISTS "Admins can manage all payouts" ON payouts;
DROP POLICY IF EXISTS "Admins can manage settings" ON settings;

-- Step 2: Drop profile policies that reference role
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Step 3: Create new enum type with STAFF instead of PROVIDER
CREATE TYPE user_role_new AS ENUM ('ADMIN', 'CUSTOMER', 'HOTEL', 'STAFF');

-- Step 4: Add a temporary column with the new enum type
ALTER TABLE profiles ADD COLUMN role_new user_role_new;

-- Step 5: Copy data from old column to new column (map PROVIDER to STAFF)
UPDATE profiles
SET role_new = CASE role
  WHEN 'ADMIN'::user_role THEN 'ADMIN'::user_role_new
  WHEN 'CUSTOMER'::user_role THEN 'CUSTOMER'::user_role_new
  WHEN 'HOTEL'::user_role THEN 'HOTEL'::user_role_new
  WHEN 'PROVIDER'::user_role THEN 'STAFF'::user_role_new
  ELSE 'CUSTOMER'::user_role_new
END;

-- Step 6: Make the new column NOT NULL
ALTER TABLE profiles ALTER COLUMN role_new SET NOT NULL;

-- Step 7: Drop old column and rename new one
ALTER TABLE profiles DROP COLUMN role;
ALTER TABLE profiles RENAME COLUMN role_new TO role;

-- Step 8: Drop old enum type
DROP TYPE user_role;

-- Step 9: Rename new enum to original name
ALTER TYPE user_role_new RENAME TO user_role;

-- Update comments
COMMENT ON COLUMN profiles.role IS 'User role: ADMIN, CUSTOMER, HOTEL, STAFF';

-- Step 10: Recreate profile policies
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Step 11: Recreate other admin policies (they will check role dynamically)
CREATE POLICY "Admins can manage services" ON services
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Admins can manage service images" ON service_images
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Admins can manage skills" ON skills
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Admins can manage staff" ON staff
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Admins can manage staff skills" ON staff_skills
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Admins can manage hotels" ON hotels
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Admins can view all customers" ON customers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Admins can manage customers" ON customers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Admins can view all bookings" ON bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Admins can manage all bookings" ON bookings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Admins can manage reviews" ON reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Admins can manage all notifications" ON notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Admins can manage all bills" ON monthly_bills
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Admins can manage all payouts" ON payouts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Admins can manage settings" ON settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Note: Hotel staff policy needs to be handled separately with proper hotel-profile linking
