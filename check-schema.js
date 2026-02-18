#!/usr/bin/env node
/**
 * Check Database Schema
 * ตรวจสอบโครงสร้างฐานข้อมูลจริง
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkSchema() {
  console.log('🔍 ====================================')
  console.log('   Check Database Schema')
  console.log('🔍 ====================================')
  console.log('')

  try {
    // 1. Check profiles table structure
    console.log('1. 👤 profiles table structure...')
    const { data: profileSample, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)

    if (profileError) {
      console.log('❌ Profiles error:', profileError.message)
    } else if (profileSample.length > 0) {
      console.log('   Columns:', Object.keys(profileSample[0]))
    } else {
      console.log('   No data in profiles table')
    }
    console.log('')

    // 2. Check hotels table structure
    console.log('2. 🏨 hotels table structure...')
    const { data: hotelSample, error: hotelError } = await supabase
      .from('hotels')
      .select('*')
      .limit(1)

    if (hotelError) {
      console.log('❌ Hotels error:', hotelError.message)
    } else if (hotelSample.length > 0) {
      console.log('   Columns:', Object.keys(hotelSample[0]))
    } else {
      console.log('   No data in hotels table')
    }
    console.log('')

    // 3. Check specific user
    console.log('3. 🔍 Check specific user...')
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', 'df59b8ba-52e6-4d4d-b050-6f63d83446e3')
      .single()

    if (userError) {
      console.log('❌ User error:', userError.message)
    } else {
      console.log('   User data:')
      Object.keys(userData).forEach(key => {
        console.log(`     ${key}: ${userData[key]}`)
      })
    }
    console.log('')

    // 4. Raw SQL query to check table info
    console.log('4. 📋 Table information from information_schema...')
    console.log('   (This might not work with RLS, but worth trying)')

    try {
      const { data: tableInfo, error: sqlError } = await supabase
        .rpc('sql', {
          query: `
            SELECT table_name, column_name, data_type
            FROM information_schema.columns
            WHERE table_name IN ('profiles', 'hotels')
            ORDER BY table_name, ordinal_position
          `
        })

      if (sqlError) {
        console.log('   ❌ SQL info error:', sqlError.message)
      } else {
        console.log('   Table structure:')
        tableInfo.forEach(row => {
          console.log(`     ${row.table_name}.${row.column_name} (${row.data_type})`)
        })
      }
    } catch (e) {
      console.log('   ⚠️ Cannot query information_schema with current client')
    }

    console.log('')
    console.log('🎯 Summary:')
    console.log('   Use the column names shown above for the next fix script')

  } catch (error) {
    console.error('💥 Error:', error.message)
  }
}

checkSchema().catch(console.error)