#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

console.log('🚀 รันระบบ Extension Acknowledgments...\n')

// Use service role key from server/.env.local
const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function createExtensionSystem() {
  try {
    console.log('1️⃣ สร้างตาราง extension_acknowledgments...')

    // Create table
    const { error: tableError } = await supabase.rpc('query', {
      query: `
        CREATE TABLE IF NOT EXISTS extension_acknowledgments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          staff_profile_id UUID NOT NULL,
          booking_service_id UUID NOT NULL REFERENCES booking_services(id) ON DELETE CASCADE,
          job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
          acknowledged_at TIMESTAMPTZ NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT unique_staff_extension UNIQUE(staff_profile_id, booking_service_id)
        );
      `
    })

    if (tableError) {
      console.error('❌ Table Error:', tableError)
      // Try alternative approach
      console.log('⚠️  ใช้วิธีทางเลือก: รัน SQL ใน Supabase Dashboard')
      console.log('🔗 https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/sql')
      console.log('\n📋 Copy SQL นี้:')
      console.log('─'.repeat(50))
      console.log(getFullSQL())
      console.log('─'.repeat(50))
      return
    }

    console.log('✅ สร้างตารางสำเร็จ')

    console.log('\n🎉 Extension Acknowledgments System พร้อมใช้งาน!')
    console.log('📱 Staff Dashboard: http://localhost:3004/staff/dashboard')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\n📋 กรุณารัน SQL นี้ใน Supabase Dashboard:')
    console.log('🔗 https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/sql')
    console.log('\n' + getFullSQL())
  }
}

function getFullSQL() {
  return `-- Extension Acknowledgments System
CREATE TABLE IF NOT EXISTS extension_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_profile_id UUID NOT NULL,
  booking_service_id UUID NOT NULL REFERENCES booking_services(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_staff_extension UNIQUE(staff_profile_id, booking_service_id)
);

CREATE INDEX IF NOT EXISTS idx_extension_acknowledgments_staff ON extension_acknowledgments(staff_profile_id);
CREATE INDEX IF NOT EXISTS idx_extension_acknowledgments_service ON extension_acknowledgments(booking_service_id);
CREATE INDEX IF NOT EXISTS idx_extension_acknowledgments_acknowledged ON extension_acknowledgments(acknowledged_at);

ALTER TABLE extension_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view own acknowledgments"
ON extension_acknowledgments FOR SELECT
USING (staff_profile_id = auth.uid());

CREATE POLICY "Staff can update own acknowledgments"
ON extension_acknowledgments FOR UPDATE
USING (staff_profile_id = auth.uid());

CREATE OR REPLACE FUNCTION get_pending_extension_acknowledgments(staff_profile_id UUID)
RETURNS TABLE (
  acknowledgment_id UUID,
  booking_service_id UUID,
  job_id UUID,
  service_name TEXT,
  customer_name TEXT,
  duration INTEGER,
  price DECIMAL(10,2),
  extended_at TIMESTAMPTZ,
  booking_number TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ea.id as acknowledgment_id,
    ea.booking_service_id,
    ea.job_id,
    s.name_th as service_name,
    b.customer_name,
    bs.duration,
    bs.price,
    bs.extended_at,
    b.booking_number
  FROM extension_acknowledgments ea
  JOIN booking_services bs ON bs.id = ea.booking_service_id
  JOIN services s ON s.id = bs.service_id
  JOIN bookings b ON b.id = bs.booking_id
  WHERE ea.staff_profile_id = $1
    AND ea.acknowledged_at IS NULL
    AND bs.is_extension = true
  ORDER BY bs.extended_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION create_extension_acknowledgment()
RETURNS TRIGGER AS $$
DECLARE
  target_job_id UUID;
  target_staff_profile_id UUID;
BEGIN
  IF NEW.is_extension = TRUE THEN
    SELECT j.id, j.staff_id
    INTO target_job_id, target_staff_profile_id
    FROM jobs j
    WHERE j.booking_id = NEW.booking_id
    AND j.status IN ('assigned', 'confirmed', 'traveling', 'arrived', 'in_progress')
    LIMIT 1;

    IF target_staff_profile_id IS NOT NULL THEN
      INSERT INTO extension_acknowledgments (
        staff_profile_id,
        booking_service_id,
        job_id
      ) VALUES (
        target_staff_profile_id,
        NEW.id,
        target_job_id
      )
      ON CONFLICT (staff_profile_id, booking_service_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_extension_acknowledgment_trigger ON booking_services;
CREATE TRIGGER create_extension_acknowledgment_trigger
  AFTER INSERT ON booking_services
  FOR EACH ROW
  WHEN (NEW.is_extension = TRUE)
  EXECUTE FUNCTION create_extension_acknowledgment();

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON extension_acknowledgments TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_extension_acknowledgments(UUID) TO authenticated;`
}

createExtensionSystem()