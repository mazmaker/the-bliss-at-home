#!/usr/bin/env node

/**
 * Check Services Schema
 * Debug what columns actually exist in services table
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

async function checkServicesSchema() {
  console.log('🔍 Checking Services Table Schema...')

  try {
    // Try to query just the table to see what happens
    console.log('1. 📋 Testing basic services query...')
    const { data: services, error: basicError } = await supabase
      .from('services')
      .select('*')
      .limit(1)

    if (basicError) {
      console.log('   ❌ Basic query failed:', basicError.message)
      if (basicError.message.includes('does not exist')) {
        console.log('   🚨 Services table does not exist!')
        return
      }
    } else if (services) {
      console.log('   ✅ Basic query succeeded!')
      console.log('   📊 Sample row:', JSON.stringify(services[0], null, 2))

      if (services[0]) {
        console.log('   📝 Available columns:', Object.keys(services[0]).join(', '))
      }
      return
    }

    // If basic query fails, check if table exists at all
    console.log('2. 🔍 Checking if services table exists...')
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .ilike('table_name', '%service%')

    if (!tablesError && tables) {
      console.log('   📋 Tables matching "service":', tables.map(t => t.table_name).join(', '))
    } else {
      console.log('   ❌ Cannot check table existence:', tablesError?.message)
    }

    // Try alternative approaches
    console.log('3. 🎲 Trying different query approaches...')

    // Method 1: Try with only id
    try {
      const { data: idOnly, error: idError } = await supabase
        .from('services')
        .select('id')
        .limit(1)

      if (!idError && idOnly) {
        console.log('   ✅ ID-only query worked')
        console.log('   📊 Sample:', JSON.stringify(idOnly[0], null, 2))
      } else {
        console.log('   ❌ ID-only query failed:', idError?.message)
      }
    } catch (e) {
      console.log('   ❌ ID-only query exception:', e.message)
    }

    // Method 2: Try with count
    try {
      const { count, error: countError } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })

      if (!countError) {
        console.log('   ✅ Count query worked:', count, 'rows')
      } else {
        console.log('   ❌ Count query failed:', countError.message)
      }
    } catch (e) {
      console.log('   ❌ Count query exception:', e.message)
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

checkServicesSchema()