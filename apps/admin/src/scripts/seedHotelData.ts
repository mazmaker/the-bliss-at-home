import { createClient } from '@supabase/supabase-js'

// Create Supabase client directly (avoiding Vite env issues)
const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(supabaseUrl, supabaseKey)

// Seed data for hotel: โรงแรมทดสอบ กรุงเทพฯ
const HOTEL_ID = '3082d55a-b185-49b9-b4fc-01c00d61e7e1'
const COMMISSION_RATE = 20

async function seedHotelBookings() {
  console.log('🌱 Seeding hotel bookings...')

  const bookings = [
    // December 2024 - Week 1
    {
      hotel_id: HOTEL_ID,
      booking_number: 'BK-2024-12-001',
      customer_name: 'คุณสมชาย ใจดี',
      customer_phone: '081-234-5678',
      customer_email: 'somchai@example.com',
      service_name: 'Thai Traditional Massage',
      service_category: 'Massage',
      staff_name: 'พี่แนน',
      booking_date: '2024-12-01',
      service_date: '2024-12-03',
      service_time: '14:00',
      duration: 120,
      total_price: 1200,
      status: 'completed',
      payment_status: 'pending',
      room_number: '501',
      created_by_hotel: true,
    },
    {
      hotel_id: HOTEL_ID,
      booking_number: 'BK-2024-12-002',
      customer_name: 'คุณสมหญิง รักสุข',
      customer_phone: '082-345-6789',
      service_name: 'Aromatherapy Massage',
      service_category: 'Massage',
      staff_name: 'พี่มิ้น',
      booking_date: '2024-12-01',
      service_date: '2024-12-04',
      service_time: '16:00',
      duration: 90,
      total_price: 1500,
      status: 'completed',
      payment_status: 'pending',
      room_number: '502',
      created_by_hotel: true,
    },
    {
      hotel_id: HOTEL_ID,
      booking_number: 'BK-2024-12-003',
      customer_name: 'Mr. John Smith',
      customer_phone: '083-456-7890',
      customer_email: 'john.smith@example.com',
      service_name: 'Oil Massage',
      service_category: 'Massage',
      staff_name: 'พี่น้ำ',
      booking_date: '2024-12-02',
      service_date: '2024-12-05',
      service_time: '10:00',
      duration: 120,
      total_price: 1800,
      status: 'completed',
      payment_status: 'pending',
      room_number: '601',
      created_by_hotel: true,
    },

    // December 2024 - Week 2
    {
      hotel_id: HOTEL_ID,
      booking_number: 'BK-2024-12-004',
      customer_name: 'คุณวิภา สุขสันต์',
      customer_phone: '084-567-8901',
      service_name: 'Foot Massage',
      service_category: 'Massage',
      staff_name: 'พี่แนน',
      booking_date: '2024-12-08',
      service_date: '2024-12-10',
      service_time: '15:00',
      duration: 60,
      total_price: 800,
      status: 'completed',
      payment_status: 'pending',
      room_number: '503',
      created_by_hotel: true,
    },
    {
      hotel_id: HOTEL_ID,
      booking_number: 'BK-2024-12-005',
      customer_name: 'คุณประยุทธ์ มั่งคั่ง',
      customer_phone: '085-678-9012',
      service_name: 'Thai Traditional Massage',
      service_category: 'Massage',
      staff_name: 'พี่มิ้น',
      booking_date: '2024-12-09',
      service_date: '2024-12-11',
      service_time: '11:00',
      duration: 120,
      total_price: 1200,
      status: 'completed',
      payment_status: 'pending',
      room_number: '602',
      created_by_hotel: true,
    },

    // December 2024 - Week 3
    {
      hotel_id: HOTEL_ID,
      booking_number: 'BK-2024-12-006',
      customer_name: 'Ms. Sarah Johnson',
      customer_phone: '086-789-0123',
      customer_email: 'sarah.j@example.com',
      service_name: 'Hot Stone Massage',
      service_category: 'Massage',
      staff_name: 'พี่น้ำ',
      booking_date: '2024-12-15',
      service_date: '2024-12-17',
      service_time: '14:00',
      duration: 90,
      total_price: 2000,
      status: 'completed',
      payment_status: 'pending',
      room_number: '701',
      created_by_hotel: true,
    },
    {
      hotel_id: HOTEL_ID,
      booking_number: 'BK-2024-12-007',
      customer_name: 'คุณสุรชัย ดีมาก',
      customer_phone: '087-890-1234',
      service_name: 'Aromatherapy Massage',
      service_category: 'Massage',
      staff_name: 'พี่แนน',
      booking_date: '2024-12-16',
      service_date: '2024-12-18',
      service_time: '16:00',
      duration: 120,
      total_price: 1800,
      status: 'completed',
      payment_status: 'pending',
      room_number: '504',
      created_by_hotel: true,
    },

    // January 2025 - Week 1
    {
      hotel_id: HOTEL_ID,
      booking_number: 'BK-2025-01-001',
      customer_name: 'คุณนภา สวยงาม',
      customer_phone: '088-901-2345',
      service_name: 'Thai Traditional Massage',
      service_category: 'Massage',
      staff_name: 'พี่มิ้น',
      booking_date: '2025-01-02',
      service_date: '2025-01-05',
      service_time: '10:00',
      duration: 120,
      total_price: 1200,
      status: 'completed',
      payment_status: 'pending',
      room_number: '603',
      created_by_hotel: true,
    },
    {
      hotel_id: HOTEL_ID,
      booking_number: 'BK-2025-01-002',
      customer_name: 'Mr. David Lee',
      customer_phone: '089-012-3456',
      customer_email: 'david.lee@example.com',
      service_name: 'Oil Massage',
      service_category: 'Massage',
      staff_name: 'พี่น้ำ',
      booking_date: '2025-01-03',
      service_date: '2025-01-06',
      service_time: '15:00',
      duration: 90,
      total_price: 1500,
      status: 'completed',
      payment_status: 'pending',
      room_number: '702',
      created_by_hotel: true,
    },

    // January 2025 - Week 2
    {
      hotel_id: HOTEL_ID,
      booking_number: 'BK-2025-01-003',
      customer_name: 'คุณพิมพ์ใจ แสนสุข',
      customer_phone: '090-123-4567',
      service_name: 'Foot Massage',
      service_category: 'Massage',
      staff_name: 'พี่แนน',
      booking_date: '2025-01-10',
      service_date: '2025-01-12',
      service_time: '11:00',
      duration: 60,
      total_price: 800,
      status: 'completed',
      payment_status: 'pending',
      room_number: '505',
      created_by_hotel: true,
    },
    {
      hotel_id: HOTEL_ID,
      booking_number: 'BK-2025-01-004',
      customer_name: 'คุณอนุชา เจริญสุข',
      customer_phone: '091-234-5678',
      service_name: 'Aromatherapy Massage',
      service_category: 'Massage',
      staff_name: 'พี่มิ้น',
      booking_date: '2025-01-11',
      service_date: '2025-01-13',
      service_time: '14:00',
      duration: 120,
      total_price: 1800,
      status: 'completed',
      payment_status: 'pending',
      room_number: '604',
      created_by_hotel: true,
    },

    // January 2025 - Week 3
    {
      hotel_id: HOTEL_ID,
      booking_number: 'BK-2025-01-005',
      customer_name: 'Ms. Emily Brown',
      customer_phone: '092-345-6789',
      customer_email: 'emily.brown@example.com',
      service_name: 'Hot Stone Massage',
      service_category: 'Massage',
      staff_name: 'พี่น้ำ',
      booking_date: '2025-01-18',
      service_date: '2025-01-20',
      service_time: '10:00',
      duration: 90,
      total_price: 2000,
      status: 'completed',
      payment_status: 'pending',
      room_number: '703',
      created_by_hotel: true,
    },
    {
      hotel_id: HOTEL_ID,
      booking_number: 'BK-2025-01-006',
      customer_name: 'คุณสมศักดิ์ รุ่งเรือง',
      customer_phone: '093-456-7890',
      service_name: 'Thai Traditional Massage',
      service_category: 'Massage',
      staff_name: 'พี่แนน',
      booking_date: '2025-01-19',
      service_date: '2025-01-21',
      service_time: '16:00',
      duration: 120,
      total_price: 1200,
      status: 'completed',
      payment_status: 'pending',
      room_number: '506',
      created_by_hotel: true,
    },

    // January 2025 - Week 4
    {
      hotel_id: HOTEL_ID,
      booking_number: 'BK-2025-01-007',
      customer_name: 'คุณมานี สบายดี',
      customer_phone: '094-567-8901',
      service_name: 'Oil Massage',
      service_category: 'Massage',
      staff_name: 'พี่มิ้น',
      booking_date: '2025-01-25',
      service_date: '2025-01-27',
      service_time: '11:00',
      duration: 90,
      total_price: 1500,
      status: 'completed',
      payment_status: 'pending',
      room_number: '605',
      created_by_hotel: true,
    },
    {
      hotel_id: HOTEL_ID,
      booking_number: 'BK-2025-01-008',
      customer_name: 'Mr. Michael Wong',
      customer_phone: '095-678-9012',
      customer_email: 'michael.w@example.com',
      service_name: 'Aromatherapy Massage',
      service_category: 'Massage',
      staff_name: 'พี่น้ำ',
      booking_date: '2025-01-26',
      service_date: '2025-01-28',
      service_time: '15:00',
      duration: 120,
      total_price: 1800,
      status: 'completed',
      payment_status: 'pending',
      room_number: '704',
      created_by_hotel: true,
    },
  ]

  const { data, error } = await supabase
    .from('hotel_bookings')
    .insert(bookings)
    .select()

  if (error) {
    console.error('❌ Error inserting bookings:', error)
    throw error
  }

  console.log(`✅ Created ${data.length} bookings`)
  return data
}

