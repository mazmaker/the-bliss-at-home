import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

async function testAuth() {
  console.log('🔍 Testing Authentication...\n')

  // Test with anon key first
  const anonClient = createClient(supabaseUrl, supabaseAnonKey)

  console.log('1️⃣ Testing sign in with anon key...')
  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email: 'admin@theblissathome.com',
    password: 'test123456' // This will fail but we want to see the error
  })

  if (signInError) {
    console.log('❌ Sign in error:', signInError.message)
    console.log('   Error details:', JSON.stringify(signInError, null, 2))
  } else {
    console.log('✅ Sign in successful!')
  }

  // Test with service role key
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

  console.log('\n2️⃣ Checking profiles table with service role...')
  const { data: profiles, error: profilesError } = await serviceClient
    .from('profiles')
    .select('*')
    .limit(5)

  if (profilesError) {
    console.log('❌ Error querying profiles:', profilesError.message)
    console.log('   Error details:', JSON.stringify(profilesError, null, 2))
  } else {
    console.log(`✅ Profiles table accessible. Found ${profiles.length} profiles`)
  }

  // Check for admin profile specifically
  console.log('\n3️⃣ Checking admin profile...')
  const { data: adminProfile, error: adminError } = await serviceClient
    .from('profiles')
    .select('*')
    .eq('email', 'admin@theblissathome.com')
    .single()

  if (adminError) {
    console.log('❌ Error fetching admin profile:', adminError.message)
  } else {
    console.log('✅ Admin profile found:')
    console.log(JSON.stringify(adminProfile, null, 2))
  }

  // Check auth.users
  console.log('\n4️⃣ Checking auth.users for admin...')
  try {
    const { data: { users }, error: usersError } = await serviceClient.auth.admin.listUsers({
      filter: { email: 'admin@theblissathome.com' }
    })

    if (usersError) {
      console.log('❌ Error listing users:', usersError.message)
    } else if (users && users.length > 0) {
      console.log('✅ Admin user found in auth.users:')
      console.log(`   - ID: ${users[0].id}`)
      console.log(`   - Email: ${users[0].email}`)
      console.log(`   - Created: ${users[0].created_at}`)
      console.log(`   - Confirmed: ${users[0].confirmed_at ? 'Yes' : 'No'}`)
    } else {
      console.log('⚠️  No admin user found in auth.users')
    }
  } catch (error) {
    console.log('❌ Error accessing auth.users:', error)
  }

  // Check if there's a mismatch between auth.users ID and profiles ID
  console.log('\n5️⃣ Checking for ID mismatch...')
  if (adminProfile && adminProfile.id !== '6d5eee8b-799b-4eb4-8650-d43eadd0fd6f') {
    console.log('⚠️  Profile ID mismatch!')
    console.log(`   Expected: 6d5eee8b-799b-4eb4-8650-d43eadd0fd6f`)
    console.log(`   Actual: ${adminProfile.id}`)
  }
}

testAuth().catch(console.error)