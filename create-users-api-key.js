import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'

// Go to Supabase Dashboard > Settings > API > service_role (secret)
// Copy and paste the service_role key below
const serviceRoleKey = 'YOUR_SERVICE_ROLE_KEY_HERE'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function createUsers() {
  console.log('🚀 Creating test users...\n')

  const users = [
    { email: 'admin@bliss.test', password: 'Admin123!', fullName: 'Admin User', role: 'ADMIN', phone: '+66812345678' },
    { email: 'customer@bliss.test', password: 'Customer123!', fullName: 'Customer User', role: 'CUSTOMER', phone: '+66823456789' },
    { email: 'hotel@bliss.test', password: 'Hotel123!', fullName: 'Hotel Manager', role: 'HOTEL', phone: '+66834567890' },
    { email: 'staff@bliss.test', password: 'Staff123!', fullName: 'Staff User', role: 'STAFF', phone: '+66845678901' },
  ]

  if (serviceRoleKey === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.error('❌ Please update serviceRoleKey in this file first!')
    console.log('\nGet the key from: https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/settings/api')
    process.exit(1)
  }

  for (const user of users) {
    try {
      // Create user with admin API
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.fullName,
          role: user.role,
        },
      })

      if (error) {
        if (error.message.includes('already been registered')) {
          console.log(`⚠️  ${user.email} already exists, updating profile...`)
          
          // Get existing user
          const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', user.email)
            .single()
          
          if (existing) {
            await supabase
              .from('profiles')
              .update({
                full_name: user.fullName,
                role: user.role,
                status: 'ACTIVE',
                phone: user.phone,
                language: 'th',
              })
              .eq('id', existing.id)
            console.log(`✓ Updated ${user.email} as ${user.role}`)
          }
        } else {
          console.error(`❌ Error creating ${user.email}:`, error.message)
        }
      } else {
        console.log(`✓ Created ${user.email} (${data.user.id})`)
        
        // Update profile
        await supabase
          .from('profiles')
          .update({
            full_name: user.fullName,
            role: user.role,
            status: 'ACTIVE',
            phone: user.phone,
            language: 'th',
          })
          .eq('id', data.user.id)
      }
    } catch (err) {
      console.error(`❌ Error with ${user.email}:`, err.message)
    }
  }

  console.log('\n📊 Verifying users...\n')
  
  const { data: profiles } = await supabase
    .from('profiles')
    .select('email, full_name, role, status, phone')
    .like('email', '%@bliss.test')
    .order('role')

  if (profiles) {
    console.table(profiles)
  }

  console.log('\n✨ Done! You can now login with these accounts.')
}

createUsers().catch(console.error)
