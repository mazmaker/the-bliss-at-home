const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testStorage() {
  console.log('🗄️ Testing storage functionality...\n')

  try {
    // Test 1: List buckets
    console.log('1️⃣ Testing bucket list...')
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()

    if (bucketError) {
      console.log(`❌ Cannot list buckets: ${bucketError.message}`)
    } else {
      console.log(`✅ Found ${buckets.length} buckets:`)
      buckets.forEach(bucket => {
        console.log(`   - ${bucket.name} (public: ${bucket.public})`)
      })
    }

    // Test 2: Check specific bucket
    console.log('\n2️⃣ Testing promotion-images bucket...')
    const promotionBucket = buckets?.find(b => b.name === 'promotion-images')
    if (promotionBucket) {
      console.log('✅ promotion-images bucket exists!')
      console.log(`   Public: ${promotionBucket.public}`)
      console.log(`   Created: ${promotionBucket.created_at}`)
    } else {
      console.log('❌ promotion-images bucket not found')
    }

    // Test 3: Test file upload with tiny file
    console.log('\n3️⃣ Testing file upload...')
    const testFile = Buffer.from('Hello World', 'utf8')
    const fileName = `test-${Date.now()}.txt`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('promotion-images')
      .upload(fileName, testFile, {
        contentType: 'text/plain'
      })

    if (uploadError) {
      console.log(`❌ Upload failed: ${uploadError.message}`)
      console.log(`   Error details:`, uploadError)
    } else {
      console.log('✅ Upload successful!')
      console.log(`   Path: ${uploadData.path}`)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('promotion-images')
        .getPublicUrl(fileName)

      console.log(`   Public URL: ${publicUrl}`)

      // Clean up test file
      await supabase.storage
        .from('promotion-images')
        .remove([fileName])
      console.log('🧹 Test file cleaned up')
    }

    // Test 4: List files in bucket
    console.log('\n4️⃣ Testing file listing...')
    const { data: files, error: listError } = await supabase.storage
      .from('promotion-images')
      .list()

    if (listError) {
      console.log(`❌ Cannot list files: ${listError.message}`)
    } else {
      console.log(`✅ Found ${files.length} files in bucket`)
      files.slice(0, 5).forEach(file => {
        console.log(`   - ${file.name} (${file.metadata?.size} bytes)`)
      })
    }

  } catch (err) {
    console.error('💥 Test failed:', err.message)
  }

  console.log('\n🎯 SUMMARY:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('If upload failed, it means:')
  console.log('1. RLS policies might block anon key uploads')
  console.log('2. Storage bucket might not have correct permissions')
  console.log('3. Need service role key for uploads')

  process.exit(0)
}

testStorage()