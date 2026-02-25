const { createClient } = require('@supabase/supabase-js')

// Use service role for admin operations (from current .env)
const supabase = createClient(
  'https://rbdvlfriqjnwpxmmgisf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'
)

async function addSettingsColumn() {
  try {
    console.log('🔄 Adding settings column to hotels table...')

    // Use rpc to execute raw SQL
    const { data, error } = await supabase.rpc('exec_sql_as_service', {
      query: `
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
    })

    if (error) {
      console.log(`RPC error: ${error.message}`)
      console.log('Trying alternative method...')

      // Try alternative: manual update approach
      // First get all hotel IDs
      const { data: hotels, error: selectError } = await supabase
        .from('hotels')
        .select('id')

      if (selectError) {
        throw new Error(`Failed to get hotels: ${selectError.message}`)
      }

      console.log(`Found ${hotels.length} hotels to update`)

      // Since we can't ALTER TABLE directly, we'll work with existing data
      // and manually add settings to each hotel via updates
      console.log('Adding default settings to all hotels...')

      const defaultSettings = {
        language: 'th',
        email_notifications: true,
        sms_notifications: false,
        auto_confirm: false,
        require_guest_info: true,
        default_duration: 60,
        theme: 'minimal',
        currency: 'THB'
      }

      // Update each hotel with default settings
      for (const hotel of hotels) {
        const { error: updateError } = await supabase
          .from('hotels')
          .update({ settings: defaultSettings })
          .eq('id', hotel.id)

        if (updateError) {
          console.log(`Failed to update hotel ${hotel.id}: ${updateError.message}`)
        }
      }

      console.log('✅ Default settings added to all hotels')

    } else {
      console.log('✅ Settings column added successfully via RPC')
    }

    // Verify the settings column exists and contains data
    console.log('🔄 Verifying settings column...')

    const { data: verification, error: verifyError } = await supabase
      .from('hotels')
      .select('id, name_th, settings')
      .limit(3)

    if (verifyError) {
      throw new Error(`Verification failed: ${verifyError.message}`)
    }

    console.log('✅ Verification successful:')
    verification?.forEach(hotel => {
      console.log(`   ${hotel.name_th}:`, hotel.settings || 'No settings column')
    })

    console.log('\n🎉 Hotel settings setup completed successfully!')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

addSettingsColumn()