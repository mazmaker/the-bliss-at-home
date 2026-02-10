-- Migration: Create Staff Documents and Service Areas Tables
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Create document_type enum
-- ============================================
DO $$ BEGIN
    CREATE TYPE document_type AS ENUM (
        'id_card',
        'certificate',
        'training',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 2. Create document_status enum
-- ============================================
DO $$ BEGIN
    CREATE TYPE document_status AS ENUM (
        'pending',
        'approved',
        'rejected',
        'expired'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 3. Create staff_documents table
-- ============================================
CREATE TABLE IF NOT EXISTS staff_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Document info
    type document_type NOT NULL DEFAULT 'other',
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,

    -- Status
    status document_status DEFAULT 'pending',
    expires_at TIMESTAMPTZ,
    notes TEXT,

    -- Review info
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_staff_documents_staff_id ON staff_documents(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_documents_type ON staff_documents(type);
CREATE INDEX IF NOT EXISTS idx_staff_documents_status ON staff_documents(status);

-- ============================================
-- 4. Create staff_service_areas table
-- ============================================
CREATE TABLE IF NOT EXISTS staff_service_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Location info
    province TEXT NOT NULL,
    district TEXT,
    subdistrict TEXT,
    postal_code TEXT,

    -- Coordinates (optional)
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,

    -- Service radius
    radius_km INTEGER NOT NULL DEFAULT 10,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_staff_service_areas_staff_id ON staff_service_areas(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_service_areas_province ON staff_service_areas(province);
CREATE INDEX IF NOT EXISTS idx_staff_service_areas_active ON staff_service_areas(staff_id, is_active);

-- ============================================
-- 5. Add address column to profiles if not exists
-- ============================================
DO $$ BEGIN
    ALTER TABLE profiles ADD COLUMN address TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- ============================================
-- 6. Enable Row Level Security
-- ============================================
ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_service_areas ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. RLS Policies for staff_documents
-- ============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Staff can view their documents" ON staff_documents;
DROP POLICY IF EXISTS "Staff can insert documents" ON staff_documents;
DROP POLICY IF EXISTS "Staff can delete their documents" ON staff_documents;

-- Staff can view their own documents
CREATE POLICY "Staff can view their documents"
ON staff_documents FOR SELECT
TO authenticated
USING (staff_id = auth.uid());

-- Staff can insert their own documents
CREATE POLICY "Staff can insert documents"
ON staff_documents FOR INSERT
TO authenticated
WITH CHECK (staff_id = auth.uid());

-- Staff can delete their own documents
CREATE POLICY "Staff can delete their documents"
ON staff_documents FOR DELETE
TO authenticated
USING (staff_id = auth.uid());

-- ============================================
-- 8. RLS Policies for staff_service_areas
-- ============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Staff can view their service areas" ON staff_service_areas;
DROP POLICY IF EXISTS "Staff can insert service areas" ON staff_service_areas;
DROP POLICY IF EXISTS "Staff can update their service areas" ON staff_service_areas;
DROP POLICY IF EXISTS "Staff can delete their service areas" ON staff_service_areas;

-- Staff can view their own service areas
CREATE POLICY "Staff can view their service areas"
ON staff_service_areas FOR SELECT
TO authenticated
USING (staff_id = auth.uid());

-- Staff can insert their own service areas
CREATE POLICY "Staff can insert service areas"
ON staff_service_areas FOR INSERT
TO authenticated
WITH CHECK (staff_id = auth.uid());

-- Staff can update their own service areas
CREATE POLICY "Staff can update their service areas"
ON staff_service_areas FOR UPDATE
TO authenticated
USING (staff_id = auth.uid())
WITH CHECK (staff_id = auth.uid());

-- Staff can delete their own service areas
CREATE POLICY "Staff can delete their service areas"
ON staff_service_areas FOR DELETE
TO authenticated
USING (staff_id = auth.uid());

-- ============================================
-- 9. Create triggers for updated_at
-- ============================================

DROP TRIGGER IF EXISTS update_staff_documents_updated_at ON staff_documents;
DROP TRIGGER IF EXISTS update_staff_service_areas_updated_at ON staff_service_areas;

CREATE TRIGGER update_staff_documents_updated_at
    BEFORE UPDATE ON staff_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_service_areas_updated_at
    BEFORE UPDATE ON staff_service_areas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. Create storage bucket for documents
-- ============================================
-- Note: Run this in Supabase Dashboard > Storage > Create Bucket
-- Bucket name: documents
-- Public: false
-- File size limit: 10MB
-- Allowed MIME types: application/pdf, image/jpeg, image/png

-- ============================================
-- Done!
-- ============================================
SELECT 'Staff Documents and Service Areas migration completed successfully!' as status;
