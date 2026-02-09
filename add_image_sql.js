const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function addImageColumn() {
  try {
    console.log('Creating storage bucket for promotion images...')

    // Try to create bucket (might already exist)
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (!bucketsError) {
      const bucketExists = buckets.some(bucket => bucket.id === 'promotion-images')

      if (!bucketExists) {
        const { error: bucketError } = await supabase.storage.createBucket('promotion-images', {
          public: true
        })

        if (bucketError) {
          console.error('Error creating bucket:', bucketError)
        } else {
          console.log('✅ Storage bucket created successfully!')
        }
      } else {
        console.log('✅ Storage bucket already exists!')
      }
    } else {
      console.error('Error listing buckets:', bucketsError)
    }

    // Test promotions table access
    const { data, error } = await supabase
      .from('promotions')
      .select('id, code, image_url')
      .limit(1)

    if (error) {
      console.error('Error accessing promotions table:', error)
    } else {
      console.log('✅ Promotions table accessible!')
      console.log('Sample data:', data)
    }

  } catch (err) {
    console.error('Script error:', err)
  }
}

addImageColumn()