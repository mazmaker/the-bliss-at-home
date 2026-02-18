/**
 * Script to add settings column directly to the hotels table
 * Run this to fix the "column hotels.settings does not exist" error
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzIxNzM3NCwiZXhwIjoyMDUyNzkzMzc0fQ.L6gGPTfUuUGnqpqEpGM6KG4LFYKhQTMqA3_Hp5rLbJg'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addSettingsColumn() {
  console.log('🔧 Adding settings column to hotels table...')

  try {
    // Add settings column to hotels table
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add settings column to hotels table if it doesn't exist
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'hotels'
            AND column_name = 'settings'
          ) THEN
            ALTER TABLE hotels ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;

            -- Add comment
            COMMENT ON COLUMN hotels.settings IS 'Hotel-specific configuration settings stored as JSONB';

            -- Create index for better performance
            CREATE INDEX idx_hotels_settings ON hotels USING gin (settings);

            RAISE NOTICE 'Added settings column to hotels table successfully';
          ELSE
            RAISE NOTICE 'Settings column already exists in hotels table';
          END IF;
        END
        $$;
      `
    })

    if (error) {
      throw error
    }

    console.log('✅ Settings column added successfully!')
    return data

  } catch (error) {
    console.error('❌ Error adding settings column:', error.message)
    throw error
  }
}

// Run the function
addSettingsColumn()
  .then(() => {
    console.log('🎉 Database update completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Failed to update database:', error)
    process.exit(1)
  })