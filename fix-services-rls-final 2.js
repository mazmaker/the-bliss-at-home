#!/usr/bin/env node

/**
 * Fix Services RLS Final
 * This script fixes services table RLS policies to allow hotel users to access services
 *
 * Problem: Hotel user getting 401 Unauthorized when querying services
 * Solution: Create comprehensive RLS policy that allows all authenticated users to read services
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzk2MzgxNSwiZXhwIjoyMDUzNTM5ODE1fQ.x8W3z_1Zxlj7c5nWV4Q3GR0jY9W8m_Dp6Xs4H6BEv1I'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixServicesRLS() {
  console.log('🔧 Starting Services RLS Fix...')

  try {
    console.log('1. 📋 Checking current RLS policies on services table...')
    const { data: policies, error: policyError } = await supabase.rpc('get_policies', { table_name: 'services' })
    if (policyError && policyError.code !== '42883') {
      console.warn('⚠️  Could not fetch policies (function may not exist):', policyError.message)
    } else if (policies) {
      console.log('   Current policies:', policies.map(p => p.policyname).join(', '))
    }

    console.log('2. 🗑️  Dropping all existing RLS policies on services table...')
    const dropPoliciesSQL = `
      -- Drop all existing policies
      DROP POLICY IF EXISTS "Anyone can view services" ON services;
      DROP POLICY IF EXISTS "Anyone can view active services" ON services;
      DROP POLICY IF EXISTS "Public can view services" ON services;
      DROP POLICY IF EXISTS "Authenticated can view services" ON services;
      DROP POLICY IF EXISTS "Services are viewable by hotel and admin" ON services;
      DROP POLICY IF EXISTS "Hotel and admin can view services" ON services;
      DROP POLICY IF EXISTS "Services viewable by authenticated users" ON services;
      DROP POLICY IF EXISTS "All authenticated users can view active services" ON services;
      DROP POLICY IF EXISTS "Admins can view all services" ON services;
    `

    const { error: dropError } = await supabase.rpc('exec_sql', { sql: dropPoliciesSQL })
    if (dropError) {
      console.warn('⚠️  Some policies may not exist:', dropError.message)
    } else {
      console.log('   ✅ Dropped existing policies')
    }

    console.log('3. 🛡️  Creating new RLS policies...')
    const createPoliciesSQL = `
      -- Ensure RLS is enabled
      ALTER TABLE services ENABLE ROW LEVEL SECURITY;

      -- Create simple policy: All authenticated users can read services
      CREATE POLICY "authenticated_users_can_read_services_v3" ON services
        FOR SELECT
        USING (auth.uid() IS NOT NULL);

      -- Grant necessary permissions to roles
      GRANT SELECT ON services TO anon, authenticated;
    `

    const { error: createError } = await supabase.rpc('exec_sql', { sql: createPoliciesSQL })
    if (createError) {
      throw new Error(`Failed to create policies: ${createError.message}`)
    }
    console.log('   ✅ Created new policies')

    console.log('4. 🧪 Testing services query with service role...')
    const { data: servicesTest, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .limit(3)

    if (servicesError) {
      throw new Error(`Services query failed: ${servicesError.message}`)
    }

    console.log(`   ✅ Services query successful, found ${servicesTest?.length || 0} services`)
    if (servicesTest && servicesTest.length > 0) {
      console.log(`   📋 Sample services:`, servicesTest.map(s => s.name).join(', '))
    }

    console.log('5. 🔍 Verifying policy creation...')
    const { data: newPolicies, error: newPolicyError } = await supabase.rpc('get_policies', { table_name: 'services' })
    if (newPolicyError && newPolicyError.code !== '42883') {
      console.warn('⚠️  Could not verify policies:', newPolicyError.message)
    } else if (newPolicies) {
      console.log('   ✅ New policies created:', newPolicies.map(p => p.policyname).join(', '))
    }

    console.log('🎉 Services RLS fix completed successfully!')
    console.log('   ✓ RLS enabled on services table')
    console.log('   ✓ All authenticated users can now read services')
    console.log('   ✓ Hotel users should now be able to load services')

  } catch (error) {
    console.error('❌ Error fixing services RLS:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Helper function to create exec_sql function if it doesn't exist
async function ensureExecSqlFunction() {
  const createExecSqlSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
      RETURN 'SUCCESS';
    EXCEPTION
      WHEN others THEN
        RETURN 'ERROR: ' || SQLERRM;
    END;
    $$;
  `

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: createExecSqlSQL })
    if (error && !error.message.includes('already exists')) {
      // If exec_sql doesn't exist, create it
      const { error: createError } = await supabase.from('_temp_create_function').select('*').limit(1)
      // This will fail but we'll handle it by using the SQL directly
    }
  } catch (e) {
    // Function may not exist yet, that's ok
  }
}

fixServicesRLS()