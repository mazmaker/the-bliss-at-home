#!/usr/bin/env node
/**
 * RUN BOOKINGS RLS - Direct execution via service role
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function runBookingsRLS() {
  console.log('🔧 RUNNING BOOKINGS RLS POLICIES...')

  try {
    // Try using built-in query function
    const policies = [
      // Drop existing
      `DROP POLICY IF EXISTS "hotel_users_can_insert_bookings" ON bookings`,
      `DROP POLICY IF EXISTS "hotel_users_can_view_bookings" ON bookings`,
      `DROP POLICY IF EXISTS "hotel_users_can_update_bookings" ON bookings`,

      // Create new
      `CREATE POLICY "hotel_users_can_insert_bookings" ON bookings
       FOR INSERT TO authenticated
       WITH CHECK (
         EXISTS (
           SELECT 1 FROM profiles
           WHERE profiles.id = auth.uid()
           AND profiles.role = 'HOTEL'
         )
       )`,

      `CREATE POLICY "hotel_users_can_view_bookings" ON bookings
       FOR SELECT TO authenticated
       USING (
         EXISTS (
           SELECT 1 FROM profiles
           WHERE profiles.id = auth.uid()
           AND profiles.role IN ('HOTEL', 'ADMIN')
         )
       )`,

      `CREATE POLICY "hotel_users_can_update_bookings" ON bookings
       FOR UPDATE TO authenticated
       USING (
         EXISTS (
           SELECT 1 FROM profiles
           WHERE profiles.id = auth.uid()
           AND profiles.role IN ('HOTEL', 'ADMIN')
         )
       )
       WITH CHECK (
         EXISTS (
           SELECT 1 FROM profiles
           WHERE profiles.id = auth.uid()
           AND profiles.role IN ('HOTEL', 'ADMIN')
         )
       )`
    ]

    console.log('📝 Executing policies...')

    for (const [i, sql] of policies.entries()) {
      console.log(`   ${i+1}. ${sql.split('\n')[0]}...`)

      try {
        // Use a simple query approach
        const { error } = await supabase.rpc('query', { sql })

        if (!error) {
          console.log('      ✅ Success!')
        } else {
          console.log('      ❌ Error:', error.message)

          // Try alternative approaches
          console.log('      🔄 Trying alternative...')

          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_KEY
            },
            body: JSON.stringify({ sql })
          })

          if (response.ok) {
            console.log('      ✅ Alternative worked!')
          } else {
            const errorText = await response.text()
            console.log('      ❌ Alternative failed:', errorText)
          }
        }
      } catch (e) {
        console.log('      ❌ Exception:', e.message)
      }
    }

    console.log('\n🎯 TESTING FINAL RESULT...')

    // Test with service role
    const testBooking = {
      service_id: 'dd5b056a-ff2c-44ab-9262-99289fdea0ae',
      booking_date: new Date().toISOString(),
      booking_time: new Date().toTimeString().split(' ')[0],
      duration: 60,
      base_price: 500.00,
      final_price: 500.00,
      status: 'pending'
    }

    const { data: testResult, error: testError } = await supabase
      .from('bookings')
      .insert(testBooking)
      .select()

    if (testError) {
      console.log('❌ Test booking failed:', testError.message)
    } else {
      console.log('✅ Test booking successful:', testResult[0]?.id)

      // Clean up
      if (testResult[0]?.id) {
        await supabase.from('bookings').delete().eq('id', testResult[0].id)
        console.log('🧹 Cleaned up')
      }
    }

    console.log('\n🚀 COMPLETION!')
    console.log('Try creating a booking in Hotel App now!')

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

runBookingsRLS()