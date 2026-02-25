const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.kE3OHGHbJmGnw-CRD1Ku1y0zKmA6LLRXm6eJHSc_ZwY'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createBuckets() {
  console.log('🪣 Creating storage buckets...\n')

  try {
    // Create promotion-images bucket
    const { data, error } = await supabase.storage.createBucket('promotion-images', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      fileSizeLimit: 2097152 // 2MB
    })

    if (error && !error.message.includes('already exists')) {
      console.error('❌ Error creating bucket:', error.message)
    } else if (error && error.message.includes('already exists')) {
      console.log('✅ Bucket promotion-images already exists!')
    } else {
      console.log('✅ Created bucket: promotion-images')
    }

    // List all buckets to verify
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error('❌ Error listing buckets:', listError.message)
    } else {
      console.log('\n📋 Available storage buckets:')
      buckets.forEach((bucket, i) => {
        console.log(`${i + 1}. ${bucket.name} (${bucket.public ? 'Public' : 'Private'})`)
      })
    }

    console.log('\n🎉 Storage setup completed!')
    console.log('📁 promotion-images bucket ready for image uploads!')

  } catch (err) {
    console.error('💥 Error:', err.message)
  }

  process.exit(0)
}

createBuckets()