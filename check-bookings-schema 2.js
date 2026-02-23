#!/usr/bin/env node
/**
 * Check Bookings Table Schema
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkBookingsSchema() {
  console.log('📋 CHECKING BOOKINGS TABLE SCHEMA...')

  try {
    // Check columns in bookings table
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'bookings')
      .eq('table_schema', 'public')

    if (error) {
      console.log('❌ Error checking schema:', error.message)
      return
    }

    if (columns && columns.length > 0) {
      console.log(`✅ Found ${columns.length} columns in bookings table:`)
      columns.forEach((col, i) => {
        const nullable = col.is_nullable === 'YES' ? '(optional)' : '(required)'
        console.log(`  ${i+1}. ${col.column_name} - ${col.data_type} ${nullable}`)
      })
    } else {
      console.log('❌ No columns found or table does not exist')
    }

    // Also try to get one existing booking to see the actual structure
    console.log('\n📝 CHECKING EXISTING BOOKING STRUCTURE...')
    const { data: sampleBooking, error: sampleError } = await supabase
      .from('bookings')
      .select('*')
      .limit(1)

    if (sampleError) {
      console.log('❌ Error fetching sample:', sampleError.message)
    } else if (sampleBooking && sampleBooking.length > 0) {
      console.log('✅ Sample booking structure:')
      console.log(JSON.stringify(sampleBooking[0], null, 2))
    } else {
      console.log('ℹ️  No existing bookings found')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkBookingsSchema()