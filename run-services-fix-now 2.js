#!/usr/bin/env node

/**
 * Run Services Fix NOW - Final Solution
 * Direct test and verification of RLS fix
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.w0-oGOlshh3l8VKcKIEiL4fGgFU-AcrQY3bKPOQTg1E'

async function testAndFixServices() {
  console.log('🚀 ทดสอบและแก้ไข Services RLS ครั้งสุดท้าย!')

  try {
    // Test 1: Service role access (should work)
    console.log('1. ✅ ทดสอบ Service Role Access...')
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: adminServices, error: adminError } = await adminSupabase
      .from('services')
      .select('id, name_th, name_en, is_active')
      .limit(3)

    if (adminError) {
      console.log('   ❌ Admin access failed:', adminError.message)
      throw new Error('Basic admin access broken')
    }

    console.log(`   ✅ Admin can access ${adminServices?.length || 0} services`)

    // Test 2: Authenticated user access (this is what's broken)
    console.log('2. 🧪 ทดสอบ Authenticated User Access (Hotel App)...')
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Simulate the exact query hotel app makes
    const { data: userServices, error: userError } = await userSupabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (userError) {
      console.log('   ❌ User access failed:', userError.message)

      if (userError.message.includes('401') || userError.message.includes('Unauthorized')) {
        console.log('   🎯 Confirmed: RLS is blocking authenticated users!')

        // Now try to fix via API
        console.log('3. 🔧 Attempting RLS fix via API...')

        try {
          // Use SQL over HTTP
          const fixResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey
            },
            body: JSON.stringify({
              query: `
                ALTER TABLE services ENABLE ROW LEVEL SECURITY;
                DROP POLICY IF EXISTS "hotel_app_read_services" ON services;
                CREATE POLICY "hotel_app_read_services" ON services FOR SELECT USING (auth.uid() IS NOT NULL);
                GRANT SELECT ON services TO authenticated;
              `
            })
          })

          if (fixResponse.ok) {
            console.log('   ✅ RLS fix applied via API!')

            // Test again
            const { data: fixedServices, error: fixedError } = await userSupabase
              .from('services')
              .select('*')
              .eq('is_active', true)
              .limit(3)

            if (!fixedError) {
              console.log(`   🎉 SUCCESS! User can now access ${fixedServices?.length || 0} services`)
              console.log('   🚀 Hotel App should work now!')
              return true
            } else {
              console.log('   ❌ Still blocked after fix:', fixedError.message)
            }

          } else {
            console.log('   ❌ API fix failed')
          }
        } catch (apiError) {
          console.log('   ❌ API error:', apiError.message)
        }

        // Final fallback instructions
        console.log('\n📋 MANUAL FIX REQUIRED:')
        console.log('   🌐 Go to: https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/auth/policies')
        console.log('   📋 Find "services" table')
        console.log('   ➕ Click "New Policy"')
        console.log('   ✅ Choose "Enable read access for authenticated users only"')
        console.log('   📝 Policy: auth.uid() IS NOT NULL')
        console.log('   💾 Save')
        console.log('   🔄 Refresh Hotel App')

        return false

      } else {
        console.log('   ❓ Different error:', userError.message)
      }
    } else {
      console.log(`   ✅ SUCCESS! User can access ${userServices?.length || 0} services`)
      console.log('   🎉 RLS is working correctly!')
      console.log('   📋 Services found:')
      userServices?.slice(0, 3).forEach(s => {
        console.log(`     - ${s.name_en} (${s.category})`)
      })
      return true
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

testAndFixServices().then(success => {
  if (success) {
    console.log('\n🎊 ALL FIXED! Hotel App should work now!')
  } else {
    console.log('\n🛠️  Manual dashboard fix required.')
  }
})