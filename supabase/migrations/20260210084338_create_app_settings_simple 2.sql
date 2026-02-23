-- Create app_settings table for admin settings
-- This migration creates a simple app_settings table with proper RLS

-- Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB,
  setting_type TEXT NOT NULL CHECK (setting_type IN ('general', 'payment', 'security', 'appearance')),
  is_sensitive BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_app_settings_type ON app_settings(setting_type);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all settings" ON app_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON app_settings;

-- RLS Policies - Only admins can access settings
CREATE POLICY "Admins can view all settings"
ON app_settings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update settings"
ON app_settings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Insert default settings
INSERT INTO app_settings (setting_key, setting_value, setting_type, is_sensitive, description) VALUES
  -- General Settings
  ('website_name_th', '"เดอะ บลิส มาสสาจ แอท โฮม"', 'general', false, 'ชื่อเว็บไซต์ภาษาไทย'),
  ('website_name_en', '"The Bliss Massage at Home"', 'general', false, 'ชื่อเว็บไซต์ภาษาอังกฤษ'),
  ('company_logo_url', 'null', 'general', false, 'URL ของโลโก้บริษัท'),

  -- Payment Settings
  ('omise_public_key', 'null', 'payment', false, 'Omise Public Key'),
  ('omise_secret_key', 'null', 'payment', true, 'Omise Secret Key'),
  ('google_maps_api_key', 'null', 'payment', true, 'Google Maps API Key'),
  ('email_provider_api_key', 'null', 'payment', true, 'Email Provider API Key'),
  ('email_provider_domain', 'null', 'payment', false, 'Email Provider Domain')
ON CONFLICT (setting_key) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE app_settings IS 'Application settings and configuration data';