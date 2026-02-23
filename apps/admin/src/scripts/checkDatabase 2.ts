import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

if (!supabaseServiceRoleKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function checkDatabase() {
  console.log('🔍 Checking database structure...\n')

  // 1. Check if profiles table exists
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'profiles')

  if (tablesError) {
    console.error('❌ Error checking tables:', tablesError)
    return
  }

  console.log('✅ Profiles table exists:', tables?.length > 0)

  // 2. Check profiles table columns
  const { data: columns, error: columnsError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_schema', 'public')
    .eq('table_name', 'profiles')

  if (columnsError) {
    console.error('❌ Error checking columns:', columnsError)
    return
  }

  console.log('\n📋 Profiles table columns:')
  columns?.forEach(col => {
    console.log(`  - ${col.column_name}: ${col.data_type}`)
  })

  // 3. Check RLS policies
  const { data: policies, error: policiesError } = await supabase
    .rpc('get_policies', { table_name: 'profiles' })
    .select('*')

  if (policiesError) {
    // Try alternative method
    const { data: altPolicies, error: altError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'profiles')

    if (altError) {
      console.log('\n⚠️  Could not fetch RLS policies')
    } else {
      console.log('\n🔐 RLS Policies for profiles:')
      altPolicies?.forEach(policy => {
        console.log(`  - ${policy.policyname}`)
      })
    }
  } else {
    console.log('\n🔐 RLS Policies for profiles:')
    policies?.forEach(policy => {
      console.log(`  - ${policy.policyname}`)
    })
  }

  // 4. Check admin profile
  const { data: adminProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'admin@theblissathome.com')
    .single()

  if (profileError) {
    console.error('\n❌ Error fetching admin profile:', profileError)
  } else {
    console.log('\n👤 Admin profile found:')
    console.log(`  - ID: ${adminProfile.id}`)
    console.log(`  - Email: ${adminProfile.email}`)
    console.log(`  - Role: ${adminProfile.role}`)
    console.log(`  - Status: ${adminProfile.status}`)
  }

  // 5. Check auth.users table for admin
  const { data: authUser, error: authError } = await supabase.auth.admin.listUsers()

  if (authError) {
    console.error('\n❌ Error fetching auth users:', authError)
  } else {
    const adminUser = authUser.users.find(u => u.email === 'admin@theblissathome.com')
    if (adminUser) {
      console.log('\n🔑 Auth user found:')
      console.log(`  - ID: ${adminUser.id}`)
      console.log(`  - Email: ${adminUser.email}`)
      console.log(`  - Created: ${adminUser.created_at}`)
    } else {
      console.log('\n⚠️  No auth user found for admin@theblissathome.com')
    }
  }
}

checkDatabase().catch(console.error)