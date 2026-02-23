const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifyColumn() {
  console.log('🔍 Checking if image_url column was added...\n')

  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('id, code, image_url')
      .limit(1)

    if (error) {
      if (error.code === '42703') {
        console.log('❌ Column NOT added yet')
        console.log('👆 Please run the SQL command in Supabase Dashboard first')
        console.log('🔗 Direct link: https://app.supabase.com/project/rbdvlfriqjnwpxmmgisf/sql')
      } else {
        console.log('❌ Other error:', error.message)
      }
    } else {
      console.log('✅ SUCCESS! Column image_url added!')
      console.log('🎉 Ready to test image upload feature!')
      console.log('\n📱 Next steps:')
      console.log('1. Go to: http://localhost:3001/admin/promotions')
      console.log('2. Click "เพิ่มโปรโมชั่นใหม่"')
      console.log('3. Try uploading an image!')
      console.log('4. Test the preview button 👁️')
    }

  } catch (err) {
    console.error('💥 Error:', err.message)
  }

  process.exit(0)
}

verifyColumn()