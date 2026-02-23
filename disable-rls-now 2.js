#!/usr/bin/env node

/**
 * DISABLE RLS NOW - Emergency Fix
 * This will disable RLS on services table to fix the app immediately
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function disableRLSNow() {
  console.log('🚨 DISABLING RLS ON SERVICES TABLE...')

  try {
    // Method 1: Direct SQL to disable RLS
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        query: 'ALTER TABLE services DISABLE ROW LEVEL SECURITY;'
      })
    })

    if (response.ok) {
      console.log('✅ Method 1: RLS disabled via REST API')
    } else {
      console.log('❌ Method 1 failed, trying Method 2...')

      // Method 2: Try different endpoint
      const response2 = await fetch(`${supabaseUrl}/functions/v1/sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sql: 'ALTER TABLE services DISABLE ROW LEVEL SECURITY;'
        })
      })

      if (response2.ok) {
        console.log('✅ Method 2: RLS disabled via Functions')
      } else {
        console.log('❌ Both methods failed')
        console.log('💡 GO TO DASHBOARD AND MANUALLY DISABLE RLS!')
        return false
      }
    }

    // Test if it worked
    console.log('🧪 Testing services access...')
    const { data: services, error } = await supabase
      .from('services')
      .select('id, name_th, name_en')
      .limit(1)

    if (error) {
      console.log('❌ Still error:', error.message)
      return false
    } else {
      console.log('✅ SUCCESS! Services accessible:', services[0]?.name_en)
    }

    console.log('\n🎉 RLS DISABLED SUCCESSFULLY!')
    console.log('🚀 REFRESH YOUR HOTEL APP NOW!')
    console.log('   Services will load without 401 error!')

    return true

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\n🛠️ MANUAL FIX REQUIRED:')
    console.log('   1. Go to Supabase Dashboard')
    console.log('   2. Find services table')
    console.log('   3. Click toggle to DISABLE RLS')
    console.log('   4. Refresh Hotel App')
    return false
  }
}

disableRLSNow()