const { createClient } = require('@supabase/supabase-js')

// Use service role for admin operations (from current .env)
const supabase = createClient(
  'https://rbdvlfriqjnwpxmmgisf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'
)

async function fixServicesRLSForUsers() {
  try {
    console.log('🔄 Creating broad services access policy...')

    // Create a comprehensive policy that allows all authenticated users to read services
    const policyQueries = [
      // Drop any conflicting policies
      `DROP POLICY IF EXISTS "Anyone can view services" ON services;`,
      `DROP POLICY IF EXISTS "Anyone can view active services" ON services;`,
      `DROP POLICY IF EXISTS "Public can view services" ON services;`,
      `DROP POLICY IF EXISTS "Authenticated can view services" ON services;`,

      // Create a new policy for all authenticated users
      `CREATE POLICY "Authenticated users can view services" ON services
         FOR SELECT USING (auth.role() = 'authenticated');`
    ]

    for (const query of policyQueries) {
      console.log('🔄 Running:', query.substring(0, 50) + '...')

      const { error } = await supabase.rpc('exec', { sql: query })

      if (error && !error.message.includes('does not exist')) {
        console.log('⚠️  Query failed:', error.message)
      } else {
        console.log('✅ Query succeeded')
      }
    }

    // Test with authenticated context
    console.log('🔄 Testing services access with user session...')

    // Switch to using anon key instead of service role for testing
    const userSupabase = createClient(
      'https://rbdvlfriqjnwpxmmgisf.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.3C5x64qKgJIHOSoICtOKnRWWqU3nf8GJIDtBrCILafw'
    )

    const { data: services, error: servicesError } = await userSupabase
      .from('services')
      .select('*')
      .limit(3)

    if (servicesError) {
      console.log('❌ User services access still failing:', servicesError.message)
      console.log('🔄 Creating even broader policy...')

      // Try the most permissive policy
      const broadPolicy = `
        DROP POLICY IF EXISTS "Authenticated users can view services" ON services;
        CREATE POLICY "Public can view services" ON services
          FOR SELECT USING (true);
      `

      const { error: broadError } = await supabase.rpc('exec', { sql: broadPolicy })
      if (broadError) {
        console.log('❌ Broad policy creation failed:', broadError.message)
      } else {
        console.log('✅ Created broad public policy')
      }

    } else {
      console.log('✅ User services access working! Found', services.length, 'services')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

fixServicesRLSForUsers()