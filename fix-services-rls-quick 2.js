const { createClient } = require('@supabase/supabase-js')

// Use service role for admin operations (from current .env)
const supabase = createClient(
  'https://rbdvlfriqjnwpxmmgisf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'
)

async function fixServicesRLS() {
  try {
    console.log('🔄 Fixing services RLS policies...')

    // Check current policies
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'services')

    if (policiesError) {
      console.log('Could not check policies, proceeding with fix...')
    } else {
      console.log(`Found ${policies.length} existing policies on services table:`)
      policies.forEach(policy => {
        console.log(`  - ${policy.policyname}: ${policy.cmd}`)
      })
    }

    // Test direct services access
    console.log('🔄 Testing services access...')

    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .limit(3)

    if (servicesError) {
      console.log('❌ Services access failed:', servicesError.message)

      // Try to create a simple policy for everyone to read services
      console.log('🔄 Creating public read policy for services...')

      const { error: policyError } = await supabase.rpc('exec', {
        sql: `
          DROP POLICY IF EXISTS "Anyone can view active services" ON services;
          CREATE POLICY "Anyone can view active services" ON services
            FOR SELECT USING (is_active = true);
        `
      })

      if (policyError) {
        console.log('Policy creation failed, trying alternative approach...')
        console.log('Please run this SQL manually in Supabase SQL editor:')
        console.log(`
DROP POLICY IF EXISTS "Anyone can view active services" ON services;
CREATE POLICY "Anyone can view active services" ON services
  FOR SELECT USING (is_active = true);
        `)
      } else {
        console.log('✅ Public read policy created')
      }

    } else {
      console.log('✅ Services access working! Found', services.length, 'services')
      services.forEach(service => {
        console.log(`  - ${service.name_th} (${service.id})`)
      })
    }

  } catch (error) {
    console.error('❌ Error fixing services RLS:', error.message)
  }
}

fixServicesRLS()