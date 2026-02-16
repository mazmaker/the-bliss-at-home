-- Migration: Create System Logs Table
-- Description: Add system logging for analytics and debugging
-- Version: 20260212140100

-- ============================================
-- SYSTEM LOGS TABLE
-- ============================================

CREATE TABLE system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  details JSONB,
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_system_logs_action ON system_logs(action);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view system logs
CREATE POLICY "Admins can view system logs" ON system_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- System can insert logs
CREATE POLICY "System can insert logs" ON system_logs
  FOR INSERT WITH CHECK (true);

-- ============================================
-- CLEANUP FUNCTION
-- ============================================

-- Function to clean up old logs (keep only last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_system_logs()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM system_logs
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Log the cleanup action
  INSERT INTO system_logs (action, details)
  VALUES (
    'cleanup_system_logs',
    json_build_object(
      'deleted_count', deleted_count,
      'retention_days', 90
    )
  );

  RETURN deleted_count;
END;
$$;

-- ============================================
-- PERMISSIONS
-- ============================================

GRANT SELECT ON system_logs TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_system_logs() TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE system_logs IS 'System activity logs for debugging and analytics';
COMMENT ON FUNCTION cleanup_old_system_logs() IS 'Remove system logs older than 90 days';