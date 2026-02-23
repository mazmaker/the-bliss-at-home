const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Use service role for admin operations (from current .env)
const supabase = createClient(
  'https://rbdvlfriqjnwpxmmgisf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'
)

async function runServicesFix() {
  try {
    console.log('🔄 Fixing Services RLS Policy...')

    // Read the SQL file
    const sqlContent = fs.readFileSync('./fix-services-rls-direct.sql', 'utf8')
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`Found ${statements.length} SQL statements to execute`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`🔄 Executing statement ${i + 1}:`, statement.substring(0, 60) + '...')

      try {
        // Use the raw SQL functionality
        const { data, error } = await supabase.rpc('exec_sql', {
          query: statement
        })

        if (error) {
          console.log(`⚠️  Statement ${i + 1} error:`, error.message)
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`)
          if (data) {
            console.log('  Result:', data)
          }
        }
      } catch (err) {
        console.log(`⚠️  Statement ${i + 1} exception:`, err.message)
      }
    }

    // Test services access directly
    console.log('🔄 Testing services access...')

    const { data: services, error: testError } = await supabase
      .from('services')
      .select('id, name_th, name_en, is_active')
      .eq('is_active', true)
      .limit(5)

    if (testError) {
      console.log('❌ Services test failed:', testError.message)
    } else {
      console.log('✅ Services access working! Found', services.length, 'services:')
      services.forEach(service => {
        console.log(`  - ${service.name_th} (${service.name_en})`)
      })
    }

    // Test with anon key (similar to frontend)
    console.log('🔄 Testing with anon key...')

    const anonClient = createClient(
      'https://rbdvlfriqjnwpxmmgisf.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.3C5x64qKgJIHOSoICtOKnRWWqU3nf8GJIDtBrCILafw'
    )

    const { data: anonServices, error: anonError } = await anonClient
      .from('services')
      .select('id, name_th, name_en')
      .eq('is_active', true)
      .limit(3)

    if (anonError) {
      console.log('❌ Anon services access failed:', anonError.message)
    } else {
      console.log('✅ Anon services access working! Found', anonServices.length, 'services')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

runServicesFix()