/**
 * Create Test Hotel User for Authentication Testing
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function createTestUser() {
  console.log('🧪 Creating Test Hotel User...')

  const testEmail = 'test-hotel@thebliss.com'
  const testPassword = 'TestPassword123!'

  try {
    // Create user in auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    })

    if (authError) {
      console.error('❌ Auth creation failed:', authError)
      return
    }

    console.log('✅ Auth user created:', authData.user.id)

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: testEmail,
        role: 'HOTEL',
        full_name: 'Test Hotel User'
      })

    if (profileError) {
      console.error('❌ Profile creation failed:', profileError)
      return
    }

    console.log('✅ Test hotel user created successfully!')
    console.log(`   Email: ${testEmail}`)
    console.log(`   Password: ${testPassword}`)
    console.log(`   User ID: ${authData.user.id}`)
    console.log('\n🧪 Ready for testing!')

  } catch (error) {
    console.error('💥 Error:', error.message)
  }
}

createTestUser()