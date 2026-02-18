#!/usr/bin/env node

/**
 * Debug Auth Token
 * Find the real problem with JWT token
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.w0-oGOlshh3l8VKcKIEiL4fGgFU-AcrQY3bKPOQTg1E'

async function debugAuthToken() {
  console.log('🔍 Debugging Auth Token Issue...')

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  try {
    // Test 1: Check if we can get session from localStorage
    console.log('1. 📱 Checking localStorage session...')

    if (typeof localStorage !== 'undefined') {
      const keys = Object.keys(localStorage)
      const authKeys = keys.filter(key => key.includes('auth') || key.includes('supabase'))

      console.log('   Found auth-related keys:', authKeys)

      authKeys.forEach(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}')
          if (data.access_token) {
            console.log(`   ✅ Token found in ${key}:`, data.access_token.substring(0, 50) + '...')
          }
        } catch (e) {
          // Skip non-JSON items
        }
      })
    }

    // Test 2: Try to authenticate with fake session
    console.log('2. 🔐 Testing with manual token...')

    // Create a test user session
    const testUserId = 'df59b8ba-52e6-4d4d-b050-6f63d83446e3'

    // Test raw query with Authorization header
    const response = await fetch(`${supabaseUrl}/rest/v1/services?select=id,name_th&limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('   Response status:', response.status)
    console.log('   Response headers:', Object.fromEntries(response.headers.entries()))

    if (response.status === 401) {
      const errorBody = await response.text()
      console.log('   ❌ 401 Error body:', errorBody)
    } else {
      const data = await response.json()
      console.log('   ✅ Success:', data)
    }

    // Test 3: Check if RLS is actually enabled
    console.log('3. 🛡️  Checking RLS status directly...')

    const serviceSupabase = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY')

    const { data: rlsCheck, error: rlsError } = await serviceSupabase
      .from('pg_class')
      .select('relname, relrowsecurity')
      .eq('relname', 'services')
      .single()

    if (rlsError) {
      console.log('   ❌ Cannot check RLS:', rlsError.message)
    } else {
      console.log(`   ${rlsCheck.relrowsecurity ? '🔒' : '🔓'} RLS is ${rlsCheck.relrowsecurity ? 'ENABLED' : 'DISABLED'}`)
    }

    // Test 4: Check policies
    const { data: policies, error: policyError } = await serviceSupabase
      .from('pg_policies')
      .select('policyname, cmd, roles')
      .eq('tablename', 'services')

    if (policyError) {
      console.log('   ❌ Cannot check policies:', policyError.message)
    } else {
      console.log(`   📋 Found ${policies?.length || 0} policies:`)
      policies?.forEach(p => {
        console.log(`     - ${p.policyname} (${p.cmd}) for ${p.roles}`)
      })
    }

    // Test 5: The real issue - test with actual user JWT
    console.log('4. 🎯 THE REAL PROBLEM:')
    console.log('   Hotel app sends authenticated requests with JWT token')
    console.log('   But the RLS policy might not be recognizing auth.uid()')
    console.log('   Or the JWT token is not being sent correctly')

    console.log('\n💡 SOLUTIONS TO TRY:')
    console.log('   A) DISABLE RLS temporarily to confirm issue')
    console.log('   B) Create policy with USING (true) instead of auth.uid() IS NOT NULL')
    console.log('   C) Check if Hotel App is sending Authorization header correctly')

  } catch (error) {
    console.error('❌ Debug failed:', error.message)
  }
}

debugAuthToken()