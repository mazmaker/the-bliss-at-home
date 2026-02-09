const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const samplePromotions = [
  {
    name_th: 'ส่วนลดสมาชิกใหม่',
    name_en: 'New Member Discount',
    description_th: 'ลด 20% สำหรับสมาชิกใหม่ ยอดขั้นต่ำ 1,000 บาท',
    description_en: 'Get 20% off for new members with minimum order 1,000 THB',
    code: 'WELCOME20',
    discount_type: 'percentage',
    discount_value: 20.00,
    min_order_amount: 1000.00,
    max_discount: 500.00,
    usage_limit: 1000,
    usage_count: 45,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
    status: 'active',
    applies_to: 'all_services',
    auto_generate_code: false,
    code_prefix: 'WEL',
    code_length: 8
  },
  {
    name_th: 'ลด 200 บาท',
    name_en: 'Save 200 THB',
    description_th: 'ลดทันที 200 บาท เมื่อยอดชำระตั้งแต่ 1,500 บาท',
    description_en: 'Get 200 THB off when you spend 1,500 THB or more',
    code: 'SAVE200',
    discount_type: 'fixed_amount',
    discount_value: 200.00,
    min_order_amount: 1500.00,
    max_discount: null,
    usage_limit: 500,
    usage_count: 12,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
    status: 'active',
    applies_to: 'all_services',
    auto_generate_code: false,
    code_prefix: 'SAV',
    code_length: 8
  },
  {
    name_th: 'ส่วนลดนวดพิเศษ',
    name_en: 'Massage Special',
    description_th: 'ลด 15% สำหรับบริการนวดทุกประเภท',
    description_en: 'Get 15% off for all massage services',
    code: 'MASSAGE15',
    discount_type: 'percentage',
    discount_value: 15.00,
    min_order_amount: 500.00,
    max_discount: 300.00,
    usage_limit: 200,
    usage_count: 87,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    status: 'active',
    applies_to: 'categories',
    target_categories: ['massage'],
    auto_generate_code: false,
    code_prefix: 'MAS',
    code_length: 8
  },
  {
    name_th: 'ซื้อ 2 ได้ 1',
    name_en: 'Buy 2 Get 1 Free',
    description_th: 'ซื้อบริการ 2 ครั้ง รับฟรี 1 ครั้ง สำหรับบริการเล็บ',
    description_en: 'Buy 2 nail services, get 1 free',
    code: 'BUY2GET1',
    discount_type: 'buy_x_get_y',
    discount_value: 2.00,
    min_order_amount: 800.00,
    max_discount: null,
    usage_limit: 100,
    usage_count: 23,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString(), // 6 weeks
    status: 'active',
    applies_to: 'categories',
    target_categories: ['nail'],
    auto_generate_code: false,
    code_prefix: 'BUY',
    code_length: 8
  },
  {
    name_th: 'ส่วนลดวันหยุด',
    name_en: 'Weekend Special',
    description_th: 'ลด 25% ทุกวันเสาร์-อาทิตย์',
    description_en: 'Get 25% off every Saturday-Sunday',
    code: 'WEEKEND25',
    discount_type: 'percentage',
    discount_value: 25.00,
    min_order_amount: 1200.00,
    max_discount: 400.00,
    usage_limit: null, // unlimited
    usage_count: 156,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
    status: 'active',
    applies_to: 'all_services',
    auto_generate_code: false,
    code_prefix: 'WEEK',
    code_length: 8
  },
  {
    name_th: 'โปรโมชั่นทดสอบ',
    name_en: 'Test Promotion',
    description_th: 'โปรโมชั่นสำหรับทดสอบระบบ (สถานะร่าง)',
    description_en: 'Test promotion for system testing (draft status)',
    code: 'TEST50',
    discount_type: 'percentage',
    discount_value: 50.00,
    min_order_amount: 100.00,
    max_discount: 1000.00,
    usage_limit: 10,
    usage_count: 0,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'draft',
    applies_to: 'all_services',
    auto_generate_code: true,
    code_prefix: 'TEST',
    code_length: 6
  }
]

async function createSampleData() {
  console.log('🎯 Creating sample promotions data...\n')

  try {
    const { data, error } = await supabase
      .from('promotions')
      .insert(samplePromotions)
      .select()

    if (error) {
      console.error('❌ Error creating sample data:', error.message)
      if (error.code === '42703') {
        console.log('💡 Column image_url missing. Please run the SQL first:')
        console.log('   ALTER TABLE promotions ADD COLUMN image_url TEXT;')
      }
      return
    }

    console.log(`✅ Created ${data.length} sample promotions!`)
    console.log('\n📋 Created promotions:')
    data.forEach((promo, i) => {
      console.log(`${i + 1}. [${promo.status.toUpperCase()}] ${promo.code} - ${promo.name_th}`)
    })

    console.log('\n🎉 READY TO TEST!')
    console.log('📱 Go to: http://localhost:3001/admin/promotions')
    console.log('👁️ Click preview buttons to see beautiful modals!')
    console.log('➕ Try adding new promotions with images!')

  } catch (err) {
    console.error('💥 Script error:', err.message)
  }

  process.exit(0)
}

createSampleData()