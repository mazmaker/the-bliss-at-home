/**
 * Script to create admin user in Supabase
 * Run: npx tsx apps/admin/src/scripts/createAdminUser.ts
 */

import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required')
  console.log('Get it from: https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/settings/api')
  process.exit(1)
}

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
})

// Admin user details
const adminUser = {
  email: 'admin@theblissathome.com',
  password: 'Admin123456!',
  fullName: 'ผู้ดูแลระบบ',
  phone: '0812345678',
}

async function createAdminUser() {
  try {
    console.log('🔐 Creating admin user...')

    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminUser.email,
      password: adminUser.password,
      email_confirm: true,
    })

    if (authError) {
      // Check if user already exists
      if (authError.message.includes('already been registered')) {
        console.log('ℹ️  User already exists, updating profile...')

        // Get existing user
        const { data: { users }, error: getUserError } = await supabase.auth.admin.listUsers()
        if (getUserError) throw getUserError

        const existingUser = users.find(u => u.email === adminUser.email)
        if (!existingUser) throw new Error('Could not find existing user')

        // Update profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            role: 'ADMIN',
            full_name: adminUser.fullName,
            phone: adminUser.phone,
            status: 'ACTIVE',
          })
          .eq('id', existingUser.id)

        if (updateError) throw updateError

        console.log('✅ Admin profile updated successfully!')
        return
      }

      throw authError
    }

    if (!authData.user) {
      throw new Error('No user data returned')
    }

    console.log('✅ Auth user created:', authData.user.email)

    // Step 2: Create/Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: adminUser.email,
        role: 'ADMIN',
        full_name: adminUser.fullName,
        phone: adminUser.phone,
        status: 'ACTIVE',
      })

    if (profileError) {
      console.error('❌ Profile error:', profileError)
      throw profileError
    }

    console.log('✅ Admin user created successfully!')
    console.log('📧 Email:', adminUser.email)
    console.log('🔑 Password:', adminUser.password)
    console.log('👤 Role: ADMIN')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Run the script
createAdminUser().then(() => {
  console.log('\n✨ Done!')
  process.exit(0)
})