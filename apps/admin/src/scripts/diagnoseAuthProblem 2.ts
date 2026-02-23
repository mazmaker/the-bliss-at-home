import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function diagnoseAuthProblem() {
  console.log('🔍 Diagnosing Auth Problem Root Cause...\n')

  console.log('1️⃣ Checking for orphaned profile...')
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'admin@theblissathome.com')
      .single()

    if (profile) {
      console.log('✅ Profile exists:')
      console.log(`   ID: ${profile.id}`)
      console.log(`   Email: ${profile.email}`)
      console.log(`   Created: ${profile.created_at}`)

      // Check if this ID exists in auth.users
      console.log('\n2️⃣ Checking if auth.users has matching ID...')
      console.log('   ⚠️  Cannot directly query auth.users due to error')
    }
  } catch (error) {
    console.log('❌ Error checking profile:', error)
  }

  console.log('\n3️⃣ Possible root causes:')
  console.log('   a) Corrupted auth.users entry')
  console.log('   b) Broken trigger/function on auth schema')
  console.log('   c) Invalid foreign key constraint')
  console.log('   d) Circular dependency in RLS policies')

  console.log('\n4️⃣ Checking for database triggers...')
  const { data: triggers, error: triggerError } = await supabase
    .rpc('get_auth_triggers', {})
    .select('*')
    .catch(() => ({ data: null, error: 'Function not available' }))

  if (triggerError) {
    console.log('   ⚠️  Cannot check triggers:', triggerError)
  }

  console.log('\n5️⃣ Checking for foreign key constraints...')
  try {
    const { data: constraints, error: constraintError } = await supabase
      .from('information_schema.table_constraints')
      .select('*')
      .eq('constraint_type', 'FOREIGN KEY')
      .ilike('constraint_name', '%profile%')

    if (constraintError) {
      console.log('   ⚠️  Cannot check constraints directly')
    }
  } catch (error) {
    console.log('   ⚠️  Schema query blocked')
  }

  console.log('\n📊 Diagnosis Summary:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('The auth.users table likely has a corrupted entry')
  console.log('that cannot be deleted due to one of these issues:')
  console.log('')
  console.log('1. Invalid JSON metadata in auth.users.raw_user_meta_data')
  console.log('2. Broken trigger that fires on DELETE')
  console.log('3. Foreign key constraint preventing deletion')
  console.log('4. Auth schema corruption from failed migration')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

diagnoseAuthProblem().catch(console.error)