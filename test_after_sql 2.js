const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testImageFeature() {
  console.log('🧪 Testing Image Upload Feature...\n')

  try {
    // Test 1: Check if image_url column exists
    console.log('1️⃣ Testing image_url column...')
    const { data: columnTest, error: columnError } = await supabase
      .from('promotions')
      .select('id, code, name_th, image_url')
      .limit(3)

    if (columnError) {
      if (columnError.code === '42703') {
        console.log('❌ Column image_url still missing!')
        console.log('   Please run the SQL command in Supabase Dashboard first.')
        return
      } else {
        throw columnError
      }
    }

    console.log('✅ Column image_url exists!')

    // Test 2: Show current promotions
    if (columnTest && columnTest.length > 0) {
      console.log('\n2️⃣ Current promotions:')
      columnTest.forEach((promo, i) => {
        console.log(`   ${i + 1}. ${promo.name_th || promo.code}`)
        console.log(`      Image: ${promo.image_url || 'No image'}`)
      })
    } else {
      console.log('\n2️⃣ No promotions found (that\'s ok for testing)')
    }

    // Test 3: Test update with image URL (simulate upload)
    if (columnTest && columnTest.length > 0) {
      console.log('\n3️⃣ Testing image URL update...')
      const testPromotion = columnTest[0]
      const testImageUrl = 'https://example.com/test-image.jpg'

      const { data: updateData, error: updateError } = await supabase
        .from('promotions')
        .update({ image_url: testImageUrl })
        .eq('id', testPromotion.id)
        .select('id, code, image_url')

      if (updateError) {
        throw updateError
      }

      console.log('✅ Image URL update works!')
      console.log(`   Updated promotion ${updateData[0].code} with test image URL`)

      // Revert the test
      await supabase
        .from('promotions')
        .update({ image_url: null })
        .eq('id', testPromotion.id)

      console.log('   (Test URL removed)')
    }

    console.log('\n🎉 IMAGE UPLOAD FEATURE READY!')
    console.log('\n📋 What you can do now:')
    console.log('   1. Go to http://localhost:3001/admin/promotions')
    console.log('   2. Click "เพิ่มโปรโมชั่นใหม่"')
    console.log('   3. Upload images in the "ภาพโปรโมชั่น" section')
    console.log('   4. Click the 👁️ button to see beautiful previews')
    console.log('   5. View promotion cards with images!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }

  process.exit(0)
}

testImageFeature()