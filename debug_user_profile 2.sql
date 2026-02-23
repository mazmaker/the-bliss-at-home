-- Debug: Check current user profile and role
SELECT
  p.id as profile_id,
  p.role,
  p.first_name,
  p.last_name,
  p.email,
  h.id as hotel_id,
  h.name as hotel_name
FROM profiles p
LEFT JOIN hotels h ON h.profile_id = p.id
WHERE p.id = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3';

-- Also check if this user has hotel association
SELECT * FROM hotels WHERE profile_id = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3';