const { createClient } = require('@supabase/supabase-js')

// Use service role for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://gahqgywzfnqxjbhuwhjr.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhaHFneXd6Zm5xeGpiaHV3aGpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTA1ODY2NCwiZXhwIjoyMDUwNjM0NjY0fQ.dH7c1YHPk3VkzF8fhSzP5LZa7fJ7SyCYXgplUgJOTiw'
)

async function addHotelSettingsColumn() {
  try {
    console.log('🔄 Checking if settings column exists...')

    // First, check if the settings column already exists
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'hotels')
      .eq('column_name', 'settings')

    if (columnsError && !columnsError.message.includes('does not exist')) {
      throw new Error(`Failed to check columns: ${columnsError.message}`)
    }

    if (columns && columns.length > 0) {
      console.log('✅ Settings column already exists')
    } else {
      console.log('🔄 Adding hotel settings column...')

      // Add settings column using direct SQL query
      const { error: alterError } = await supabase.sql`
        ALTER TABLE hotels
        ADD COLUMN settings JSONB DEFAULT '{
          "language": "th",
          "email_notifications": true,
          "sms_notifications": false,
          "auto_confirm": false,
          "require_guest_info": true,
          "default_duration": 60,
          "theme": "minimal",
          "currency": "THB"
        }'::JSONB;
      `

      if (alterError) {
        throw new Error(`Failed to add settings column: ${alterError.message}`)
      }

      console.log('✅ Settings column added successfully')

      // Create index for better performance
      console.log('🔄 Creating GIN index...')

      const { error: indexError } = await supabase.sql`
        CREATE INDEX IF NOT EXISTS idx_hotels_settings_gin ON hotels USING GIN (settings);
      `

      if (indexError) {
        throw new Error(`Failed to create index: ${indexError.message}`)
      }

      console.log('✅ GIN index created successfully')
    }

    // Update existing hotels with default settings
    console.log('🔄 Updating existing hotels with default settings...')

    const updateResult = await supabase
      .from('hotels')
      .update({
        settings: {
          language: 'th',
          email_notifications: true,
          sms_notifications: false,
          auto_confirm: false,
          require_guest_info: true,
          default_duration: 60,
          theme: 'minimal',
          currency: 'THB'
        }
      })
      .is('settings', null)

    if (updateResult.error) {
      throw new Error(`Failed to update hotels: ${updateResult.error.message}`)
    }

    console.log(`✅ Updated ${updateResult.data?.length || 0} hotels with default settings`)

    // Verify the settings column exists and contains data
    console.log('🔄 Verifying settings column...')

    const verifyResult = await supabase
      .from('hotels')
      .select('id, name_th, settings')
      .limit(3)

    if (verifyResult.error) {
      throw new Error(`Verification failed: ${verifyResult.error.message}`)
    }

    console.log('✅ Verification successful:')
    verifyResult.data?.forEach(hotel => {
      console.log(`   ${hotel.name_th}: settings =`, hotel.settings)
    })

    console.log('\n🎉 Hotel settings column added and configured successfully!')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

addHotelSettingsColumn()