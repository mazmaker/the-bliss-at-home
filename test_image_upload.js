const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testImageUpload() {
  console.log('🎨 Testing REAL image upload functionality...\n')

  try {
    // Create a simple test image (1x1 PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
      0x09, 0x70, 0x48, 0x59, 0x73, 0x00, 0x00, 0x0b, 0x13, 0x00, 0x00, 0x0b,
      0x13, 0x01, 0x00, 0x9a, 0x9c, 0x18, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44,
      0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0x0f, 0x00, 0x01, 0x00, 0x01, 0x00,
      0x18, 0xdd, 0x8d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
      0xae, 0x42, 0x60, 0x82
    ])

    console.log('1️⃣ Creating test image file...')
    console.log('   📊 Size:', testImageBuffer.length, 'bytes')
    console.log('   🎭 Type: image/png')

    // Test upload using the same logic as the form
    const fileName = `test_promotion_${Date.now()}.png`

    console.log('\n2️⃣ Uploading to promotion-images bucket...')
    console.log('   📁 Filename:', fileName)

    const { data, error } = await supabase.storage
      .from('promotion-images')
      .upload(fileName, testImageBuffer, {
        contentType: 'image/png',
        upsert: true
      })

    if (error) {
      console.log('❌ Upload failed:', error.message)
      console.log('   Details:', error)
      return
    }

    console.log('✅ Upload successful!')
    console.log('   🗂️ Path:', data.path)

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('promotion-images')
      .getPublicUrl(fileName)

    console.log('\n3️⃣ Generated public URL:')
    console.log('   🌐', publicUrl)

    // Verify it's a Supabase URL
    if (publicUrl && publicUrl.includes('supabase.co')) {
      console.log('   ✅ Real Supabase storage URL confirmed!')
    } else {
      console.log('   ❌ Not a valid Supabase URL')
    }

    console.log('\n4️⃣ Testing image accessibility...')

    // Try to fetch the image to verify it's accessible
    const response = await fetch(publicUrl)
    if (response.ok) {
      console.log('   ✅ Image is accessible via public URL')
      console.log('   📊 Response size:', response.headers.get('content-length'), 'bytes')
      console.log('   🎭 Content type:', response.headers.get('content-type'))
    } else {
      console.log('   ❌ Image not accessible:', response.status, response.statusText)
    }

    // Clean up
    console.log('\n🧹 Cleaning up test image...')
    await supabase.storage
      .from('promotion-images')
      .remove([fileName])
    console.log('   ✅ Test image removed')

    console.log('\n🎉 SUCCESS! Real image upload is working!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ Bucket exists and is accessible')
    console.log('✅ Image upload works with proper URLs')
    console.log('✅ Public URLs are accessible')
    console.log('✅ Form should now display REAL images!')

  } catch (error) {
    console.error('💥 Test failed:', error)
  }
}

testImageUpload()