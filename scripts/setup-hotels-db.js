#!/usr/bin/env node

/**
 * Setup Hotels Management Database
 * This script will execute SQL to create tables and insert mock data
 *
 * Usage: node scripts/setup-hotels-db.js
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  console.log('\n📝 To get your service role key:')
  console.log('1. Go to https://app.supabase.com/project/rbdvlfriqjnwpxmmgisf/settings/api')
  console.log('2. Copy the "service_role" key (NOT the anon key)')
  console.log('3. Run: set SUPABASE_SERVICE_ROLE_KEY=your-service-key')
  console.log('4. Then run this script again\n')
  process.exit(1)
}

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeSqlFile() {
  try {
    console.log('📖 Reading SQL file...')
    const sqlPath = join(__dirname, '..', 'supabase', 'setup_hotels_management.sql')
    const sql = readFileSync(sqlPath, 'utf8')

    console.log('🚀 Executing SQL statements...\n')

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'

      // Skip comment-only statements
      if (statement.trim().startsWith('--')) continue

      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement })

        if (error) throw error

        successCount++
        process.stdout.write('.')

        if ((successCount + errorCount) % 50 === 0) {
          process.stdout.write('\n')
        }
      } catch (err) {
        errorCount++
        console.error(`\n❌ Error executing statement ${i + 1}:`, err.message)
      }
    }

    console.log('\n\n✅ Database setup completed!')
    console.log(`📊 Success: ${successCount} statements`)
    if (errorCount > 0) {
      console.log(`⚠️  Errors: ${errorCount} statements`)
    }
    console.log('\n🎉 Hotels Management tables created and populated with mock data!')
    console.log('\n🔗 You can now test at: http://localhost:3005/admin/hotels\n')

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message)
    process.exit(1)
  }
}

executeSqlFile()
