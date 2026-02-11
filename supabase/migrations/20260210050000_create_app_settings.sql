-- Migration: Create App Settings Table
-- Description: Store all application settings (logo, payment, general configs)
-- Version: 20260210050000

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

-- Create index for better performance
CREATE INDEX idx_app_settings_key ON app_settings(setting_key);
CREATE INDEX idx_app_settings_type ON app_settings(setting_type);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

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

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_updated_at();

-- Insert default settings
INSERT INTO app_settings (setting_key, setting_value, setting_type, is_sensitive, description) VALUES
  -- General Settings
  ('website_name_th', '"เดอะ บลิส แอท โฮม"', 'general', false, 'ชื่อเว็บไซต์ภาษาไทย'),
  ('website_name_en', '"The Bliss at Home"', 'general', false, 'ชื่อเว็บไซต์ภาษาอังกฤษ'),
  ('company_logo_url', 'null', 'general', false, 'URL ของโลโก้บริษัท'),
  ('support_email', '"support@theblissathome.com"', 'general', false, 'อีเมลติดต่อ'),
  ('support_phone', '"02-123-4567"', 'general', false, 'เบอร์โทรศัพท์ติดต่อ'),

  -- Payment Settings (sensitive data)
  ('omise_public_key', 'null', 'payment', false, 'Omise Public Key'),
  ('omise_secret_key', 'null', 'payment', true, 'Omise Secret Key (encrypted)'),
  ('google_maps_api_key', 'null', 'payment', true, 'Google Maps API Key'),
  ('email_provider_api_key', 'null', 'payment', true, 'Email Provider API Key'),
  ('email_provider_domain', 'null', 'payment', false, 'Email Provider Domain'),

  -- Business Settings
  ('default_commission_rate', '20', 'general', false, 'อัตราค่าคอมมิชชั่นเริ่มต้น (%)'),
  ('default_tax_rate', '7', 'general', false, 'อัตราภาษีมูลค่าเพิ่ม (%)'),
  ('business_currency', '"THB"', 'general', false, 'สกุลเงินที่ใช้'),
  ('business_timezone', '"Asia/Bangkok"', 'general', false, 'เขตเวลา'),

  -- System Settings
  ('maintenance_mode', 'false', 'general', false, 'โหมดบำรุงรักษา'),
  ('auto_approve_staff', 'false', 'general', false, 'อนุมัติพนักงานอัตโนมัติ'),
  ('notification_enabled', 'true', 'general', false, 'เปิดใช้การแจ้งเตือน')
ON CONFLICT (setting_key) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE app_settings IS 'Application settings and configuration data';
COMMENT ON COLUMN app_settings.setting_key IS 'Unique key for the setting';
COMMENT ON COLUMN app_settings.setting_value IS 'JSON value of the setting';
COMMENT ON COLUMN app_settings.setting_type IS 'Category of setting: general, payment, security, appearance';
COMMENT ON COLUMN app_settings.is_sensitive IS 'Whether the setting contains sensitive data that should be encrypted/hidden';