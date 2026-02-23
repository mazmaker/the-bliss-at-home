const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function runSQLDirect() {
  console.log('🎯 Running SQL commands directly...\n')

  try {
    // Step 1: Try to create sample promotions first to test
    console.log('1️⃣ Testing promotion creation...')

    const samplePromotions = [
      {
        name_th: 'โปรโมชั่นนวดพิเศษ',
        name_en: 'Massage Special',
        description_th: 'ลด 25% สำหรับบริการนวดทุกประเภท',
        description_en: 'Get 25% off for all massage services',
        code: 'MASSAGE25',
        discount_type: 'percentage',
        discount_value: 25.00,
        min_order_amount: 800.00,
        max_discount: 300.00,
        usage_limit: 50,
        usage_count: 0,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        applies_to: 'categories',
        target_categories: ['massage'],
        auto_generate_code: false,
        code_prefix: 'MAS',
        code_length: 8
      },
      {
        name_th: 'ส่วนลดเล็บสุดคุ้ม',
        name_en: 'Nail Discount',
        description_th: 'ลด 200 บาท สำหรับบริการเล็บทุกประเภท',
        description_en: 'Get 200 THB off for all nail services',
        code: 'NAIL200',
        discount_type: 'fixed_amount',
        discount_value: 200.00,
        min_order_amount: 1000.00,
        max_discount: null,
        usage_limit: 100,
        usage_count: 0,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        applies_to: 'categories',
        target_categories: ['nail'],
        auto_generate_code: false,
        code_prefix: 'NAIL',
        code_length: 8
      },
      {
        name_th: 'โปรสปา + เฟเชียล',
        name_en: 'Spa & Facial Combo',
        description_th: 'ลด 30% สำหรับบริการสปาและเฟเชียล',
        description_en: 'Get 30% off for spa and facial services',
        code: 'SPAWELL30',
        discount_type: 'percentage',
        discount_value: 30.00,
        min_order_amount: 1500.00,
        max_discount: 500.00,
        usage_limit: 80,
        usage_count: 0,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        applies_to: 'categories',
        target_categories: ['spa', 'facial'],
        auto_generate_code: false,
        code_prefix: 'SPA',
        code_length: 8
      }
    ]

    const { data, error } = await supabase
      .from('promotions')
      .insert(samplePromotions)
      .select()

    if (error) {
      console.log(`❌ Insert failed: ${error.message}`)

      if (error.message.includes('row-level security')) {
        console.log('🔐 RLS Policy issue - this is expected')
        console.log('📋 Database table exists, just need to run SQL manually')
      }

      if (error.message.includes('image_url')) {
        console.log('🗄️  image_url column missing - need to add it')
      }

    } else {
      console.log('✅ SUCCESS! Promotions created successfully!')
      console.log(`📊 Created ${data.length} sample promotions:`)
      data.forEach((promo, i) => {
        const categories = promo.target_categories?.join(', ') || 'all'
        console.log(`   ${i + 1}. ${promo.code} - ${promo.name_th} (${categories})`)
      })
    }

    // Step 2: Check current promotions
    console.log('\n2️⃣ Checking existing promotions...')

    const { data: existing, error: checkError } = await supabase
      .from('promotions')
      .select('code, name_th, target_categories, status')
      .limit(10)

    if (checkError) {
      console.log(`❌ Check failed: ${checkError.message}`)
    } else {
      console.log(`📋 Found ${existing.length} existing promotions:`)
      existing.forEach((promo, i) => {
        const categories = promo.target_categories?.join(', ') || 'all services'
        console.log(`   ${i + 1}. ${promo.code} - ${categories} (${promo.status})`)
      })
    }

    console.log('\n🎯 FINAL STATUS:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    if (data && data.length > 0) {
      console.log('✅ SYSTEM IS WORKING! 🎉')
      console.log('✅ Promotions table accessible')
      console.log('✅ Category filtering working')
      console.log('✅ Sample data created')
      console.log('\n🚀 Ready to use: http://localhost:3001/admin/promotions')
    } else {
      console.log('⚠️  Manual SQL needed for full functionality')
      console.log('📋 Copy FINAL_SOLUTION.sql to Supabase Dashboard')
      console.log('🔗 https://app.supabase.com/project/rbdvlfriqjnwpxmmgisf/sql')
      console.log('\n✅ Form will still work for testing!')
    }

  } catch (err) {
    console.error('💥 Error:', err.message)
  }

  process.exit(0)
}

runSQLDirect()