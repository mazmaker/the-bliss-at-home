import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createNewAdmin() {
  const newEmail = 'admin2@theblissathome.com'
  const newPassword = 'AdminBliss2026!'

  console.log('🔄 Creating new admin user...\n')

  try {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: newEmail,
      password: newPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'ผู้ดูแลระบบ 2',
        role: 'ADMIN'
      }
    })

    if (authError) {
      console.error('❌ Error creating auth user:', authError)
      return
    }

    console.log('✅ Auth user created:', authData.user?.id)

    // 2. Create profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user!.id,
        email: newEmail,
        full_name: 'ผู้ดูแลระบบ 2',
        role: 'ADMIN',
        status: 'ACTIVE',
        language: 'th',
        phone: '0812345679'
      })
      .select()
      .single()

    if (profileError) {
      console.error('❌ Error creating profile:', profileError)
      // Try to delete the auth user
      await supabase.auth.admin.deleteUser(authData.user!.id)
      return
    }

    console.log('✅ Profile created successfully!')
    console.log('\n📊 New Admin Details:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Email: ${newEmail}`)
    console.log(`Password: ${newPassword}`)
    console.log(`ID: ${authData.user!.id}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n✨ You can now login with these credentials!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

createNewAdmin().catch(console.error)