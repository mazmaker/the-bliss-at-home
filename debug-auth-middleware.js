/**
 * Debug Authentication Middleware
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

async function debugAuth() {
  console.log('🔍 Debug Authentication Flow...')

  // Step 1: Login
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test-hotel@thebliss.com',
    password: 'TestPassword123!'
  })

  if (error || !data.session) {
    console.error('❌ Login failed')
    return
  }

  const token = data.session.access_token
  console.log('✅ Login successful, token length:', token.length)

  // Step 2: Test server auth middleware
  const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })

  console.log('\n🧪 Testing userSupabase.auth.getUser()...')
  const { data: { user }, error: authError } = await userSupabase.auth.getUser()

  if (authError) {
    console.error('❌ Auth getUser failed:', authError)
    return
  }

  console.log('✅ Auth getUser success:', user.id)

  // Step 3: Test profile lookup with service role
  console.log('\n🧪 Testing profile lookup with service role...')
  const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const { data: profile, error: profileError } = await serviceSupabase
    .from('profiles')
    .select('id, role, email')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('❌ Profile lookup failed:', profileError)
    return
  }

  console.log('✅ Profile found:', profile)
  console.log('\n🎯 Authentication flow should work!')
}

debugAuth()