-- Add settings column to hotels table
ALTER TABLE hotels
ADD COLUMN settings JSONB DEFAULT '{
  "language": "th",
  "email_notifications": true,
  "sms_notifications": false,
  "auto_confirm": false,
  "require_guest_info": true,
  "default_duration": 60,
  "theme": "minimal",
  "currency": "THB"
}'::JSONB;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_hotels_settings_gin ON hotels USING GIN (settings);

-- Update existing hotels with default settings
UPDATE hotels
SET settings = '{
  "language": "th",
  "email_notifications": true,
  "sms_notifications": false,
  "auto_confirm": false,
  "require_guest_info": true,
  "default_duration": 60,
  "theme": "minimal",
  "currency": "THB"
}'::JSONB
WHERE settings IS NULL;

-- Verify the settings have been added
SELECT id, name_th, settings FROM hotels LIMIT 3;