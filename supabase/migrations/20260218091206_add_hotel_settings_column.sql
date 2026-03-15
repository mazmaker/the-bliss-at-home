-- Add settings column to hotels table
-- This column will store hotel-specific configuration settings as JSONB

-- Add settings column to hotels table
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Add comment to describe the column
COMMENT ON COLUMN hotels.settings IS 'Hotel-specific configuration settings stored as JSONB';

-- Create index for better performance when querying settings
CREATE INDEX IF NOT EXISTS idx_hotels_settings ON hotels USING gin (settings);

-- Example of default settings structure (optional - for documentation)
-- {
--   "language": "th",
--   "emailNotifications": true,
--   "smsNotifications": false,
--   "autoConfirm": false,
--   "requireGuestInfo": true,
--   "defaultDuration": 60,
--   "theme": "minimal",
--   "currency": "THB"
-- }