import { createClient } from '@supabase/supabase-js'

// Supabase credentials
const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(supabaseUrl, supabaseKey)

// Test customer data
const CUSTOMERS = [
  {
    full_name: 'สมชาย ใจดี',
    email: 'somchai.jaidee@email.com',
    phone: '081-234-5678',
    address: '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
    date_of_birth: '1985-05-15',
    status: 'active' as const,
  },
  {
    full_name: 'วิภาดา สุขสันต์',
    email: 'wipada.suksun@email.com',
    phone: '082-345-6789',
    address: '456 ถนนพระราม 4 แขวงปทุมวัน เขตปทุมวัน กรุงเทพฯ 10330',
    date_of_birth: '1990-08-22',
    status: 'active' as const,
  },
  {
    full_name: 'กิตติ เก่งการค้า',
    email: 'kitti.kengkan@email.com',
    phone: '083-456-7890',
    address: '789 ถนนสีลม แขวงสีลม เขตบางรัก กรุงเทพฯ 10500',
    date_of_birth: '1982-03-10',
    status: 'active' as const,
  },
  {
    full_name: 'มานี มีตา',
    email: 'manee.meeta@email.com',
    phone: '084-567-8901',
    address: '321 ถนนรัชดาภิเษก แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ 10310',
    date_of_birth: '1995-11-28',
    status: 'active' as const,
  },
  {
    full_name: 'ประยุทธ์ มั่งมี',
    email: 'prayut.mangmee@email.com',
    phone: '085-678-9012',
    address: '555 ถนนพหลโยธิน แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900',
    date_of_birth: '1978-01-05',
    status: 'active' as const,
  },
  {
    full_name: 'สุดา ดีใจ',
    email: 'suda.deejai@email.com',
    phone: '086-789-0123',
    address: '888 ถนนเพชรบุรี แขวงมักกะสัน เขตราชเทวี กรุงเทพฯ 10400',
    date_of_birth: '1992-07-19',
    status: 'suspended' as const,
  },
  {
    full_name: 'ธนา รวยทรัพย์',
    email: 'thana.ruaysub@email.com',
    phone: '087-890-1234',
    address: '999 ถนนวิภาวดีรังสิต แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900',
    date_of_birth: '1988-12-03',
    status: 'active' as const,
  },
  {
    full_name: 'นภา สวยงาม',
    email: 'napa.suayngam@email.com',
    phone: '088-901-2345',
    address: '111 ถนนรามคำแหง แขวงหัวหมาก เขตบางกะปิ กรุงเทพฯ 10240',
    date_of_birth: '1993-04-25',
    status: 'active' as const,
  },
]

