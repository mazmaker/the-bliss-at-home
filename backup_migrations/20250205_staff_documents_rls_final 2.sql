-- Row Level Security (RLS) Policies for staff_documents table
-- These policies ensure that staff can only see their own documents
-- and admins can see and manage all documents

-- Enable RLS on staff_documents table
ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Staff can view their own documents" ON staff_documents;
DROP POLICY IF EXISTS "Staff can insert their own documents" ON staff_documents;
DROP POLICY IF EXISTS "Staff can update their own pending documents" ON staff_documents;
DROP POLICY IF EXISTS "Staff can delete their own non-verified documents" ON staff_documents;
DROP POLICY IF EXISTS "Admins can view all documents" ON staff_documents;
DROP POLICY IF EXISTS "Admins can update all documents" ON staff_documents;
DROP POLICY IF EXISTS "Admins can delete all documents" ON staff_documents;

-- ============================================
-- STAFF POLICIES
-- ============================================

-- Policy 1: Staff can view their own documents
CREATE POLICY "Staff can view their own documents"
    ON staff_documents
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT profile_id FROM staff WHERE id = staff_documents.staff_id
        )
    );

-- Policy 2: Staff can insert their own documents
CREATE POLICY "Staff can insert their own documents"
    ON staff_documents
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IN (
            SELECT profile_id FROM staff WHERE id = staff_documents.staff_id
        )
    );

-- Policy 3: Staff can update only their own pending documents
-- (e.g., to add notes before submission, but cannot change status)
CREATE POLICY "Staff can update their own pending documents"
    ON staff_documents
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT profile_id FROM staff WHERE id = staff_documents.staff_id
        )
        AND verification_status = 'pending'
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT profile_id FROM staff WHERE id = staff_documents.staff_id
        )
        AND verification_status = 'pending' -- Cannot change status
    );

-- Policy 4: Staff can delete their own non-verified documents
-- (Cannot delete verified documents to maintain audit trail)
CREATE POLICY "Staff can delete their own non-verified documents"
    ON staff_documents
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT profile_id FROM staff WHERE id = staff_documents.staff_id
        )
        AND verification_status != 'verified'
    );

-- ============================================
-- ADMIN POLICIES
-- ============================================

-- Policy 5: Admins can view all documents
-- Note: For now, this allows access through service role / admin app authentication
-- TODO: Update with proper admin user identification once admin table structure is confirmed
CREATE POLICY "Admins can view all documents"
    ON staff_documents
    FOR SELECT
    TO authenticated
    USING (
        -- Allow if user is in profiles with specific role, or accessed via admin app
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR
        -- Fallback: Allow service role access
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Policy 6: Admins can update all documents
-- (Used for verifying, rejecting, adding notes, etc.)
CREATE POLICY "Admins can update all documents"
    ON staff_documents
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR
        auth.jwt() ->> 'role' = 'service_role'
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Policy 7: Admins can delete all documents
-- (Use with caution - should be logged)
CREATE POLICY "Admins can delete all documents"
    ON staff_documents
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- ============================================
-- AUDIT TRIGGERS
-- ============================================

-- Create audit log table for document status changes (using TEXT instead of enum)
CREATE TABLE IF NOT EXISTS staff_documents_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES staff_documents(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    rejection_reason TEXT,
    notes TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_staff_documents_audit_document_id ON staff_documents_audit(document_id);
CREATE INDEX idx_staff_documents_audit_changed_at ON staff_documents_audit(changed_at DESC);

-- Trigger function to log status changes
CREATE OR REPLACE FUNCTION log_document_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF (TG_OP = 'UPDATE' AND OLD.verification_status != NEW.verification_status) THEN
        INSERT INTO staff_documents_audit (
            document_id,
            changed_by,
            old_status,
            new_status,
            rejection_reason,
            notes
        ) VALUES (
            NEW.id,
            NEW.verified_by,
            OLD.verification_status,
            NEW.verification_status,
            NEW.rejection_reason,
            'Status changed from ' || OLD.verification_status || ' to ' || NEW.verification_status
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_log_document_status_change ON staff_documents;
CREATE TRIGGER trigger_log_document_status_change
    AFTER UPDATE ON staff_documents
    FOR EACH ROW
    EXECUTE FUNCTION log_document_status_change();

-- Add comments
COMMENT ON TABLE staff_documents_audit IS 'Audit log for tracking document status changes';
COMMENT ON COLUMN staff_documents_audit.changed_by IS 'User who made the status change';
COMMENT ON COLUMN staff_documents_audit.old_status IS 'Status before the change';
COMMENT ON COLUMN staff_documents_audit.new_status IS 'Status after the change';
