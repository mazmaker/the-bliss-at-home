const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.kE3OHGHbJmGnw-CRD1Ku1y0zKmA6LLRXm6eJHSc_ZwY' // Service role key

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runSQL() {
  try {
    const sqlContent = fs.readFileSync('./create_promotions_table.sql', 'utf8')

    console.log('Executing SQL...')
    const { data, error } = await supabase.rpc('exec', { sql: sqlContent })

    if (error) {
      console.error('Error:', error)
    } else {
      console.log('SQL executed successfully!')
      console.log('Data:', data)
    }
  } catch (err) {
    console.error('Script error:', err)
  }
}

runSQL()