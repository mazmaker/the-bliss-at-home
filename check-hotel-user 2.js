/**
 * Check Hotel User in Database
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkHotelUser() {
  console.log('🔍 Checking Hotel Users in Database...')

  try {
    // Check profiles table for hotel users
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'HOTEL')
      .limit(10)

    if (error) {
      console.error('Error fetching profiles:', error)
      return
    }

    console.log(`\n📊 Found ${profiles.length} hotel users:`)
    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. Email: ${profile.email}`)
      console.log(`   ID: ${profile.id}`)
      console.log(`   Hotel ID: ${profile.hotel_id}`)
      console.log(`   Created: ${profile.created_at}`)
      console.log('')
    })

    if (profiles.length > 0) {
      console.log('💡 Use one of these emails for testing')
      console.log('   Password is likely the default or one you set previously')
    }

  } catch (error) {
    console.error('💥 Error:', error.message)
  }
}

checkHotelUser()