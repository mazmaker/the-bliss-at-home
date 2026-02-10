-- Create admin2@theblissathome.com user for Real Supabase Auth
-- This migration creates the user directly in auth.users table

DO $$
DECLARE
  user_id UUID := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeef'::uuid;
  user_email TEXT := 'admin2@theblissathome.com';
  user_password TEXT := 'AdminBliss2026!';
BEGIN
  -- Insert into auth.users if not exists
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  SELECT
    '00000000-0000-0000-0000-000000000000'::uuid,
    user_id,
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    NOW(),
    NULL,
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = user_email
  );

  -- Insert into auth.identities if not exists
  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at,
    id
  )
  SELECT
    user_id::text,
    user_id,
    format('{"sub":"%s","email":"%s"}', user_id::text, user_email)::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW(),
    user_id::text
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = user_id AND provider = 'email'
  );

  -- Insert into admin_profiles if not exists
  INSERT INTO admin_profiles (
    id,
    full_name,
    email,
    phone,
    avatar_url,
    role,
    status,
    language,
    created_at,
    updated_at
  )
  SELECT
    user_id,
    'ผู้ดูแลระบบ 2',
    user_email,
    '0812345679',
    NULL,
    'ADMIN',
    'ACTIVE',
    'th',
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM admin_profiles WHERE id = user_id
  );

  RAISE NOTICE 'Created/verified admin user: % with password: %', user_email, user_password;
END $$;