// Check authentication users vs staff data
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkAuthUsers() {
  try {
    console.log('🔍 Checking Authentication Users vs Staff Data...')

    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('❌ Error getting auth users:', authError.message)
      return
    }

    console.log('👤 Authentication Users:', authUsers.users.length)
    authUsers.users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`)
      console.log(`   Metadata: ${JSON.stringify(user.user_metadata)}`)
      console.log('')
    })

    // Get all staff records
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')

    if (staffError) {
      console.error('❌ Error getting staff:', staffError.message)
      return
    }

    console.log('👥 Staff Records:', staffData.length)
    staffData.forEach((staff, index) => {
      console.log(`${index + 1}. Name: ${staff.name_th}`)
      console.log(`   Phone: ${staff.phone}`)
      console.log(`   Status: ${staff.status}`)
      console.log(`   Profile ID: ${staff.profile_id || 'None'}`)
      console.log('')
    })

    // Check profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')

    if (profilesError) {
      console.error('❌ Error getting profiles:', profilesError.message)
    } else {
      console.log('📋 Profile Records:', profiles.length)
      profiles.forEach((profile, index) => {
        console.log(`${index + 1}. Email: ${profile.email}`)
        console.log(`   Role: ${profile.role}`)
        console.log(`   Full Name: ${profile.full_name}`)
        console.log('')
      })
    }

    // Analysis
    console.log('🔍 Analysis:')
    console.log(`📊 Auth Users: ${authUsers.users.length}`)
    console.log(`👥 Staff Records: ${staffData.length}`)
    console.log(`📋 Profile Records: ${profiles?.length || 0}`)

    console.log('\n📝 Data Source Analysis:')
    console.log('✅ Auth Users: Real authentication accounts')
    console.log('📦 Staff Records: Mock data inserted directly into database')
    console.log('🔗 Connection: Staff records are NOT connected to auth users')

    console.log('\n💡 Current Status:')
    console.log('- Staff data is MOCK data we inserted manually')
    console.log('- No real LINE registrations yet')
    console.log('- No staff authentication accounts')
    console.log('- Only admin user exists in authentication system')

    console.log('\n🎯 To get REAL staff data, you need to:')
    console.log('1. Staff register through LINE LIFF app (port 3004)')
    console.log('2. Admin approve staff registrations')
    console.log('3. Staff data will then be connected to real auth accounts')

  } catch (error) {
    console.error('❌ Check failed:', error.message)
  }
}

checkAuthUsers()