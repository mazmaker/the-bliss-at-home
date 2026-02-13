-- Fix: Two issues with handle_new_user() and handle_new_staff_profile()
--
-- 1. Variable name 'user_role' collides with type name 'user_role' in PL/pgSQL
-- 2. supabase_auth_admin has search_path=auth (no public), so types like
--    user_role, user_status, staff_status cannot be found without qualification
--
-- Solution: Use fully qualified type names (public.user_role) and
-- set search_path = public, auth on both functions

-- Fix handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_role public.user_role;
BEGIN
  -- Get role from metadata, default to CUSTOMER if not specified
  v_user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::public.user_role,
    'CUSTOMER'::public.user_role
  );

  -- Create profile with role from metadata
  INSERT INTO public.profiles (id, email, full_name, role, avatar_url, status, language, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_user_role,
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE((NEW.raw_user_meta_data->>'status')::public.user_status, 'ACTIVE'::public.user_status),
    COALESCE(NEW.raw_user_meta_data->>'language', 'th'),
    NEW.raw_user_meta_data->>'phone'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Fix handle_new_staff_profile
CREATE OR REPLACE FUNCTION public.handle_new_staff_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_invite_staff_id UUID;
  v_rows_updated INTEGER;
BEGIN
  IF NEW.role = 'STAFF' THEN
    -- Check if this signup includes an invite_staff_id in user metadata
    SELECT (raw_user_meta_data->>'invite_staff_id')::UUID
    INTO v_invite_staff_id
    FROM auth.users
    WHERE id = NEW.id;

    IF v_invite_staff_id IS NOT NULL THEN
      -- Invited staff: Link existing admin-created record to this profile
      UPDATE public.staff
      SET
        profile_id = NEW.id,
        avatar_url = COALESCE(NEW.avatar_url, avatar_url),
        invite_token = NULL,
        invite_token_expires_at = NULL,
        updated_at = NOW()
      WHERE id = v_invite_staff_id
        AND profile_id IS NULL;

      GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

      IF v_rows_updated > 0 THEN
        RETURN NEW;
      END IF;
    END IF;

    -- No invite or invite link failed: create new staff record (self-signup)
    INSERT INTO public.staff (
      profile_id, name_th, name_en, phone, avatar_url, status, created_at, updated_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.full_name, 'Staff'),
      COALESCE(NEW.full_name, 'Staff'),
      COALESCE(NEW.phone, '0000000000'),
      NEW.avatar_url,
      'pending'::public.staff_status,
      NOW(), NOW()
    )
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
