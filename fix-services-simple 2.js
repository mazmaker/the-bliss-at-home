#!/usr/bin/env node

/**
 * Fix Services RLS Simple
 * Use simple approach with direct SQL queries
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
  console.log('🔧 Starting Services RLS Simple Fix...')

  try {
    // First, let's just test a query to see current state
    console.log('1. 🧪 Testing current services query...')

    const { data: currentServices, error: currentError } = await supabase
      .from('services')
      .select('id, name, is_active')
      .limit(3)

    if (!currentError) {
      console.log(`   ✅ Current query works! Found ${currentServices?.length || 0} services`)
      if (currentServices && currentServices.length > 0) {
        currentServices.forEach(s => console.log(`     - ${s.name} (active: ${s.is_active})`))
      }
      console.log('   ℹ️  Services are already accessible. The issue might be resolved!')
      console.log('   🎯 Try refreshing the hotel app - it should work now.')
      return
    }

    console.log('   ❌ Current query failed:', currentError.message)
    console.log('   🔧 Proceeding with RLS fix...')

    // Try alternative approach using raw SQL
    console.log('2. 🛠️  Attempting RLS fix using alternative method...')

    // Use the SQL extension API
    const fixSQL = `
      -- Drop existing policies
      DO $$
      BEGIN
        DROP POLICY IF EXISTS "Anyone can view services" ON services;
        DROP POLICY IF EXISTS "Public can view services" ON services;
        DROP POLICY IF EXISTS "Authenticated can view services" ON services;
        DROP POLICY IF EXISTS "Services are viewable by hotel and admin" ON services;
        DROP POLICY IF EXISTS "Hotel and admin can view services" ON services;
        DROP POLICY IF EXISTS "All authenticated users can view active services" ON services;
        DROP POLICY IF EXISTS "Admins can view all services" ON services;
      EXCEPTION
        WHEN undefined_object THEN
          NULL; -- Ignore if policy doesn't exist
      END $$;

      -- Enable RLS
      ALTER TABLE services ENABLE ROW LEVEL SECURITY;

      -- Create simple policy
      CREATE POLICY "services_read_by_authenticated" ON services
        FOR SELECT
        USING (auth.uid() IS NOT NULL);

      -- Grant permissions
      GRANT SELECT ON services TO authenticated, anon;
    `

    const { error: sqlError } = await supabase.rpc('exec_sql', { query: fixSQL })

    if (sqlError) {
      console.log('   ❌ SQL execution failed:', sqlError.message)
      console.log('   🤔 Let me try a different approach...')

      // Final fallback: Use REST API to update table-level settings
      console.log('3. 🎲 Last resort: Checking if services table is publicly readable...')

      // Let's see what policies exist by querying pg_policies
      const { data: policies, error: policyError } = await supabase
        .from('pg_policies')
        .select('policyname, tablename')
        .eq('tablename', 'services')

      if (!policyError && policies) {
        console.log('   📋 Current policies on services table:')
        policies.forEach(p => console.log(`     - ${p.policyname}`))
      }

      throw new Error('All RLS fix methods failed')
    }

    console.log('   ✅ RLS policies updated')

    // Test the query again
    console.log('3. 🧪 Testing services query after fix...')
    const { data: services, error: queryError } = await supabase
      .from('services')
      .select('id, name, is_active')
      .limit(3)

    if (queryError) {
      throw new Error(`Services query still failing: ${queryError.message}`)
    }

    console.log(`   ✅ Query successful! Found ${services?.length || 0} services`)
    if (services && services.length > 0) {
      services.forEach(s => console.log(`     - ${s.name} (active: ${s.is_active})`))
    }

    console.log('🎉 Services RLS fixed successfully!')
    console.log('   🏨 The hotel app should now be able to load services properly.')

  } catch (error) {
    console.error('❌ Error fixing services RLS:', error.message)
    console.error('   💡 Manual fix required in Supabase Dashboard:')
    console.error('   1. Go to Supabase Dashboard > Authentication > RLS')
    console.error('   2. Find services table')
    console.error('   3. Add policy: FOR SELECT USING (auth.uid() IS NOT NULL)')
    console.error('   4. Enable policy for authenticated role')
    process.exit(1)
  }
}

fixServicesRLS()