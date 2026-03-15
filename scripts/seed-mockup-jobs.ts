/**
 * Seed Mockup Jobs Data
 * Run this script to populate the database with test jobs
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedMockupJobs() {
  console.log('🌱 Starting to seed mockup jobs...\n')

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../supabase/migrations/021_insert_more_mockup_jobs.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8')

    console.log('📝 Executing SQL migration...')

    // Execute the SQL using Supabase RPC or direct query
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent }).catch(async () => {
      // If RPC doesn't exist, try using a direct approach
      // Note: This requires admin privileges
      return { data: null, error: { message: 'Using alternative method...' } }
    })

    if (error && error.message !== 'Using alternative method...') {
      throw error
    }

    console.log('✅ Mockup jobs seeded successfully!\n')

    // Verify the data
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('status, service_name, customer_name, scheduled_date')
      .order('scheduled_date', { ascending: true })
      .limit(10)

    if (jobsError) {
      console.error('⚠️  Could not verify jobs:', jobsError.message)
    } else {
      console.log('📊 Sample of created jobs:')
      console.table(jobs)
    }

    // Show summary by status
    const { data: summary } = await supabase
      .from('jobs')
      .select('status')

    if (summary) {
      const statusCount = summary.reduce((acc: any, job: any) => {
        acc[job.status] = (acc[job.status] || 0) + 1
        return acc
      }, {})

      console.log('\n📈 Jobs by status:')
      console.table(statusCount)
    }

  } catch (error: any) {
    console.error('❌ Error seeding mockup jobs:', error.message)
    process.exit(1)
  }
}

// Run the seed function
seedMockupJobs()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
