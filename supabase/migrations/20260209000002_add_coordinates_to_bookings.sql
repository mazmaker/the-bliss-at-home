-- Add coordinates to all existing bookings
-- This migration adds mock coordinates for testing purposes

-- For hotel bookings, use approximate hotel locations in Bangkok
-- For non-hotel bookings, use default Bangkok coordinates

-- Update bookings with NULL coordinates to have default Bangkok coordinates
-- (Siam Paragon area as default)
UPDATE bookings
SET
  latitude = 13.746562,
  longitude = 100.534196
WHERE latitude IS NULL OR longitude IS NULL;

-- Optional: Add more specific coordinates based on hotel or address patterns
-- You can customize this based on actual hotel locations later

-- Add comment
COMMENT ON COLUMN bookings.latitude IS 'Latitude coordinate for service location';
COMMENT ON COLUMN bookings.longitude IS 'Longitude coordinate for service location';
