import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixOriginalAdmin() {
  console.log('🔧 Fixing original admin user...\n')

  const targetEmail = 'admin@theblissathome.com'
  const targetId = '6d5eee8b-799b-4eb4-8650-d43eadd0fd6f'
  const newPassword = 'AdminBliss2026!' // กำหนดรหัสผ่านใหม่

  try {
    // Step 1: ค้นหา auth user เดิม
    console.log('1️⃣ Searching for existing auth user...')
    const { data: { users }, error: searchError } = await supabase.auth.admin.listUsers()

    if (searchError) {
      console.error('❌ Error listing users:', searchError)
      return
    }

    const existingUser = users.find(u => u.email === targetEmail)

    if (existingUser) {
      console.log(`✅ Found existing auth user: ${existingUser.id}`)

      // Step 2: ลบ auth user เดิม
      console.log('2️⃣ Deleting old auth user...')
      const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id)

      if (deleteError) {
        console.error('❌ Error deleting user:', deleteError)
        return
      }
      console.log('✅ Old auth user deleted')
    } else {
      console.log('ℹ️ No existing auth user found')
    }

    // Step 3: สร้าง auth user ใหม่ด้วย ID ที่ต้องการ
    console.log('3️⃣ Creating new auth user with specific ID...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: targetEmail,
      password: newPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'ผู้ดูแลระบบ',
        role: 'ADMIN'
      }
    })

    if (authError) {
      console.error('❌ Error creating auth user:', authError)
      return
    }

    const newAuthId = authData.user!.id
    console.log(`✅ New auth user created: ${newAuthId}`)

    // Step 4: อัปเดต profile ให้ใช้ auth ID ใหม่
    console.log('4️⃣ Updating profile to match new auth ID...')

    // ลบ profile เดิม (ถ้ามี)
    await supabase
      .from('profiles')
      .delete()
      .eq('id', targetId)

    // สร้าง profile ใหม่ด้วย auth ID ใหม่
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newAuthId,
        email: targetEmail,
        full_name: 'ผู้ดูแลระบบ',
        role: 'ADMIN',
        status: 'ACTIVE',
        language: 'th',
        phone: '0812345678'
      })
      .select()
      .single()

    if (profileError) {
      console.error('❌ Error creating profile:', profileError)
      // ถ้าสร้าง profile ไม่สำเร็จ ให้ลบ auth user
      await supabase.auth.admin.deleteUser(newAuthId)
      return
    }

    console.log('✅ Profile created successfully!')

    console.log('\n🎉 Original admin fixed!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Email: ${targetEmail}`)
    console.log(`Password: ${newPassword}`)
    console.log(`Auth ID: ${newAuthId}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n✨ You can now login with these credentials!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the fix
fixOriginalAdmin().catch(console.error)