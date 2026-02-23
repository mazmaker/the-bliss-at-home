-- 🔧 Add missing hotels.settings column
-- Fix: column hotels.settings does not exist

-- Add settings column to hotels table
ALTER TABLE hotels
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN hotels.settings IS 'Hotel-specific settings and configuration options';

-- Create index for better performance on settings queries
CREATE INDEX IF NOT EXISTS idx_hotels_settings ON hotels USING GIN (settings);

-- Add some default settings for existing hotels
UPDATE hotels
SET settings = jsonb_build_object(
  'discount_rate', 15,
  'commission_rate', 20,
  'auto_assign', true,
  'notifications', true
)
WHERE settings = '{}'::jsonb OR settings IS NULL;

-- Verify the fix
SELECT
  '✅ HOTELS SETTINGS FIXED!' as status,
  name_th,
  hotel_slug,
  settings
FROM hotels
ORDER BY name_th;