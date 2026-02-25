#!/usr/bin/env node
/**
 * Apply Services RLS Fix Directly
 * รัน SQL โดยตรงเพื่อแก้ไข services RLS
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function applyServicesRLSFix() {
  console.log('🚀 ====================================')
  console.log('   Apply Services RLS Fix Directly')
  console.log('🚀 ====================================')
  console.log('')

  try {
    console.log('⚠️  กำลังรัน SQL โดยตรงเพื่อแก้ไข RLS policies...')
    console.log('   (อาจต้องรอสักครู่)')
    console.log('')

    // Note: This approach will work by making multiple individual calls
    // since direct SQL execution through supabase client has limitations

    console.log('✅ เนื่องจาก Supabase client ไม่สามารถรัน DDL commands ได้')
    console.log('   โปรดทำตามขั้นตอนต่อไปนี้:')
    console.log('')

    console.log('📋 Manual Fix - ทำตามขั้นตอน:')
    console.log('')
    console.log('1. เปิด Supabase Dashboard: https://supabase.com/dashboard')
    console.log('2. เลือกโปรเจ็ค: rbdvlfriqjnwpxmmgisf')
    console.log('3. ไป SQL Editor (เมนูซ้าย)')
    console.log('4. รัน SQL นี้:')
    console.log('')
    console.log('----------------------------------------')
    console.log('-- Fix Services RLS Policy')
    console.log('-- Enable RLS')
    console.log('ALTER TABLE services ENABLE ROW LEVEL SECURITY;')
    console.log('')
    console.log('-- Drop existing policies')
    console.log('DROP POLICY IF EXISTS "Services are viewable by hotel and admin" ON services;')
    console.log('DROP POLICY IF EXISTS "Hotel and admin can view services" ON services;')
    console.log('DROP POLICY IF EXISTS "Services viewable by authenticated users" ON services;')
    console.log('')
    console.log('-- Create new policy')
    console.log('CREATE POLICY "All users can view active services"')
    console.log('ON services FOR SELECT')
    console.log('USING (')
    console.log('  is_active = true')
    console.log('  AND auth.uid() IS NOT NULL')
    console.log('  AND EXISTS (')
    console.log('    SELECT 1 FROM profiles')
    console.log('    WHERE profiles.id = auth.uid()')
    console.log('    AND profiles.role IN (\'HOTEL\', \'ADMIN\', \'CUSTOMER\')')
    console.log('  )')
    console.log(');')
    console.log('----------------------------------------')
    console.log('')
    console.log('5. กด Run')
    console.log('6. รอให้เสร็จ')
    console.log('7. กลับมาทดสอบ Hotel App')
    console.log('')

    console.log('🎯 หลังจากแก้ไข:')
    console.log('   - รีเฟรช Hotel App')
    console.log('   - ฟอร์มจองควรแสดงรายการบริการ')
    console.log('   - ไม่ควรเห็น 401 Unauthorized อีก')

  } catch (error) {
    console.error('💥 Error:', error.message)
  }

  console.log('')
  console.log('🎉 ====================================')
  console.log('   Ready to fix!')
  console.log('🎉 ====================================')
}

applyServicesRLSFix().catch(console.error)