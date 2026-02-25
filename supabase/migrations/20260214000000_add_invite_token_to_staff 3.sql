-- Migration: Add invite token to staff + update trigger to support invite linking
-- Description: When admin creates a staff record and sends invite link, the staff member
--   can login via LINE and get linked to the existing record (instead of creating duplicate)
-- Version: 20260214000000

-- ============================================
-- STEP 1: Add invite_token columns to staff table
-- ============================================

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_token_expires_at TIMESTAMPTZ;

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_staff_invite_token
  ON public.staff(invite_token)
  WHERE invite_token IS NOT NULL;

-- ============================================
-- STEP 2: RLS policy for invite token validation
-- Staff app needs to validate token before login (anonymous access)
-- ============================================

CREATE POLICY "Anyone can validate invite token"
  ON public.staff
  FOR SELECT
  USING (
    invite_token IS NOT NULL
    AND profile_id IS NULL
  );

-- ============================================
-- STEP 3: Update handle_new_staff_profile() trigger
-- Now checks for invite_staff_id in user metadata to link existing record
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_staff_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_invite_staff_id UUID;
  v_rows_updated INTEGER;
BEGIN
  -- Only process if role is STAFF
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
        -- Successfully linked, skip creating new record
        RETURN NEW;
      END IF;
      -- If update failed (record not found or already linked), fall through to create new
    END IF;

    -- No invite or invite link failed: create new staff record (self-signup flow)
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
      COALESCE(NEW.full_name, 'Staff'),
      COALESCE(NEW.full_name, 'Staff'),
      COALESCE(NEW.phone, '0000000000'),
      NEW.avatar_url,
      'pending'::staff_status,
      NOW(),
      NOW()
    )
    ON CONFLICT (profile_id) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_staff_profile() IS 'Auto-create or link staff record when profile with STAFF role is created. Supports invite linking via invite_staff_id in user metadata.';

-- ============================================
-- STEP 4: RLS policy for invite self-linking
-- Allows authenticated user to update staff record to link themselves via invite
-- ============================================

CREATE POLICY "Staff can link themselves via invite"
  ON public.staff FOR UPDATE
  TO authenticated
  USING (
    invite_token IS NOT NULL
    AND profile_id IS NULL
  )
  WITH CHECK (
    invite_token IS NULL
    AND profile_id = auth.uid()
  );

-- ============================================
-- STEP 5: RLS policy for deleting self-signup duplicate
-- When existing user gets an invite, they may already have a trigger-created staff record.
-- This policy allows them to delete their own staff record so it can be replaced
-- by the admin-created invite record.
-- ============================================

CREATE POLICY "Staff can delete own record for invite linking"
  ON public.staff FOR DELETE
  TO authenticated
  USING (
    profile_id = auth.uid()
  );

-- Log
DO $$
BEGIN
  RAISE NOTICE 'Added invite_token to staff table, updated triggers, and added invite/delete RLS policies';
END $$;