async function seedHotelInvoices() {
  console.log('🌱 Seeding hotel invoices...')

  // Invoice 1: December 2024 (Monthly)
  const dec2024Bookings = 7 // BK-001 to BK-007
  const dec2024Revenue = 1200 + 1500 + 1800 + 800 + 1200 + 2000 + 1800 // 10,300
  const dec2024Commission = (dec2024Revenue * COMMISSION_RATE) / 100 // 2,060

  // Invoice 2: January 2025 Week 1 (2025-01-01 to 2025-01-07)
  const jan2025w1Bookings = 2 // BK-001, BK-002
  const jan2025w1Revenue = 1200 + 1500 // 2,700
  const jan2025w1Commission = (jan2025w1Revenue * COMMISSION_RATE) / 100 // 540

  // Invoice 3: January 2025 Week 2 (2025-01-08 to 2025-01-14)
  const jan2025w2Bookings = 2 // BK-003, BK-004
  const jan2025w2Revenue = 800 + 1800 // 2,600
  const jan2025w2Commission = (jan2025w2Revenue * COMMISSION_RATE) / 100 // 520

  const invoices = [
    {
      hotel_id: HOTEL_ID,
      invoice_number: 'INV-202412-3082D55A-001',
      period_start: '2024-12-01',
      period_end: '2024-12-31',
      period_type: 'monthly',
      total_bookings: dec2024Bookings,
      total_revenue: dec2024Revenue,
      commission_rate: COMMISSION_RATE,
      commission_amount: dec2024Commission,
      status: 'paid',
      issued_date: '2025-01-01',
      due_date: '2025-01-31',
      paid_date: '2025-01-15',
    },
    {
      hotel_id: HOTEL_ID,
      invoice_number: 'INV-202501-3082D55A-W01',
      period_start: '2025-01-01',
      period_end: '2025-01-07',
      period_type: 'weekly',
      total_bookings: jan2025w1Bookings,
      total_revenue: jan2025w1Revenue,
      commission_rate: COMMISSION_RATE,
      commission_amount: jan2025w1Commission,
      status: 'pending',
      issued_date: '2025-01-08',
      due_date: '2025-02-07',
    },
    {
      hotel_id: HOTEL_ID,
      invoice_number: 'INV-202501-3082D55A-W02',
      period_start: '2025-01-08',
      period_end: '2025-01-14',
      period_type: 'weekly',
      total_bookings: jan2025w2Bookings,
      total_revenue: jan2025w2Revenue,
      commission_rate: COMMISSION_RATE,
      commission_amount: jan2025w2Commission,
      status: 'overdue',
      issued_date: '2025-01-15',
      due_date: '2025-01-22',
    },
  ]

  const { data, error } = await supabase
    .from('hotel_invoices')
    .insert(invoices)
    .select()

  if (error) {
    console.error('❌ Error inserting invoices:', error)
    throw error
  }

  console.log(`✅ Created ${data.length} invoices`)
  return data
}

