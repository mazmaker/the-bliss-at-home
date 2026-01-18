-- Migration: Create Additional ENUM Types
-- Description: Booking, payment, service categories, and status enums
-- Version: 002

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Booking status
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');

-- Payment status
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'paid', 'failed', 'refunded');

-- Service category
CREATE TYPE service_category AS ENUM ('massage', 'nail', 'spa', 'facial');

-- Staff status
CREATE TYPE staff_status AS ENUM ('active', 'inactive', 'pending');

-- Hotel status
CREATE TYPE hotel_status AS ENUM ('active', 'inactive', 'pending');

-- Skill level
CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- Comments for documentation
COMMENT ON TYPE booking_status IS 'Booking status: pending, confirmed, in_progress, completed, cancelled';
COMMENT ON TYPE payment_status IS 'Payment status: pending, processing, paid, failed, refunded';
COMMENT ON TYPE service_category IS 'Service categories: massage, nail, spa, facial';
COMMENT ON TYPE staff_status IS 'Staff status: active, inactive, pending';
COMMENT ON TYPE hotel_status IS 'Hotel status: active, inactive, pending';
COMMENT ON TYPE skill_level IS 'Skill levels: beginner, intermediate, advanced, expert';
