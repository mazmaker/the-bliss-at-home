-- 🏨 SCALABLE HOTEL ONBOARDING SYSTEM
-- รองรับการเพิ่มโรงแรมใหม่อัตโนมัติ
-- Date: 2026-02-20
-- Run this in: Supabase Dashboard > SQL Editor

-- =============================================================================
-- 🎯 GOAL: เมื่อ Admin เพิ่มโรงแรมใหม่ → ระบบสร้าง Hotel User Account อัตโนมัติ
-- =============================================================================

-- ✅ STEP 1: Create hotel_invitations table
CREATE TABLE IF NOT EXISTS hotel_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invitation_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'expired')),
  invited_by UUID REFERENCES profiles(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_hotel_invitations_hotel_id ON hotel_invitations(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_invitations_token ON hotel_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_hotel_invitations_email ON hotel_invitations(email);

-- Add RLS policies
ALTER TABLE hotel_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all hotel invitations" ON hotel_invitations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'ADMIN'
  )
);

CREATE POLICY "Hotels can view their own invitations" ON hotel_invitations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'HOTEL'
    AND profiles.hotel_id = hotel_invitations.hotel_id
  )
);

-- ✅ STEP 2: Create function to auto-generate hotel credentials
CREATE OR REPLACE FUNCTION generate_hotel_credentials(
  p_hotel_name TEXT,
  p_hotel_slug TEXT
) RETURNS TABLE(
  suggested_email TEXT,
  suggested_username TEXT,
  temp_password TEXT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    LOWER(p_hotel_slug) || '@theblissathome.com' as suggested_email,
    LOWER(p_hotel_slug) as suggested_username,
    'Hotel' || UPPER(LEFT(p_hotel_slug, 1)) || SUBSTRING(p_hotel_slug, 2) || '2026!' as temp_password;
END;
$$;

-- ✅ STEP 3: Create function to auto-create hotel user when hotel is created
CREATE OR REPLACE FUNCTION auto_create_hotel_user()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_suggested_email TEXT;
  v_temp_password TEXT;
  v_invitation_id UUID;
BEGIN
  -- Only process active hotels
  IF NEW.status = 'active' THEN

    -- Generate credentials
    SELECT suggested_email, temp_password
    INTO v_suggested_email, v_temp_password
    FROM generate_hotel_credentials(NEW.name_th, NEW.hotel_slug);

    -- Create invitation record
    INSERT INTO hotel_invitations (
      hotel_id,
      email,
      status,
      invited_by
    )
    VALUES (
      NEW.id,
      v_suggested_email,
      'pending',
      auth.uid()  -- Current admin user
    )
    RETURNING id INTO v_invitation_id;

    -- Log the action
    RAISE NOTICE 'Auto-created hotel invitation for % (%) with email %',
                 NEW.name_th, NEW.hotel_slug, v_suggested_email;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for auto hotel user creation
DROP TRIGGER IF EXISTS trigger_auto_create_hotel_user ON hotels;
CREATE TRIGGER trigger_auto_create_hotel_user
  AFTER INSERT OR UPDATE OF status ON hotels
  FOR EACH ROW
  WHEN (NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active'))
  EXECUTE FUNCTION auto_create_hotel_user();

-- ✅ STEP 4: Create function to process hotel invitation acceptance
CREATE OR REPLACE FUNCTION accept_hotel_invitation(
  p_invitation_token TEXT,
  p_user_id UUID
) RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  hotel_id UUID
) LANGUAGE plpgsql AS $$
DECLARE
  v_invitation hotel_invitations%ROWTYPE;
  v_hotel hotels%ROWTYPE;
BEGIN
  -- Get invitation
  SELECT * INTO v_invitation
  FROM hotel_invitations
  WHERE invitation_token = p_invitation_token
    AND status = 'pending'
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired invitation token', NULL::UUID;
    RETURN;
  END IF;

  -- Get hotel info
  SELECT * INTO v_hotel
  FROM hotels
  WHERE id = v_invitation.hotel_id;

  -- Update user profile to map to hotel
  UPDATE profiles
  SET
    hotel_id = v_invitation.hotel_id,
    role = 'HOTEL',
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Mark invitation as accepted
  UPDATE hotel_invitations
  SET
    status = 'accepted',
    accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = v_invitation.id;

  RETURN QUERY SELECT TRUE,
                     'Successfully joined ' || v_hotel.name_th,
                     v_hotel.id;
END;
$$;

-- ✅ STEP 5: Create function to get hotel onboarding status
CREATE OR REPLACE FUNCTION get_hotel_onboarding_status()
RETURNS TABLE(
  hotel_id UUID,
  hotel_name TEXT,
  hotel_slug TEXT,
  hotel_status TEXT,
  invitation_id UUID,
  invitation_email TEXT,
  invitation_status TEXT,
  invited_at TIMESTAMP WITH TIME ZONE,
  has_active_user BOOLEAN,
  user_email TEXT,
  user_last_login TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id as hotel_id,
    h.name_th as hotel_name,
    h.hotel_slug,
    h.status as hotel_status,
    hi.id as invitation_id,
    hi.email as invitation_email,
    hi.status as invitation_status,
    hi.invited_at,
    (p.id IS NOT NULL) as has_active_user,
    p.email as user_email,
    p.updated_at as user_last_login
  FROM hotels h
  LEFT JOIN hotel_invitations hi ON h.id = hi.hotel_id
  LEFT JOIN profiles p ON p.hotel_id = h.id AND p.role = 'HOTEL'
  WHERE h.status IN ('active', 'pending')
  ORDER BY h.created_at DESC, hi.invited_at DESC;
END;
$$;

-- ✅ STEP 6: Create function to resend hotel invitation
CREATE OR REPLACE FUNCTION resend_hotel_invitation(
  p_hotel_id UUID,
  p_new_email TEXT DEFAULT NULL
) RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  invitation_token TEXT
) LANGUAGE plpgsql AS $$
DECLARE
  v_hotel hotels%ROWTYPE;
  v_email TEXT;
  v_new_token TEXT;
BEGIN
  -- Get hotel info
  SELECT * INTO v_hotel FROM hotels WHERE id = p_hotel_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Hotel not found', NULL::TEXT;
    RETURN;
  END IF;

  -- Use provided email or generate default
  v_email := COALESCE(p_new_email, LOWER(v_hotel.hotel_slug) || '@theblissathome.com');

  -- Generate new token
  v_new_token := encode(gen_random_bytes(32), 'hex');

  -- Update existing invitation or create new one
  INSERT INTO hotel_invitations (hotel_id, email, invitation_token, invited_by)
  VALUES (p_hotel_id, v_email, v_new_token, auth.uid())
  ON CONFLICT (hotel_id, email) DO UPDATE SET
    invitation_token = v_new_token,
    status = 'pending',
    invited_at = NOW(),
    expires_at = NOW() + INTERVAL '7 days';

  RETURN QUERY SELECT TRUE,
                     'Invitation sent to ' || v_email,
                     v_new_token;
END;
$$;

-- ✅ STEP 7: View for admin dashboard
CREATE OR REPLACE VIEW admin_hotel_overview AS
SELECT
  h.id,
  h.name_th,
  h.name_en,
  h.hotel_slug,
  h.status,
  h.created_at,
  -- Invitation info
  hi.email as invitation_email,
  hi.status as invitation_status,
  hi.invited_at,
  hi.expires_at,
  -- User info
  p.email as user_email,
  p.full_name as user_full_name,
  p.updated_at as user_last_active,
  -- Metrics
  (SELECT COUNT(*) FROM bookings WHERE hotel_id = h.id) as total_bookings,
  -- Status summary
  CASE
    WHEN p.id IS NOT NULL THEN '✅ Active User'
    WHEN hi.status = 'pending' AND hi.expires_at > NOW() THEN '📧 Invitation Sent'
    WHEN hi.status = 'expired' OR hi.expires_at <= NOW() THEN '⏰ Invitation Expired'
    WHEN h.status = 'pending' THEN '⏳ Hotel Pending Approval'
    ELSE '❌ No User Setup'
  END as onboarding_status
FROM hotels h
LEFT JOIN hotel_invitations hi ON h.id = hi.hotel_id
LEFT JOIN profiles p ON p.hotel_id = h.id AND p.role = 'HOTEL'
ORDER BY h.created_at DESC;

-- ✅ STEP 8: Test the system with existing hotels
SELECT
  '🧪 TESTING AUTO HOTEL USER CREATION' as test_status,
  'Processing existing hotels...' as description;

-- Create invitations for existing active hotels without users
INSERT INTO hotel_invitations (hotel_id, email, invited_by, status)
SELECT
  h.id,
  LOWER(h.hotel_slug) || '@theblissathome.com',
  (SELECT id FROM profiles WHERE role = 'ADMIN' LIMIT 1),
  'pending'
FROM hotels h
LEFT JOIN profiles p ON p.hotel_id = h.id AND p.role = 'HOTEL'
WHERE h.status = 'active'
  AND p.id IS NULL  -- No existing user
  AND NOT EXISTS (  -- No existing invitation
    SELECT 1 FROM hotel_invitations
    WHERE hotel_id = h.id
  );

-- ✅ STEP 9: Show current onboarding status
SELECT * FROM admin_hotel_overview;

-- ✅ SUCCESS MESSAGE
SELECT
  '🎉 SCALABLE HOTEL SYSTEM CREATED!' as message,
  'System now supports unlimited hotel growth' as description,
  'Admins can easily onboard new hotels with automated invitations' as benefit;