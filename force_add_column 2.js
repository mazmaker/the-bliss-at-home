const https = require('https')

// Supabase API configuration
const supabaseUrl = 'rbdvlfriqjnwpxmmgisf.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.kE3OHGHbJmGnw-CRD1Ku1y0zKmA6LLRXm6eJHSc_ZwY'

const sql = `
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS image_url TEXT;
COMMENT ON COLUMN promotions.image_url IS 'URL of the promotion banner/preview image';
SELECT 'Column added successfully!' as result;
`

const data = JSON.stringify({
  query: sql
})

const options = {
  hostname: supabaseUrl,
  port: 443,
  path: '/rest/v1/rpc/exec',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey,
    'Content-Length': Buffer.byteLength(data)
  }
}

console.log('🚀 Adding image_url column via Supabase API...')

const req = https.request(options, (res) => {
  let responseBody = ''

  res.on('data', (chunk) => {
    responseBody += chunk
  })

  res.on('end', () => {
    console.log('Status:', res.statusCode)
    console.log('Response:', responseBody)

    if (res.statusCode === 200) {
      console.log('✅ Column added successfully!')
      console.log('🧪 Testing the column...')
      testColumn()
    } else {
      console.log('❌ Failed to add column')
      console.log('💡 Will try alternative method...')
      tryAlternativeMethod()
    }
  })
})

req.on('error', (error) => {
  console.error('💥 Request error:', error)
  tryAlternativeMethod()
})

req.write(data)
req.end()

function testColumn() {
  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(`https://${supabaseUrl}`, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc')

  setTimeout(async () => {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('id, code, image_url')
        .limit(1)

      if (error) {
        console.log('❌ Column not working yet:', error.message)
      } else {
        console.log('✅ SUCCESS! Image upload feature is ready! 🎉')
        console.log('📱 Go to: http://localhost:3001/admin/promotions')
        console.log('👆 Try creating a promotion with image!')
      }
    } catch (err) {
      console.log('Error testing:', err.message)
    }

    process.exit(0)
  }, 2000)
}

function tryAlternativeMethod() {
  console.log('\n🔧 Trying alternative approach...')
  console.log('📋 Please manually run this SQL in Supabase Dashboard:')
  console.log('ALTER TABLE promotions ADD COLUMN image_url TEXT;')
  console.log('🔗 Link: https://app.supabase.com/project/rbdvlfriqjnwpxmmgisf/sql')
  process.exit(1)
}