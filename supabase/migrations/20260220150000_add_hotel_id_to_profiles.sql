-- Add hotel_id column to profiles table for proper hotel-user mapping
-- Date: 2026-02-20

-- 1. Add hotel_id column to profiles table
ALTER TABLE profiles
ADD COLUMN hotel_id UUID REFERENCES hotels(id);

-- 2. Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_hotel_id ON profiles(hotel_id);

-- 3. Add comment for documentation
COMMENT ON COLUMN profiles.hotel_id IS 'Foreign key reference to hotels table - maps users to their hotel';

-- 4. Map existing hotel users to their correct hotels
-- Map info@dusit.com to Dusit Thani Bangkok
UPDATE profiles
SET hotel_id = '550e8400-e29b-41d4-a716-446655440003'
WHERE email = 'info@dusit.com' AND role = 'HOTEL';

-- Map reservations@hilton.com to Hilton Bangkok (Grand Palace)
UPDATE profiles
SET hotel_id = '550e8400-e29b-41d4-a716-446655440001'
WHERE email = 'reservations@hilton.com' AND role = 'HOTEL';

-- Map sweettuay emails to Nimman Resort (Chiang Mai)
UPDATE profiles
SET hotel_id = '550e8400-e29b-41d4-a716-446655440002'
WHERE email IN ('sweettuay.bt@gmail.com', 'isweettuay.bt@gmail.com') AND role = 'HOTEL';

-- Map test hotel user to Test Hotel Bangkok
UPDATE profiles
SET hotel_id = '3082d55a-b185-49b9-b4fc-01c00d61e7e1'
WHERE email = 'test-hotel@thebliss.com' AND role = 'HOTEL';

-- Map ireservations@hilton.com to Hilton Bangkok as well
UPDATE profiles
SET hotel_id = '550e8400-e29b-41d4-a716-446655440001'
WHERE email = 'ireservations@hilton.com' AND role = 'HOTEL';

-- 5. Verify the mappings
SELECT
  '✅ HOTEL USER MAPPINGS' as status,
  p.email,
  p.role,
  p.hotel_id,
  h.name_th as hotel_name,
  h.hotel_slug
FROM profiles p
LEFT JOIN hotels h ON p.hotel_id = h.id
WHERE p.role = 'HOTEL'
ORDER BY h.name_th, p.email;