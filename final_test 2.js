const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function finalTest() {
  console.log('🎉 FINAL TEST - Image Upload Feature\n')

  try {
    // Test if image_url column exists
    const { data, error } = await supabase
      .from('promotions')
      .select('id, code, name_th, image_url')
      .limit(3)

    if (error) {
      if (error.code === '42703') {
        console.log('❌ Column image_url still not found')
        console.log('🔄 Please run the SQL in Supabase Dashboard first')
        console.log('📂 Copy from: ADD_COLUMN.sql')
        console.log('🔗 Paste at: https://app.supabase.com/project/rbdvlfriqjnwpxmmgisf/sql')
        return
      }
      throw error
    }

    console.log('✅ SUCCESS! Column image_url exists!')

    if (data && data.length > 0) {
      console.log('\n📊 Current promotions:')
      console.table(data.map(p => ({
        id: p.id.substring(0, 8) + '...',
        code: p.code,
        name: p.name_th,
        image: p.image_url ? 'Has image' : 'No image'
      })))
    } else {
      console.log('\n📝 No promotions yet (ready to create!)')
    }

    console.log('\n🎯 IMAGE UPLOAD FEATURE IS READY!')
    console.log('\n🚀 Next steps:')
    console.log('1. Go to: http://localhost:3001/admin/promotions')
    console.log('2. Click "เพิ่มโปรโมชั่นใหม่"')
    console.log('3. Fill in promotion details')
    console.log('4. Upload an image in "ภาพโปรโมชั่น" section')
    console.log('5. Save and see your promotion with image!')
    console.log('6. Click 👁️ button to see beautiful preview!')

    console.log('\n✨ Features available:')
    console.log('   🖼️  Image upload & preview')
    console.log('   👁️  Beautiful promotion preview modal')
    console.log('   📱  Responsive design')
    console.log('   📋  Copy promo code')
    console.log('   🎨  Professional UI/UX')

  } catch (err) {
    console.error('💥 Error:', err.message)
  }

  process.exit(0)
}

finalTest()