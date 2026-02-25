const { createClient } = require('@supabase/supabase-js')

// Use service role for admin operations (from current .env)
const supabase = createClient(
  'https://rbdvlfriqjnwpxmmgisf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'
)

async function checkHotelStructure() {
  try {
    console.log('🔄 Checking hotel table structure...')

    // Try to select a hotel to see current structure
    const { data: hotels, error } = await supabase
      .from('hotels')
      .select('*')
      .limit(1)

    if (error) {
      throw new Error(`Failed to query hotels: ${error.message}`)
    }

    console.log('✅ Hotels table structure:')

    if (hotels && hotels.length > 0) {
      console.log('Columns found:')
      Object.keys(hotels[0]).forEach(key => {
        console.log(`   - ${key}: ${typeof hotels[0][key]}`)
      })

      // Check if settings column exists
      if ('settings' in hotels[0]) {
        console.log('\n✅ Settings column exists!')
        console.log('Current settings:', hotels[0].settings)
      } else {
        console.log('\n❌ Settings column does NOT exist')
        console.log('Need to add settings column to hotels table')
      }
    } else {
      console.log('No hotels found in the table')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkHotelStructure()