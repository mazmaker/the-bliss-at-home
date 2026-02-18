/**
 * Test Multiple Login Attempts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const testCredentials = [
  { email: 'reservations@hilton.com', password: '123456' },
  { email: 'reservations@hilton.com', password: 'password' },
  { email: 'reservations@hilton.com', password: 'Password123!' },
  { email: 'reservations@hilton.com', password: 'HiltonPassword123!' },
  { email: 'sweettuay.bt@gmail.com', password: '123456' },
  { email: 'sweettuay.bt@gmail.com', password: 'password' },
  { email: 'info@dusit.com', password: '123456' },
]

async function testLogins() {
  console.log('🔑 Testing Multiple Login Credentials...')
  console.log('=====================================')

  for (const creds of testCredentials) {
    console.log(`\n🧪 Trying: ${creds.email} / ${creds.password}`)

    try {
      const { data, error } = await supabase.auth.signInWithPassword(creds)

      if (error) {
        console.log(`   ❌ ${error.message}`)
      } else if (data.session) {
        console.log(`   ✅ SUCCESS! Valid credentials found`)
        console.log(`   User ID: ${data.session.user.id}`)
        console.log(`   Access Token: ${data.session.access_token ? 'Present' : 'Missing'}`)
        return creds
      }
    } catch (err) {
      console.log(`   💥 Error: ${err.message}`)
    }
  }

  console.log('\n❌ No valid credentials found')
  return null
}

testLogins()