#!/usr/bin/env node

/**
 * Diagnose Services RLS
 * Check what RLS policies actually exist and provide clear fix instructions
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

async function diagnoseServicesRLS() {
  console.log('🔍 Diagnosing Services RLS Policies...')

  try {
    console.log('1. ✅ Testing service role access...')
    const { data: services, error: serviceError } = await supabase
      .from('services')
      .select('id, name_th, name_en, is_active')
      .limit(1)

    if (serviceError) {
      console.log('   ❌ Service role cannot access services:', serviceError.message)
      return
    }

    console.log(`   ✅ Service role can read services (${services?.length || 0} found)`)

    console.log('2. 🔍 Checking if RLS is enabled...')
    // Query pg_class to check if RLS is enabled
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('pg_class')
      .select('relname, relrowsecurity')
      .eq('relname', 'services')

    if (!rlsError && rlsStatus && rlsStatus.length > 0) {
      const isRlsEnabled = rlsStatus[0].relrowsecurity
      console.log(`   ${isRlsEnabled ? '🔒' : '🔓'} RLS is ${isRlsEnabled ? 'ENABLED' : 'DISABLED'} on services table`)

      if (!isRlsEnabled) {
        console.log('   💡 Solution: Enable RLS and create policy')
      }
    }

    console.log('3. 📋 Checking existing RLS policies...')
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, roles, qual')
      .eq('tablename', 'services')

    if (!policyError && policies) {
      if (policies.length === 0) {
        console.log('   ❌ NO RLS policies found for services table!')
        console.log('   💡 This is the problem - no policies allow authenticated users to read services')
      } else {
        console.log(`   📝 Found ${policies.length} existing policies:`)
        policies.forEach((p, i) => {
          console.log(`     ${i + 1}. ${p.policyname} (${p.cmd})`)
          console.log(`        - Roles: ${Array.isArray(p.roles) ? p.roles.join(', ') : p.roles}`)
          console.log(`        - Condition: ${p.qual}`)
        })
      }
    }

    console.log('\n🎯 SOLUTION:')
    console.log('   Manual fix required in Supabase Dashboard:')
    console.log('   1. Go to: https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/auth/policies')
    console.log('   2. Find "services" table')
    console.log('   3. Click "Enable RLS" if not already enabled')
    console.log('   4. Click "New Policy" button')
    console.log('   5. Choose "Get started quickly" > "Enable read access for authenticated users only"')
    console.log('   6. Policy name: "Enable read access for authenticated users"')
    console.log('   7. Leave the policy as: (auth.uid() IS NOT NULL)')
    console.log('   8. Click "Save policy"')
    console.log('   9. Go back to hotel app and refresh the page')

    console.log('\n✨ Expected result:')
    console.log('   - Hotel app should load services without 401 Unauthorized error')
    console.log('   - Services list should appear in booking modal')

  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message)
  }
}

diagnoseServicesRLS()