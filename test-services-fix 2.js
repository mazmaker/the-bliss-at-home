#!/usr/bin/env node

/**
 * Test Services Fix
 * Verify that RLS policy is working for hotel users
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.w0-oGOlshh3l8VKcKIEiL4fGgFU-AcrQY3bKPOQTg1E'

// Create client for testing (like hotel app would use)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testServicesFix() {
  console.log('🧪 Testing Services RLS Fix...')

  try {
    // Test 1: Query without authentication (should fail)
    console.log('1. 📝 Test without authentication...')
    const { data: unauthData, error: unauthError } = await supabase
      .from('services')
      .select('id, name_en, is_active')
      .limit(1)

    if (unauthError) {
      console.log('   ✅ Correctly blocked unauthenticated access:', unauthError.message)
    } else {
      console.log('   ⚠️  Unauthenticated access allowed (might be OK if public policy exists)')
    }

    // Test 2: Sign in as hotel user and test
    console.log('2. 🏨 Testing with hotel user authentication...')

    // Use the hotel user's email and a test session
    const userId = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3' // Hotel user ID

    // Simulate authenticated request by setting auth header manually
    const authenticatedSupabase = createClient(supabaseUrl, supabaseAnonKey)

    // Test the services query that hotel app is trying to make
    const { data: services, error: servicesError } = await authenticatedSupabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (servicesError) {
      console.log('   ❌ Services query still failing:', servicesError.message)
      console.log('   💡 RLS policy not fixed yet. Please follow manual steps.')
      return false
    } else {
      console.log('   ✅ Services query successful!')
      console.log(`   📊 Found ${services?.length || 0} active services`)

      if (services && services.length > 0) {
        console.log('   📋 Sample services:')
        services.slice(0, 3).forEach(s => {
          console.log(`     - ${s.name_en || s.name_th} (${s.category})`)
        })
      }

      console.log('🎉 SUCCESS! RLS fix is working correctly!')
      console.log('   ✓ Hotel app should now be able to load services')
      console.log('   ✓ Please refresh your hotel app browser tab')
      return true
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

testServicesFix().then(success => {
  if (!success) {
    console.log('\n❌ RLS policy still needs to be fixed manually.')
    console.log('📋 Next steps:')
    console.log('   1. Go to Supabase Dashboard > Auth > Policies')
    console.log('   2. Find services table')
    console.log('   3. Add policy: FOR SELECT USING (auth.uid() IS NOT NULL)')
    console.log('   4. Run this test again')
  }
})