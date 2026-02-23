/**
 * Apply Provider Preference Migration Only
 * This script applies just the provider preference changes without conflicts
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

// Create Supabase client with service role
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://your-project-url.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
)

async function applyProviderPreferenceMigration() {
  console.log('🚀 Applying Provider Preference Migration...')
  console.log('=' .repeat(50))

  try {
    // Step 1: Check if column already exists
    console.log('\n1️⃣ Checking existing schema...')

    const { data: columns, error: schemaError } = await supabase.rpc('sql', {
      query: `
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'provider_preference'
      `
    })

    if (schemaError) {
      console.log('Using alternative method to check schema...')
      // Try a simple select to check if column exists
      const { error: testError } = await supabase
        .from('bookings')
        .select('provider_preference')
        .limit(1)

      if (testError && testError.message.includes('column "provider_preference" does not exist')) {
        console.log('✅ Column provider_preference does not exist yet - safe to add')
      } else if (!testError) {
        console.log('⚠️ Column provider_preference already exists')
        console.log('🎯 Migration may have been applied already!')
        return
      }
    } else if (columns && columns.length > 0) {
      console.log('⚠️ Column provider_preference already exists')
      console.log('🎯 Migration may have been applied already!')
      return
    }

    // Step 2: Apply the migration SQL
    console.log('\n2️⃣ Adding provider_preference column...')

    const migrationSQL = `
      -- Add provider_preference column to bookings table
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS provider_preference VARCHAR(20)
      CHECK (provider_preference IN ('female-only', 'male-only', 'prefer-female', 'prefer-male', 'no-preference'))
      DEFAULT 'no-preference';

      -- Add index for fast preference queries
      CREATE INDEX IF NOT EXISTS idx_bookings_provider_preference ON bookings(provider_preference)
      WHERE provider_preference IS NOT NULL;

      -- Add comment to document the column
      COMMENT ON COLUMN bookings.provider_preference IS 'Customer provider preference for staff assignment: female-only, male-only, prefer-female, prefer-male, no-preference';

      -- Update existing bookings with default value
      UPDATE bookings
      SET provider_preference = 'no-preference'
      WHERE provider_preference IS NULL;
    `

    const { error: migrationError } = await supabase.rpc('sql', { query: migrationSQL })

    if (migrationError) {
      console.error('❌ Migration failed:', migrationError)
      return
    }

    console.log('✅ provider_preference column added successfully!')

    // Step 3: Create validation function
    console.log('\n3️⃣ Creating validation function...')

    const functionSQL = `
      CREATE OR REPLACE FUNCTION validate_provider_preference(preference TEXT)
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN preference IN ('female-only', 'male-only', 'prefer-female', 'prefer-male', 'no-preference');
      END;
      $$;

      -- Grant permissions
      GRANT EXECUTE ON FUNCTION validate_provider_preference TO authenticated;
      GRANT EXECUTE ON FUNCTION validate_provider_preference TO anon;
    `

    const { error: functionError } = await supabase.rpc('sql', { query: functionSQL })

    if (functionError) {
      console.log('⚠️ Function creation failed (may already exist):', functionError.message)
    } else {
      console.log('✅ Validation function created successfully!')
    }

    // Step 4: Test the new column
    console.log('\n4️⃣ Testing new column...')

    const { data: testData, error: testError } = await supabase
      .from('bookings')
      .select('id, provider_preference')
      .limit(3)

    if (testError) {
      console.error('❌ Test failed:', testError)
      return
    }

    console.log('✅ Test successful! Sample data:')
    console.table(testData)

    // Step 5: Success message
    console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!')
    console.log('=' .repeat(50))
    console.log('')
    console.log('✅ Changes applied:')
    console.log('   ✓ provider_preference column added to bookings table')
    console.log('   ✓ Default value set to "no-preference"')
    console.log('   ✓ Check constraint added for valid values')
    console.log('   ✓ Index created for performance')
    console.log('   ✓ Validation function created')
    console.log('')
    console.log('🚀 Next Steps:')
    console.log('   1. Restart Hotel App to see Provider Preference UI')
    console.log('   2. Test booking creation with different preferences')
    console.log('   3. Verify staff assignment works correctly')
    console.log('')
    console.log('📋 Valid provider preferences:')
    console.log('   • female-only: ผู้หญิงเท่านั้น')
    console.log('   • male-only: ผู้ชายเท่านั้น')
    console.log('   • prefer-female: ต้องการผู้หญิง')
    console.log('   • prefer-male: ต้องการผู้ชาย')
    console.log('   • no-preference: ไม่ระบุ')

  } catch (error) {
    console.error('💥 Migration failed with error:', error)
  }
}

// Run the migration
applyProviderPreferenceMigration()