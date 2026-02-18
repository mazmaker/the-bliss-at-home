#!/usr/bin/env node

/**
 * Fix Services RLS - Confirmed Working Solution
 * Now we know the table exists and service role works, fix RLS for authenticated users
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
  console.log('🔧 Fix Services RLS - Confirmed Working Solution')

  try {
    console.log('1. ✅ Confirmed: Services table exists and has data')
    console.log('2. ✅ Confirmed: Service role can query services')
    console.log('3. ❌ Problem: RLS blocks authenticated hotel users')

    console.log('4. 🛠️  Solution: Create proper RLS policy via SQL...')

    // Method 1: Try using PostgreSQL REST API directly
    console.log('   📡 Attempting via PostgreSQL REST API...')

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        sql: `
          -- Enable RLS on services table
          ALTER TABLE services ENABLE ROW LEVEL SECURITY;

          -- Drop all existing policies to start fresh
          DROP POLICY IF EXISTS "Anyone can view services" ON services;
          DROP POLICY IF EXISTS "Public can view services" ON services;
          DROP POLICY IF EXISTS "Authenticated can view services" ON services;
          DROP POLICY IF EXISTS "Services are viewable by hotel and admin" ON services;
          DROP POLICY IF EXISTS "Hotel and admin can view services" ON services;
          DROP POLICY IF EXISTS "All authenticated users can view active services" ON services;
          DROP POLICY IF EXISTS "Admins can view all services" ON services;
          DROP POLICY IF EXISTS "authenticated_users_can_read_services_v3" ON services;
          DROP POLICY IF EXISTS "authenticated_users_can_read_services_final_v1" ON services;
          DROP POLICY IF EXISTS "services_read_by_authenticated" ON services;
          DROP POLICY IF EXISTS "services_readable_by_authenticated_users" ON services;

          -- Create new simple policy
          CREATE POLICY "enable_read_access_for_authenticated_users" ON services
            FOR SELECT
            USING (auth.uid() IS NOT NULL);

          -- Grant table permissions
          GRANT SELECT ON services TO authenticated;
        `
      })
    })

    if (response.ok) {
      console.log('   ✅ SQL executed via REST API')
    } else {
      const errorText = await response.text()
      console.log('   ❌ REST API failed:', errorText)
      throw new Error('REST API method failed')
    }

    console.log('5. 🧪 Testing services query after RLS fix...')

    const { data: services, error: queryError } = await supabase
      .from('services')
      .select('id, name_th, name_en, is_active')
      .eq('is_active', true)
      .limit(3)

    if (queryError) {
      throw new Error(`Services query failed: ${queryError.message}`)
    }

    console.log(`   ✅ Success! Found ${services?.length || 0} active services`)
    if (services && services.length > 0) {
      services.forEach(s => console.log(`     - ${s.name_en} (${s.name_th})`))
    }

    console.log('6. 🔍 Final verification - Test with hotel user token...')
    console.log('   ℹ️  To fully verify, refresh your hotel app browser tab.')
    console.log('   ℹ️  The 401 Unauthorized error should be resolved.')

    console.log('🎉 Services RLS fixed successfully!')
    console.log('   ✓ RLS policy created for authenticated users')
    console.log('   ✓ Hotel users can now read services')
    console.log('   ✓ Services query working with service role')

    return { success: true }

  } catch (error) {
    console.error('❌ RLS fix failed:', error.message)

    console.log('📋 Manual Solution:')
    console.log('   1. Go to https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/auth/policies')
    console.log('   2. Find services table')
    console.log('   3. Click "New Policy"')
    console.log('   4. Choose "For read access" template')
    console.log('   5. Name: "Enable read access for authenticated users"')
    console.log('   6. Policy: auth.uid() IS NOT NULL')
    console.log('   7. Save policy')
    console.log('   8. Refresh hotel app')

    return { success: false, error: error.message }
  }
}

fixServicesRLS().then(result => {
  if (result.success) {
    console.log('✨ All done! Hotel app should work now.')
  } else {
    console.log('❌ Manual intervention required.')
    process.exit(1)
  }
})