async function seedHotelPayments() {
  console.log('🌱 Seeding hotel payments...')

  // Get the first invoice (December 2024 - paid)
  const { data: invoices, error: invoiceError } = await supabase
    .from('hotel_invoices')
    .select('*')
    .eq('hotel_id', HOTEL_ID)
    .eq('invoice_number', 'INV-202412-3082D55A-001')
    .single()

  if (invoiceError) {
    console.error('❌ Error fetching invoice:', invoiceError)
    throw invoiceError
  }

  const payments = [
    {
      hotel_id: HOTEL_ID,
      invoice_id: invoices.id,
      invoice_number: invoices.invoice_number,
      transaction_ref: 'TXN-2025-01-15-001',
      amount: invoices.commission_amount,
      payment_method: 'bank_transfer',
      status: 'completed',
      payment_date: '2025-01-15',
      notes: 'ชำระค่าคอมมิชชั่นเดือนธันวาคม 2024',
    },
  ]

  const { data, error } = await supabase
    .from('hotel_payments')
    .insert(payments)
    .select()

  if (error) {
    console.error('❌ Error inserting payments:', error)
    throw error
  }

  console.log(`✅ Created ${data.length} payments`)
  return data
}

async function clearExistingData() {
  console.log('🧹 Clearing existing data...')

  // Delete in order: payments -> invoices -> bookings
  await supabase.from('hotel_payments').delete().eq('hotel_id', HOTEL_ID)
  await supabase.from('hotel_invoices').delete().eq('hotel_id', HOTEL_ID)
  await supabase.from('hotel_bookings').delete().eq('hotel_id', HOTEL_ID)

  console.log('✅ Cleared existing data')
}

async function main() {
  try {
    console.log('🚀 Starting seed process...\n')

    // Clear existing data first
    await clearExistingData()

    // Seed data
    await seedHotelBookings()
    await seedHotelInvoices()
    await seedHotelPayments()

    console.log('\n🎉 Seed completed successfully!')
    console.log('\n📊 Summary:')
    console.log('- Bookings: 15 records')
    console.log('- Invoices: 3 records (1 paid, 1 pending, 1 overdue)')
    console.log('- Payments: 1 record')
    console.log('\n🌐 View at: http://localhost:3005/admin/hotels/3082d55a-b185-49b9-b4fc-01c00d61e7e1/billing')
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

main()
