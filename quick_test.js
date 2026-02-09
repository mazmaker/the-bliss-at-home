const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function quickTest() {
  try {
    console.log('🧪 Testing promotions table...')

    // Test basic access first
    const { data, error } = await supabase
      .from('promotions')
      .select('id, code, name_th')
      .limit(1)

    if (error) {
      console.error('❌ Error accessing promotions table:', error.message)
      return
    }

    console.log('✅ Basic table access works')
    console.log('Sample promotion:', data?.[0] || 'No data')

    // Now test image_url column specifically
    const { data: imageTest, error: imageError } = await supabase
      .from('promotions')
      .select('id, image_url')
      .limit(1)

    if (imageError) {
      if (imageError.code === '42703') {
        console.log('\n❌ Column image_url MISSING')
        console.log('\n🔧 SOLUTION: Run this in Supabase Dashboard > SQL Editor:')
        console.log('ALTER TABLE promotions ADD COLUMN image_url TEXT;')
        console.log('\nThen come back and test the promotion form! 🚀')
      } else {
        console.error('❌ Other error:', imageError.message)
      }
    } else {
      console.log('\n✅ Column image_url EXISTS and working!')
      console.log('Ready to use image upload feature! 🎉')
    }

  } catch (err) {
    console.error('💥 Script error:', err.message)
  }

  // Exit explicitly
  process.exit(0)
}

quickTest()