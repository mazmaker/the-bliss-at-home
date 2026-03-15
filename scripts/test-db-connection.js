#!/usr/bin/env node

/**
 * Test Database Connection
 * This script tests if hotels table exists and can be queried
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgwNzk2NzYsImV4cCI6MjA1MzY1NTY3Nn0.qHMZxCH02vbxIwb5xjQo-G8gfYwgBNVJGpCNcHAtFJ0'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...\n')

    // Try to query hotels table
    const { data, error } = await supabase
      .from('hotels')
      .select('id, name_th, name_en, status')
      .limit(5)

    if (error) {
      console.error('❌ Error querying hotels table:', error.message)
      console.log('\n⚠️  The hotels table might not exist yet.')
      console.log('📝 Please run the SQL in Supabase Dashboard:')
      console.log('   1. Go to https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/sql/new')
      console.log('   2. The SQL is in your clipboard - press Ctrl+V to paste')
      console.log('   3. Click "Run" button\n')
      process.exit(1)
    }

    console.log('✅ Database connection successful!')
    console.log(`📊 Found ${data.length} hotels:\n`)

    data.forEach((hotel, i) => {
      console.log(`${i + 1}. ${hotel.name_th} (${hotel.name_en}) - ${hotel.status}`)
    })

    console.log('\n🎉 Hotels Management database is ready!')
    console.log('🔗 You can test at: http://localhost:3005/admin/hotels\n')

  } catch (err) {
    console.error('💥 Fatal error:', err.message)
    process.exit(1)
  }
}

testConnection()
