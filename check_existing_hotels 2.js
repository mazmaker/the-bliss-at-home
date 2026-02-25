// Script to check existing hotels in the database
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkExistingHotels() {
  try {
    console.log('🔍 Checking existing hotels in the database...')

    // Get all hotels
    const { data: hotels, error: hotelError } = await supabase
      .from('hotels')
      .select('*')
      .order('created_at', { ascending: false })

    if (hotelError) {
      console.error('❌ Error fetching hotels:', hotelError.message)
      return
    }

    console.log('✅ Hotels query successful!')
    console.log(`📊 Total hotels found: ${hotels.length}`)

    if (hotels.length === 0) {
      console.log('🏨 No hotels found in database')
      console.log('💡 Suggestion: Add test hotels via admin interface at http://localhost:3001/admin/hotels')
    } else {
      console.log('\n🏨 Hotel Details:')
      hotels.forEach((hotel, index) => {
        console.log(`\n  ${index + 1}. ${hotel.name_th} (${hotel.name_en})`)
        console.log(`     • ID: ${hotel.id}`)
        console.log(`     • Status: ${hotel.status}`)
        console.log(`     • Commission Rate: ${hotel.commission_rate}%`)
        console.log(`     • Contact: ${hotel.contact_person}`)
        console.log(`     • Phone: ${hotel.phone}`)
        console.log(`     • Email: ${hotel.email}`)
        console.log(`     • Created: ${new Date(hotel.created_at).toLocaleDateString('th-TH')}`)
      })

      console.log('\n📋 Hotel IDs for development use:')
      hotels.forEach((hotel) => {
        console.log(`  • ${hotel.name_th}: "${hotel.id}"`)
      })
    }

    // Check for active hotels
    const activeHotels = hotels.filter(h => h.status === 'active')
    console.log(`\n✅ Active hotels: ${activeHotels.length}`)

    if (activeHotels.length > 0) {
      console.log('\n🎯 Recommended hotel ID for development:')
      console.log(`   Hotel: ${activeHotels[0].name_th}`)
      console.log(`   ID: "${activeHotels[0].id}"`)
    }

  } catch (err) {
    console.error('🚨 Unexpected error:', err.message)
  }
}

// Run the check
checkExistingHotels()