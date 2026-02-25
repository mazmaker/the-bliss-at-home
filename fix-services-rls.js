#!/usr/bin/env node
/**
 * Fix Services RLS Policy
 * แก้ไข RLS policy ให้ HOTEL role อ่าน services ได้
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function fixServicesRLS() {
  console.log('🔒 ====================================')
  console.log('   Fix Services RLS Policy')
  console.log('🔒 ====================================')
  console.log('')

  try {
    // 1. Test current services access with HOTEL user
    console.log('1. 🧪 ทดสอบการเข้าถึง services ปัจจุบัน...')

    // Try to create a client with HOTEL user session (simulated)
    const { data: servicesTest, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .limit(1)

    if (servicesError) {
      console.log('❌ Services access error:', servicesError.message)
    } else {
      console.log('✅ Service role can access services')
      console.log(`   Found ${servicesTest.length} services`)
    }

    // 2. Create RLS policy for services table
    console.log('')
    console.log('2. 🛡️ สร้าง RLS policy สำหรับ services...')

    // This needs to be done via raw SQL through service role
    console.log('   กำลังสร้าง policy สำหรับ HOTEL และ ADMIN roles...')

    console.log('')
    console.log('📋 SQL ที่ต้องรัน:')
    console.log('')
    console.log('-- Enable RLS on services table')
    console.log('ALTER TABLE services ENABLE ROW LEVEL SECURITY;')
    console.log('')
    console.log('-- Drop existing policies if any')
    console.log('DROP POLICY IF EXISTS "Services are viewable by hotel and admin" ON services;')
    console.log('DROP POLICY IF EXISTS "Hotel and admin can view services" ON services;')
    console.log('')
    console.log('-- Create policy allowing HOTEL and ADMIN to view all services')
    console.log('CREATE POLICY "Hotel and admin can view all services"')
    console.log('ON services FOR SELECT')
    console.log('USING (')
    console.log('  auth.uid() IS NOT NULL')
    console.log('  AND EXISTS (')
    console.log('    SELECT 1 FROM profiles')
    console.log('    WHERE profiles.id = auth.uid()')
    console.log('    AND profiles.role IN (\'HOTEL\', \'ADMIN\', \'CUSTOMER\')')
    console.log('  )')
    console.log(');')

    console.log('')
    console.log('💡 วิธีแก้ไข:')
    console.log('   1. เปิด Supabase Dashboard')
    console.log('   2. ไป SQL Editor')
    console.log('   3. รัน SQL ข้างบน')
    console.log('   4. กลับมาทดสอบ Hotel App')

    console.log('')
    console.log('🎯 หรือใช้วิธีอัตโนมัติ:')

    // Try to create migration file
    console.log('   กำลังสร้างไฟล์ migration...')

    const migrationContent = `-- Fix Services RLS Policy
-- Allow HOTEL, ADMIN, and CUSTOMER roles to view services

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Services are viewable by hotel and admin" ON services;
DROP POLICY IF EXISTS "Hotel and admin can view services" ON services;
DROP POLICY IF EXISTS "Services viewable by authenticated users" ON services;

-- Create comprehensive policy
CREATE POLICY "All authenticated users can view active services"
ON services FOR SELECT
USING (
  is_active = true
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('HOTEL', 'ADMIN', 'CUSTOMER')
  )
);

-- Also allow viewing inactive services for admin
CREATE POLICY "Admins can view all services"
ON services FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'ADMIN'
  )
);`

    // Write migration file
    const fs = require('fs')
    const migrationFile = `supabase/migrations/${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '').slice(0, 14)}_fix_services_rls.sql`

    try {
      fs.writeFileSync(migrationFile, migrationContent)
      console.log(`✅ สร้างไฟล์ migration: ${migrationFile}`)
      console.log('')
      console.log('🚀 รันคำสั่ง: supabase db push')
    } catch (writeError) {
      console.log('⚠️ ไม่สามารถสร้างไฟล์ migration ได้:', writeError.message)
    }

    console.log('')
    console.log('🎉 ====================================')
    console.log('   RLS Fix Ready!')
    console.log('🎉 ====================================')
    console.log('')
    console.log('✅ หลังจากแก้ไข RLS แล้ว:')
    console.log('   - HOTEL role จะอ่าน services ได้')
    console.log('   - ฟอร์มจองจะแสดงรายการบริการ')
    console.log('   - การจองจะทำงานปกติ')

  } catch (error) {
    console.error('💥 Error:', error.message)
  }
}

fixServicesRLS().catch(console.error)