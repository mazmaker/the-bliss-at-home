/**
 * Check Test User Profile
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkTestUser() {
  console.log('🔍 Checking Test User Profile...')

  const testUserId = '23781861-9b8f-4039-bda0-e5b20f968a98'

  try {
    // Check profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', testUserId)
      .single()

    if (error) {
      console.log('❌ Profile not found:', error.message)

      // Create profile
      console.log('🛠️ Creating profile...')
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: testUserId,
          email: 'test-hotel@thebliss.com',
          role: 'HOTEL',
          full_name: 'Test Hotel User'
        })

      if (createError) {
        console.error('❌ Profile creation failed:', createError)
        return
      }

      console.log('✅ Profile created successfully!')
    } else {
      console.log('✅ Profile exists:')
      console.log(`   Email: ${profile.email}`)
      console.log(`   Role: ${profile.role}`)
      console.log(`   Full Name: ${profile.full_name}`)
    }

  } catch (error) {
    console.error('💥 Error:', error.message)
  }
}

checkTestUser()