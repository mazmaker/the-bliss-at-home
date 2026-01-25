/**
 * Script to update existing admin user profile
 * Run: npx tsx apps/admin/src/scripts/updateAdminProfile.ts
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
const adminUserId = '6d5eee8b-799b-4eb4-8650-d43eadd0fd6f'
const adminProfile = {
  email: 'admin@theblissathome.com',
  role: 'ADMIN',
  full_name: 'ผู้ดูแลระบบ',
  phone: '0812345678',
  status: 'ACTIVE',
}

async function updateAdminProfile() {
  try {
    console.log('🔄 Updating admin profile...')

    // Check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', adminUserId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    if (!existingProfile) {
      // Create new profile
      console.log('📝 Creating new admin profile...')
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: adminUserId,
          ...adminProfile,
        })

      if (createError) {
        throw createError
      }

      console.log('✅ Admin profile created successfully!')
    } else {
      // Update existing profile
      console.log('📝 Updating existing profile...')
      const { error: updateError } = await supabase
        .from('profiles')
        .update(adminProfile)
        .eq('id', adminUserId)

      if (updateError) {
        throw updateError
      }

      console.log('✅ Admin profile updated successfully!')
    }

    // Verify the profile
    const { data: updatedProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', adminUserId)
      .single()

    if (verifyError) {
      throw verifyError
    }

    console.log('\n📊 Admin Profile Details:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('ID:', updatedProfile.id)
    console.log('Email:', updatedProfile.email)
    console.log('Role:', updatedProfile.role)
    console.log('Name:', updatedProfile.full_name)
    console.log('Phone:', updatedProfile.phone)
    console.log('Status:', updatedProfile.status)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Run the script
updateAdminProfile().then(() => {
  console.log('\n✨ Admin profile is ready!')
  console.log('📧 Login Email: admin@theblissathome.com')
  console.log('🔑 Password: Use the password you set in Supabase')
  console.log('🌐 Login URL: http://localhost:3001/admin/login')
  process.exit(0)
})