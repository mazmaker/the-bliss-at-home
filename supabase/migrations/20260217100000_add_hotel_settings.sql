-- Migration: Add Settings Column to Hotels Table
-- Description: Add JSONB settings column for hotel-specific configurations
-- Version: 20260217100000

-- ============================================
-- ADD SETTINGS COLUMN TO HOTELS TABLE
-- ============================================

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

-- ============================================
-- CREATE INDEX FOR BETTER PERFORMANCE
-- ============================================

CREATE INDEX idx_hotels_settings_gin ON hotels USING GIN (settings);

-- ============================================
-- UPDATE EXISTING HOTELS WITH DEFAULT SETTINGS
-- ============================================

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

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN hotels.settings IS 'Hotel-specific configuration settings stored as JSONB';