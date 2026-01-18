import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTestUsers() {
  console.log('Creating test users...')

  const users = [
    { email: 'admin@bliss.test', password: 'Admin123!', fullName: 'Admin User', role: 'ADMIN', phone: '+66812345678' },
    { email: 'customer@bliss.test', password: 'Customer123!', fullName: 'Customer User', role: 'CUSTOMER', phone: '+66823456789' },
    { email: 'hotel@bliss.test', password: 'Hotel123!', fullName: 'Hotel Manager', role: 'HOTEL', phone: '+66834567890' },
    { email: 'staff@bliss.test', password: 'Staff123!', fullName: 'Staff User', role: 'STAFF', phone: '+66845678901' },
  ]

  for (const user of users) {
    try {
      // Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            full_name: user.fullName,
            role: user.role,
          },
        },
      })

      if (authError) {
        console.log(`User ${user.email} already exists or error:`, authError.message)
      } else {
        console.log(`Created auth user: ${user.email}`)
      }

      // Get user ID
      let userId = authData?.user?.id
      
      if (!userId) {
        // Try to get existing user
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', user.email)
          .single()
        userId = existingUser?.id
      }

      if (userId) {
        // Update or create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            email: user.email,
            full_name: user.fullName,
            role: user.role,
            status: 'ACTIVE',
            phone: user.phone,
            language: 'th',
            updated_at: new Date().toISOString(),
          })

        if (profileError) {
          console.error(`Error creating profile for ${user.email}:`, profileError)
        } else {
          console.log(`✓ ${user.email} - ${user.role}`)
        }
      }
    } catch (err) {
      console.error(`Error with ${user.email}:`, err.message)
    }
  }

  console.log('\nVerifying users...')
  const { data: profiles } = await supabase
    .from('profiles')
    .select('email, full_name, role, status, phone')
    .like('email', '%@bliss.test')
    .order('role')

  console.table(profiles)
}

createTestUsers().then(() => console.log('Done!'))
