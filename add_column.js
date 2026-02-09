const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function addImageColumn() {
  try {
    console.log('Adding image_url column using UPDATE method...')

    // Try to update a promotion with image_url to trigger column creation
    // First get any promotion
    const { data: promotions, error: fetchError } = await supabase
      .from('promotions')
      .select('id')
      .limit(1)

    if (fetchError) {
      console.error('Error fetching promotions:', fetchError)
      return
    }

    if (promotions && promotions.length > 0) {
      console.log('Found promotion:', promotions[0].id)

      // Try to update with image_url - this will show if column exists
      const { data, error } = await supabase
        .from('promotions')
        .update({ image_url: null })
        .eq('id', promotions[0].id)
        .select()

      if (error) {
        if (error.code === '42703') {
          console.log('❌ Column image_url does not exist')
          console.log('\n🔧 Please run this SQL in Supabase Dashboard:')
          console.log('ALTER TABLE promotions ADD COLUMN image_url TEXT;')
        } else {
          console.error('Other error:', error)
        }
      } else {
        console.log('✅ Column image_url exists and is working!')
        console.log('Updated promotion:', data)

        // Test fetching with image_url
        const { data: testData, error: testError } = await supabase
          .from('promotions')
          .select('id, code, name_th, image_url')
          .limit(3)

        if (testError) {
          console.error('Error testing fetch:', testError)
        } else {
          console.log('\n📊 Sample promotions data:')
          console.table(testData)
        }
      }
    }

  } catch (err) {
    console.error('Script error:', err)
  }
}

addImageColumn()