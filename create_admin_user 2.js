// Script to create admin user for testing
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createAdminUser() {
  try {
    console.log('Creating admin user...')

    // Create user with Supabase Auth Admin API
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email: 'admin@theblissathome.com',
      password: 'admin123',
      email_confirm: true,
      user_metadata: {
        full_name: 'ผู้ดูแลระบบ',
        role: 'ADMIN'
      }
    })

    if (createError) {
      console.error('Error creating user:', createError.message)
      return
    }

    console.log('User created:', user)

    // Update the profile that was auto-created
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'ADMIN',
        full_name: 'ผู้ดูแลระบบ',
        phone: '0812345678'
      })
      .eq('id', user.user.id)

    if (updateError) {
      console.error('Error updating profile:', updateError.message)
      return
    }

    console.log('✅ Admin user created successfully!')
    console.log('Email: admin@theblissathome.com')
    console.log('Password: admin123')

  } catch (error) {
    console.error('Error:', error.message)
  }
}

createAdminUser()