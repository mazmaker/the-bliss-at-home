-- 🚀 STEP 2: Create Auto Hotel User Creation System
-- Execute this in Supabase Dashboard > SQL Editor
-- AFTER running CREATE-HOTEL-INVITATIONS-TABLE.sql first

-- ✅ Function 1: Generate hotel credentials
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

-- ✅ Function 2: Auto-create hotel user trigger function
CREATE OR REPLACE FUNCTION auto_create_hotel_user()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_suggested_email TEXT;
  v_temp_password TEXT;
  v_invitation_id UUID;
BEGIN
  -- Only process active hotels with hotel_slug
  IF NEW.status = 'active' AND NEW.hotel_slug IS NOT NULL THEN

    -- Generate credentials
    SELECT suggested_email, temp_password
    INTO v_suggested_email, v_temp_password
    FROM generate_hotel_credentials(NEW.name_th, NEW.hotel_slug);

    -- Create invitation record (only if doesn't exist)
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
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_invitation_id;

    -- Log the action
    RAISE NOTICE 'Auto-created hotel invitation for % (%) with email %',
                 NEW.name_th, NEW.hotel_slug, v_suggested_email;
  END IF;

  RETURN NEW;
END;
$$;

-- ✅ Function 3: Accept hotel invitation
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

-- ✅ Function 4: Get hotel onboarding status
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

-- ✅ Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_create_hotel_user ON hotels;

-- ✅ Create trigger for auto hotel user creation
CREATE TRIGGER trigger_auto_create_hotel_user
  AFTER INSERT OR UPDATE OF status ON hotels
  FOR EACH ROW
  WHEN (NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active'))
  EXECUTE FUNCTION auto_create_hotel_user();

-- ✅ Test the system
SELECT
  '🎉 Hotel Auto-Creation System Created Successfully!' as result,
  'Functions and triggers are now active' as status;

-- ✅ Show current active hotels
SELECT
  h.name_th,
  h.hotel_slug,
  h.status,
  CASE
    WHEN hi.id IS NOT NULL THEN 'Has Invitation'
    ELSE 'No Invitation'
  END as invitation_status
FROM hotels h
LEFT JOIN hotel_invitations hi ON h.id = hi.hotel_id
WHERE h.status = 'active'
ORDER BY h.name_th;