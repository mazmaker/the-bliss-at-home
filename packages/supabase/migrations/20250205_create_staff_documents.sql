-- Create staff_documents table for KYC document management
-- This table stores all documents uploaded by staff members for verification

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing types if they exist (for clean reinstall)
DROP TYPE IF EXISTS document_type CASCADE;
DROP TYPE IF EXISTS document_status CASCADE;

-- Create enum for document types
CREATE TYPE document_type AS ENUM (
    'id_card',
    'license',
    'certificate',
    'bank_statement',
    'other'
);

-- Create enum for document status
CREATE TYPE document_status AS ENUM (
    'pending',
    'reviewing',
    'verified',
    'rejected'
);

-- Create staff_documents table
CREATE TABLE IF NOT EXISTS staff_documents (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,

    -- Document information
    document_type document_type NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL CHECK (file_size > 0),
    mime_type TEXT NOT NULL,

    -- Status tracking
    verification_status document_status DEFAULT 'pending'::document_status NOT NULL,
    verified_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    notes TEXT,

    -- Metadata
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_staff_documents_staff_id ON staff_documents(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_documents_status ON staff_documents(verification_status);
CREATE INDEX IF NOT EXISTS idx_staff_documents_document_type ON staff_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_staff_documents_created_at ON staff_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_documents_verified_by ON staff_documents(verified_by) WHERE verified_by IS NOT NULL;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_staff_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_staff_documents_updated_at
    BEFORE UPDATE ON staff_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_documents_updated_at();

-- Add comments for documentation
COMMENT ON TABLE staff_documents IS 'Stores KYC documents uploaded by staff members for verification';
COMMENT ON COLUMN staff_documents.id IS 'Unique identifier for the document';
COMMENT ON COLUMN staff_documents.staff_id IS 'Reference to the staff member who uploaded this document';
COMMENT ON COLUMN staff_documents.document_type IS 'Type of document (ID card, license, certificate, etc.)';
COMMENT ON COLUMN staff_documents.file_url IS 'URL to the document file in Supabase Storage';
COMMENT ON COLUMN staff_documents.verification_status IS 'Current verification status of the document';
COMMENT ON COLUMN staff_documents.verified_by IS 'Admin user who verified or rejected the document';
COMMENT ON COLUMN staff_documents.rejection_reason IS 'Reason provided when document is rejected';
COMMENT ON COLUMN staff_documents.expires_at IS 'Expiration date for documents that expire (optional)';
