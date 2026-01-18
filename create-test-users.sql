-- ============================================
-- CREATE TEST USERS FOR THE BLISS AT HOME
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- 1. ADMIN USER
-- Email: admin@bliss.test
-- Password: Admin123!

DO $$
DECLARE
  admin_id uuid;
BEGIN
  INSERT INTO auth.users (instance_id, id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'admin@bliss.test',
    crypt('Admin123!', gen_salt('bf')),
    now(),
    '{"full_name": "Admin User", "role": "ADMIN"}'::jsonb,
    now(),
    now()
  )
  RETURNING id INTO admin_id;

  INSERT INTO profiles (id, email, full_name, role, status, phone, language, created_at, updated_at)
  VALUES (
    admin_id,
    'admin@bliss.test',
    'Admin User',
    'ADMIN'::user_role,
    'ACTIVE'::user_status,
    '+66812345678',
    'th',
    now(),
    now()
  );
END $$;

-- 2. CUSTOMER USER
-- Email: customer@bliss.test
-- Password: Customer123!

DO $$
DECLARE
  customer_id uuid;
BEGIN
  INSERT INTO auth.users (instance_id, id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'customer@bliss.test',
    crypt('Customer123!', gen_salt('bf')),
    now(),
    '{"full_name": "Customer User", "role": "CUSTOMER"}'::jsonb,
    now(),
    now()
  )
  RETURNING id INTO customer_id;

  INSERT INTO profiles (id, email, full_name, role, status, phone, language, created_at, updated_at)
  VALUES (
    customer_id,
    'customer@bliss.test',
    'Customer User',
    'CUSTOMER'::user_role,
    'ACTIVE'::user_status,
    '+66823456789',
    'th',
    now(),
    now()
  );
END $$;

-- 3. HOTEL USER
-- Email: hotel@bliss.test
-- Password: Hotel123!

DO $$
DECLARE
  hotel_id uuid;
BEGIN
  INSERT INTO auth.users (instance_id, id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'hotel@bliss.test',
    crypt('Hotel123!', gen_salt('bf')),
    now(),
    '{"full_name": "Hotel Manager", "role": "HOTEL"}'::jsonb,
    now(),
    now()
  )
  RETURNING id INTO hotel_id;

  INSERT INTO profiles (id, email, full_name, role, status, phone, language, created_at, updated_at)
  VALUES (
    hotel_id,
    'hotel@bliss.test',
    'Hotel Manager',
    'HOTEL'::user_role,
    'ACTIVE'::user_status,
    '+66834567890',
    'th',
    now(),
    now()
  );
END $$;

-- 4. STAFF USER
-- Email: staff@bliss.test
-- Password: Staff123!

DO $$
DECLARE
  staff_id uuid;
BEGIN
  INSERT INTO auth.users (instance_id, id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'staff@bliss.test',
    crypt('Staff123!', gen_salt('bf')),
    now(),
    '{"full_name": "Staff User", "role": "STAFF"}'::jsonb,
    now(),
    now()
  )
  RETURNING id INTO staff_id;

  INSERT INTO profiles (id, email, full_name, role, status, phone, language, created_at, updated_at)
  VALUES (
    staff_id,
    'staff@bliss.test',
    'Staff User',
    'STAFF'::user_role,
    'ACTIVE'::user_status,
    '+66845678901',
    'th',
    now(),
    now()
  );
END $$;

-- ============================================
-- VERIFY USERS CREATED
-- ============================================
SELECT email, full_name, role, status, phone
FROM profiles
WHERE email LIKE '%@bliss.test'
ORDER BY role;
