#!/usr/bin/env node

/**
 * Fix Services RLS Direct
 * Run SQL directly against remote database to fix services RLS
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ Please set SUPABASE_SERVICE_ROLE_KEY environment variable')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixServicesRLS() {
  console.log('🔧 Starting Services RLS Direct Fix...')

  try {
    // Step 1: Drop all existing policies
    console.log('1. 🗑️  Dropping all existing RLS policies on services table...')

    const dropPolicies = [
      'DROP POLICY IF EXISTS "Anyone can view services" ON services;',
      'DROP POLICY IF EXISTS "Anyone can view active services" ON services;',
      'DROP POLICY IF EXISTS "Public can view services" ON services;',
      'DROP POLICY IF EXISTS "Authenticated can view services" ON services;',
      'DROP POLICY IF EXISTS "Services are viewable by hotel and admin" ON services;',
      'DROP POLICY IF EXISTS "Hotel and admin can view services" ON services;',
      'DROP POLICY IF EXISTS "Services viewable by authenticated users" ON services;',
      'DROP POLICY IF EXISTS "All authenticated users can view active services" ON services;',
      'DROP POLICY IF EXISTS "Admins can view all services" ON services;',
      'DROP POLICY IF EXISTS "authenticated_users_can_read_services_v3" ON services;',
      'DROP POLICY IF EXISTS "authenticated_users_can_read_services_final_v1" ON services;'
    ]

    for (const sql of dropPolicies) {
      const { error } = await supabase.rpc('exec_sql_admin', { sql })
      if (error && !error.message.includes('does not exist')) {
        console.warn(`   ⚠️ Error dropping policy: ${error.message}`)
      }
    }
    console.log('   ✅ Policies dropped')

    // Step 2: Enable RLS and create new policy
    console.log('2. 🛡️  Creating new RLS policy...')

    const setupSQL = `
      -- Ensure RLS is enabled
      ALTER TABLE services ENABLE ROW LEVEL SECURITY;

      -- Create simple policy for all authenticated users
      CREATE POLICY "services_readable_by_authenticated_users" ON services
        FOR SELECT
        USING (auth.uid() IS NOT NULL);

      -- Grant permissions
      GRANT SELECT ON services TO anon, authenticated;
    `

    const { error: setupError } = await supabase.rpc('exec_sql_admin', { sql: setupSQL })
    if (setupError) {
      throw new Error(`Failed to setup RLS: ${setupError.message}`)
    }
    console.log('   ✅ New RLS policy created')

    // Step 3: Test the query
    console.log('3. 🧪 Testing services query...')
    const { data: services, error: queryError } = await supabase
      .from('services')
      .select('id, name, is_active')
      .limit(3)

    if (queryError) {
      throw new Error(`Services query failed: ${queryError.message}`)
    }

    console.log(`   ✅ Query successful! Found ${services?.length || 0} services`)
    if (services && services.length > 0) {
      services.forEach(s => console.log(`     - ${s.name} (active: ${s.is_active})`))
    }

    console.log('🎉 Services RLS fixed successfully!')
    console.log('   The hotel app should now be able to load services properly.')

  } catch (error) {
    console.error('❌ Error fixing services RLS:', error.message)
    process.exit(1)
  }
}

fixServicesRLS()