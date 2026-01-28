import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function syncAdminProfile() {
  console.log('🔄 Syncing admin profile after manual user creation...\n')

  const targetEmail = 'admin@theblissathome.com'

  try {
    // Step 1: Get the new auth user ID from Supabase Dashboard
    console.log('ℹ️ Make sure you have created the user in Supabase Dashboard first!')
    console.log('   Email: admin@theblissathome.com')
    console.log('   Password: Your choice (e.g., AdminBliss2026!)\n')

    // Wait a bit for user input
    console.log('⏳ Waiting 3 seconds before checking...\n')
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Step 2: Delete old profile
    console.log('1️⃣ Cleaning up old profiles...')
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('email', targetEmail)

    if (deleteError) {
      console.log('⚠️ No old profile to delete or error:', deleteError.message)
    } else {
      console.log('✅ Old profile cleaned up')
    }

    // Step 3: Get auth user ID (if possible)
    console.log('\n2️⃣ Please enter the User ID from Supabase Dashboard')
    console.log('   (You can find it in Authentication → Users → Click on the user)')
    console.log('   Or just run: pnpm tsx src/scripts/syncAdminProfile.ts <USER_ID>')

    const userId = process.argv[2]

    if (!userId) {
      console.log('\n⚠️ No User ID provided. Please run:')
      console.log('   pnpm tsx src/scripts/syncAdminProfile.ts YOUR_USER_ID')
      console.log('\nExample:')
      console.log('   pnpm tsx src/scripts/syncAdminProfile.ts 123e4567-e89b-12d3-a456-426614174000')
      return
    }

    // Step 4: Create new profile
    console.log('\n3️⃣ Creating new profile...')
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
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
      return
    }

    console.log('✅ Profile created successfully!')
    console.log('\n🎉 Admin user is ready!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Email: ${targetEmail}`)
    console.log(`User ID: ${userId}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n✨ You can now login at http://localhost:3001/admin/login')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the sync
syncAdminProfile().catch(console.error)