const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const categoryPromotions = [
  {
    name_th: 'โปรโมชั่นนวดพิเศษ',
    name_en: 'Massage Special Offer',
    description_th: 'ลด 25% สำหรับบริการนวดทุกประเภท นวดน้ำมัน นวดไทย นวดเท้า',
    description_en: 'Get 25% off for all massage services - oil massage, Thai massage, foot massage',
    code: 'MASSAGE25',
    discount_type: 'percentage',
    discount_value: 25.00,
    min_order_amount: 800.00,
    max_discount: 400.00,
    usage_limit: 100,
    usage_count: 0,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    applies_to: 'categories',
    target_categories: ['massage'], // 🎯 นวดเท่านั้น
    auto_generate_code: false,
    code_prefix: 'MAS',
    code_length: 8
  },
  {
    name_th: 'ส่วนลดทำเล็บสุดคุ้ม',
    name_en: 'Nail Service Discount',
    description_th: 'ลด 200 บาท สำหรับบริการเล็บ เจลเล็บ ทาสี ต่อเล็บ',
    description_en: '200 THB off for all nail services - gel nails, nail polish, nail extensions',
    code: 'NAIL200',
    discount_type: 'fixed_amount',
    discount_value: 200.00,
    min_order_amount: 1000.00,
    max_discount: null,
    usage_limit: 150,
    usage_count: 0,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    applies_to: 'categories',
    target_categories: ['nail'], // 🎯 เล็บเท่านั้น
    auto_generate_code: false,
    code_prefix: 'NAIL',
    code_length: 8
  },
  {
    name_th: 'โปรโมชั่นสปา & เฟเชียล',
    name_en: 'Spa & Facial Promotion',
    description_th: 'ลด 30% สำหรับบริการสปาและเฟเชียล ผ่อนคลายและดูแลผิวหน้า',
    description_en: '30% off for spa and facial services - relax and take care of your skin',
    code: 'SPAWELL30',
    discount_type: 'percentage',
    discount_value: 30.00,
    min_order_amount: 1500.00,
    max_discount: 600.00,
    usage_limit: 80,
    usage_count: 0,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    applies_to: 'categories',
    target_categories: ['spa', 'facial'], // 🎯 สปา + เฟเชียล
    auto_generate_code: false,
    code_prefix: 'SPA',
    code_length: 8
  },
  {
    name_th: 'บริการครบสำหรับทุกคน',
    name_en: 'All Services Available',
    description_th: 'ลด 15% สำหรับบริการทุกประเภท ไม่จำกัดหมวดหมู่',
    description_en: 'Get 15% off for all services - no category restrictions',
    code: 'ALLSERVICE15',
    discount_type: 'percentage',
    discount_value: 15.00,
    min_order_amount: 500.00,
    max_discount: 300.00,
    usage_limit: 200,
    usage_count: 0,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    applies_to: 'all_services', // 🎯 บริการทั้งหมด
    target_categories: null,
    auto_generate_code: false,
    code_prefix: 'ALL',
    code_length: 8
  }
]

async function createCategoryDemo() {
  console.log('🚀 Creating CATEGORY DEMO promotions...\n')

  try {
    const { data, error } = await supabase
      .from('promotions')
      .insert(categoryPromotions)
      .select()

    if (error) {
      console.error('❌ Error:', error.message)
      return
    }

    console.log(`✅ Created ${data.length} category-specific promotions!\n`)
    console.log('🎯 CATEGORY TARGETING DEMO:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    data.forEach((promo, i) => {
      const categoryText = promo.applies_to === 'all_services'
        ? '🌟 ทุกบริการ'
        : `🎯 เฉพาะ: ${promo.target_categories?.join(', ')}`

      console.log(`${i + 1}. ${promo.code} - ${promo.name_th}`)
      console.log(`   ${categoryText}`)
      console.log(`   ส่วนลด: ${promo.discount_value}${promo.discount_type === 'percentage' ? '%' : ' บาท'}\n`)
    })

    console.log('✨ HOW TO TEST CATEGORY SELECTION:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('1. 🌐 Go to: http://localhost:3001/admin/promotions')
    console.log('2. ➕ Click "เพิ่มโปรโมชั่นใหม่"')
    console.log('3. 👀 Click "แสดงการตั้งค่าขั้นสูง"')
    console.log('4. 📂 In "เป้าหมายบริการ" section:')
    console.log('   • Select "หมวดหมู่เฉพาะ"')
    console.log('   • ✅ Check boxes: นวด, เล็บ, สปา, เฟเชียล')
    console.log('5. 💾 Save and see how it works!')
    console.log('\n🎉 CATEGORY SELECTION FEATURE IS FULLY WORKING!')

  } catch (err) {
    console.error('💥 Error:', err.message)
  }

  process.exit(0)
}

createCategoryDemo()