async function seedCustomers() {
  console.log('🌱 Starting customer data seeding...\n')

  try {
    // 1. Create customers
    console.log('📝 Creating customers...')
    const createdCustomers = []

    for (const customer of CUSTOMERS) {
      // Check if customer already exists
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', customer.phone)
        .single()

      if (existingCustomer) {
        console.log(`   → Customer ${customer.full_name} already exists, skipping...`)
        createdCustomers.push(existingCustomer)
        continue
      }

      // Create customer (without profile - profiles are created through auth)
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          profile_id: null, // Will be linked when user signs up
          full_name: customer.full_name,
          phone: customer.phone,
          address: customer.address,
          date_of_birth: customer.date_of_birth,
          status: customer.status,
          total_bookings: 0,
          total_spent: 0,
        })
        .select()
        .single()

      if (customerError) {
        console.error(`❌ Error creating customer ${customer.full_name}:`, customerError)
        continue
      }

      createdCustomers.push(newCustomer)
      console.log(`   ✓ Created customer: ${customer.full_name} (${customer.status})`)
    }

    console.log(`\n✅ Created ${createdCustomers.length} customers\n`)

    // 2. Create some bookings for customers
    console.log('📅 Creating sample bookings...')

    // Get a service to link bookings to
    const { data: services } = await supabase
      .from('services')
      .select('id, name_th')
      .limit(3)

    if (!services || services.length === 0) {
      console.log('⚠️  No services found. Skipping booking creation.')
      return
    }

    const bookingsToCreate = []
    const now = new Date()

    // Create 3-5 bookings per customer
    for (const customer of createdCustomers.slice(0, 5)) {
      const numBookings = Math.floor(Math.random() * 3) + 3 // 3-5 bookings

      for (let i = 0; i < numBookings; i++) {
        const daysAgo = Math.floor(Math.random() * 90) // Within last 90 days
        const bookingDate = new Date(now)
        bookingDate.setDate(bookingDate.getDate() - daysAgo)

        const service = services[Math.floor(Math.random() * services.length)]
        const price = Math.floor(Math.random() * 2000) + 500 // 500-2500 baht

        const status = daysAgo > 7 ? 'completed' : daysAgo > 2 ? 'confirmed' : 'pending'
        const paymentStatus = status === 'completed' ? 'paid' : 'pending'

        bookingsToCreate.push({
          customer_id: customer.id,
          service_id: service.id,
          booking_date: bookingDate.toISOString().split('T')[0],
          booking_time: `${Math.floor(Math.random() * 8) + 10}:00`, // 10:00-17:00
          duration: 60,
          base_price: price,
          discount_amount: 0,
          final_price: price,
          status,
          payment_status: paymentStatus,
          is_hotel_booking: false,
        })
      }
    }

    if (bookingsToCreate.length > 0) {
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingsToCreate)
        .select()

      if (bookingError) {
        console.error('❌ Error creating bookings:', bookingError)
      } else {
        console.log(`   ✓ Created ${bookings.length} sample bookings`)

        // Update customer stats
        for (const customer of createdCustomers.slice(0, 5)) {
          const customerBookings = bookings.filter((b: any) => b.customer_id === customer.id)
          const totalSpent = customerBookings.reduce((sum: number, b: any) => sum + Number(b.final_price), 0)

          await supabase
            .from('customers')
            .update({
              total_bookings: customerBookings.length,
              total_spent: totalSpent,
              last_booking_date: customerBookings[0]?.booking_date,
            })
            .eq('id', customer.id)
        }

        console.log('   ✓ Updated customer statistics')
      }
    }

    // 3. Create sample SOS alerts
    console.log('\n🆘 Creating sample SOS alerts...')

    const sosAlertsToCreate = [
      {
        customer_id: createdCustomers[0]?.id,
        latitude: 13.7563,
        longitude: 100.5018,
        location_accuracy: 10.5,
        message: 'ต้องการความช่วยเหลือด่วน พนักงานยังไม่มาตามเวลานัด',
        status: 'pending',
        priority: 'high',
      },
      {
        customer_id: createdCustomers[2]?.id,
        latitude: 13.7466,
        longitude: 100.5343,
        location_accuracy: 8.2,
        message: 'พนักงานไม่มาตามนัด รอมา 30 นาทีแล้ว',
        status: 'acknowledged',
        priority: 'medium',
      },
    ]

    const { data: sosAlerts, error: sosError } = await supabase
      .from('sos_alerts')
      .insert(sosAlertsToCreate)
      .select()

    if (sosError) {
      console.error('❌ Error creating SOS alerts:', sosError)
    } else {
      console.log(`   ✓ Created ${sosAlerts.length} SOS alerts for testing`)
    }

    console.log('\n✅ Customer data seeding completed successfully!\n')
    console.log('📊 Summary:')
    console.log(`   • Customers: ${createdCustomers.length}`)
    console.log(`   • Bookings: ${bookingsToCreate.length}`)
    console.log(`   • SOS Alerts: 2`)
    console.log('\n🔗 View at: http://localhost:3005/admin/customers')
    console.log('🆘 SOS Alerts: http://localhost:3005/admin/sos-alerts\n')

  } catch (error) {
    console.error('❌ Error seeding data:', error)
    throw error
  }
}

// Run the seed function
seedCustomers()
  .then(() => {
    console.log('✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
