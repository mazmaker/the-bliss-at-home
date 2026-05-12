-- Migration: Add job_reminders table for tracking sent reminders
-- Created: 2026-05-12
-- Purpose: Track 3-day, 1-day, 2-hour reminders sent to staff

-- Create job_reminders table
CREATE TABLE IF NOT EXISTS job_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  reminder_type VARCHAR(10) NOT NULL CHECK (reminder_type IN ('3_days', '1_day', '2_hours')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  sent_via VARCHAR(10) NOT NULL CHECK (sent_via IN ('app', 'line', 'both')) DEFAULT 'both',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Prevent duplicate reminders
  UNIQUE(job_id, reminder_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_reminders_job_id ON job_reminders(job_id);
CREATE INDEX IF NOT EXISTS idx_job_reminders_staff_id ON job_reminders(staff_id);
CREATE INDEX IF NOT EXISTS idx_job_reminders_type ON job_reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_job_reminders_sent_at ON job_reminders(sent_at);

-- Add comments
COMMENT ON TABLE job_reminders IS 'Tracks reminders sent to staff for upcoming jobs (3 days, 1 day, 2 hours before)';
COMMENT ON COLUMN job_reminders.reminder_type IS 'Type of reminder: 3_days, 1_day, or 2_hours';
COMMENT ON COLUMN job_reminders.sent_via IS 'Channel used: app, line, or both';

-- Grant permissions (adjust based on your RLS policies)
-- These would be added to your RLS policy setup