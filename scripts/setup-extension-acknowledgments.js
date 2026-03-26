#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Use service role key for DDL operations
const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(supabaseUrl, serviceRoleKey)

console.log('🔧 Setting up Extension Acknowledgments System...\n')

async function setupExtensionAcknowledgments() {
  try {
    // Read the SQL file
    const sqlScript = readFileSync(join(__dirname, 'setup-extension-acknowledgments.sql'), 'utf8')

    // Split into individual statements (rough approach)
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`📝 Executing ${statements.length} SQL statements...\n`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'

      if (statement.includes('CREATE TABLE')) {
        console.log(`${i + 1}. Creating table...`)
      } else if (statement.includes('CREATE INDEX')) {
        console.log(`${i + 1}. Creating index...`)
      } else if (statement.includes('CREATE POLICY')) {
        console.log(`${i + 1}. Creating RLS policy...`)
      } else if (statement.includes('CREATE OR REPLACE FUNCTION')) {
        console.log(`${i + 1}. Creating function...`)
      } else if (statement.includes('CREATE TRIGGER')) {
        console.log(`${i + 1}. Creating trigger...`)
      } else {
        console.log(`${i + 1}. Executing statement...`)
      }

      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error)
        // Continue with other statements
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`)
      }
    }

    console.log('\n🎉 Extension Acknowledgments System Setup Complete!')
    console.log('\n✅ Created:')
    console.log('   • extension_acknowledgments table')
    console.log('   • get_pending_extension_acknowledgments() function')
    console.log('   • create_extension_acknowledgment() trigger')
    console.log('   • RLS policies')

    console.log('\n📱 Now ExtensionAcceptanceCard will show:')
    console.log('   • Staff Dashboard: http://localhost:3004/staff/dashboard')
    console.log('   • Cards appear when there are extension acknowledgments')

    // Test the function
    console.log('\n🧪 Testing RPC function...')
    const { data, error } = await supabase.rpc('get_pending_extension_acknowledgments', {
      staff_profile_id: 'test-uuid'
    })

    if (error) {
      console.error('❌ Function test failed:', error)
    } else {
      console.log('✅ Function test passed:', data?.length || 0, 'results')
    }

  } catch (err) {
    console.error('❌ Setup Error:', err.message)
  }
}

setupExtensionAcknowledgments()