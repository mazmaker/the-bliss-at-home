/**
 * Script to create admin user in Supabase
 * Run: node scripts/create-admin-user.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Admin credentials
const ADMIN_EMAIL = 'admin@theblissathome.com'
const ADMIN_PASSWORD = 'AdminBliss2026!'

async function createAdminUser() {
  console.log('🔐 Creating admin user...')

  try {
    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // Skip email verification
      user_metadata: {
        full_name: 'System Administrator',
        role: 'ADMIN'
      }
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('🔄 User already exists, updating profile...')

        // Get existing user
        const { data: users } = await supabase.auth.admin.listUsers()
        const existingUser = users.users.find(u => u.email === ADMIN_EMAIL)

        if (existingUser) {
          // Update password
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            { password: ADMIN_PASSWORD }
          )

          if (updateError) {
            throw updateError
          }

          console.log('✅ Updated existing user password')
          return existingUser
        }
      }
      throw authError
    }

    const user = authData.user
    console.log('✅ Auth user created:', user.email)

    // Step 2: Create/update profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: 'System Administrator',
        role: 'ADMIN',
        status: 'ACTIVE',
        language: 'th'
      })
      .select()
      .single()

    if (profileError) {
      throw profileError
    }

    console.log('✅ Profile created:', profile.email)
    console.log('')
    console.log('🎉 Admin user ready!')
    console.log('📧 Email:', ADMIN_EMAIL)
    console.log('🔑 Password:', ADMIN_PASSWORD)
    console.log('')
    console.log('Login at: http://localhost:3001/admin/login')

    return { user, profile }

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message)
    throw error
  }
}

// Run the script
createAdminUser()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })