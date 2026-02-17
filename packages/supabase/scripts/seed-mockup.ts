/**
 * Seed Mockup Jobs Data
 * Run with: pnpm tsx packages/supabase/scripts/seed-mockup.ts
 */

import { supabase } from '../src/auth/supabaseClient'

const mockupJobs = [
  // Pending Jobs
  {
    customer_name: 'คุณสมชาย รักสุขสันต์',
    customer_phone: '0812345678',
    service_name: 'นวดแผนไทย 2 ชั่วโมง',
    service_name_en: 'Thai Massage 2 hours',
    duration_minutes: 120,
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '14:00:00',
    address: 'โรงแรม Grande Centre Point Terminal 21',
    latitude: 13.7379871,
    longitude: 100.5602076,
    distance_km: 5.2,
    amount: 1200,
    staff_earnings: 840,
    status: 'pending' as const,
    hotel_name: 'Grande Centre Point Terminal 21',
    room_number: '1502'
  },
  {
    customer_name: 'Ms. Sarah Johnson',
    customer_phone: '0898765432',
    service_name: 'นวดน้ำมันอโรม่า 1.5 ชั่วโมง',
    service_name_en: 'Aromatherapy Oil Massage 1.5 hours',
    duration_minutes: 90,
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '16:30:00',
    address: 'โรงแรม SO/ Bangkok',
    latitude: 13.7202411,
    longitude: 100.5279842,
    distance_km: 3.8,
    amount: 1500,
    staff_earnings: 1050,
    status: 'pending' as const,
    hotel_name: 'SO/ Bangkok',
    room_number: '2108'
  },
  {
    customer_name: 'คุณวิภา เจริญสุข',
    customer_phone: '0823456789',
    service_name: 'นวดเท้า 1 ชั่วโมง',
    service_name_en: 'Foot Massage 1 hour',
    duration_minutes: 60,
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '18:00:00',
    address: 'โรงแรม Marriott Marquis Queens Park',
    latitude: 13.7331794,
    longitude: 100.5592875,
    distance_km: 4.5,
    amount: 800,
    staff_earnings: 560,
    status: 'pending' as const,
    hotel_name: 'Marriott Marquis Queens Park',
    room_number: '3205'
  },
  // Assigned/Confirmed Jobs (upcoming)
  {
    customer_name: 'Mr. David Wilson',
    customer_phone: '0845678901',
    service_name: 'นวดหินร้อน 2 ชั่วโมง',
    service_name_en: 'Hot Stone Massage 2 hours',
    duration_minutes: 120,
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '20:00:00',
    address: 'โรงแรม Anantara Siam Bangkok',
    latitude: 13.7447435,
    longitude: 100.5479538,
    distance_km: 2.1,
    amount: 2000,
    staff_earnings: 1400,
    status: 'assigned' as const,
    hotel_name: 'Anantara Siam Bangkok',
    room_number: '508'
  },
  {
    customer_name: 'คุณประภา สุขสันต์',
    customer_phone: '0834567890',
    service_name: 'นวดไทยผสมน้ำมัน 2 ชั่วโมง',
    service_name_en: 'Thai Oil Combo Massage 2 hours',
    duration_minutes: 120,
    scheduled_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    scheduled_time: '10:00:00',
    address: 'โรงแรม The Peninsula Bangkok',
    latitude: 13.7210588,
    longitude: 100.5106964,
    distance_km: 7.2,
    amount: 1800,
    staff_earnings: 1260,
    status: 'confirmed' as const,
    hotel_name: 'The Peninsula Bangkok',
    room_number: '705'
  },
  // Completed Jobs
  {
    customer_name: 'คุณนันทิดา สว่างใจ',
    customer_phone: '0856789012',
    service_name: 'นวดแผนไทย 1 ชั่วโมง',
    service_name_en: 'Thai Massage 1 hour',
    duration_minutes: 60,
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '10:00:00',
    address: 'โรงแรม Mandarin Oriental Bangkok',
    latitude: 13.7230926,
    longitude: 100.5159042,
    distance_km: 6.3,
    amount: 900,
    staff_earnings: 630,
    status: 'completed' as const,
    hotel_name: 'Mandarin Oriental Bangkok',
    room_number: '412',
    completed_at: new Date().toISOString()
  },
  {
    customer_name: 'Mr. James Anderson',
    customer_phone: '0878901234',
    service_name: 'นวดน้ำมันหอมระเหย 1 ชั่วโมง',
    service_name_en: 'Aromatherapy Massage 1 hour',
    duration_minutes: 60,
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '08:00:00',
    address: 'โรงแรม Four Seasons Bangkok',
    latitude: 13.7234586,
    longitude: 100.5403421,
    distance_km: 4.8,
    amount: 1100,
    staff_earnings: 770,
    status: 'completed' as const,
    hotel_name: 'Four Seasons Bangkok',
    room_number: '308',
    completed_at: new Date().toISOString()
  },
  {
    customer_name: 'คุณสุภาพร แสงสว่าง',
    customer_phone: '0889012345',
    service_name: 'นวดฝ่าเท้า 45 นาที',
    service_name_en: 'Foot Reflexology 45 min',
    duration_minutes: 45,
    scheduled_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
    scheduled_time: '19:00:00',
    address: 'โรงแรม Shangri-La Bangkok',
    latitude: 13.7209483,
    longitude: 100.5161822,
    distance_km: 5.9,
    amount: 650,
    staff_earnings: 455,
    status: 'completed' as const,
    hotel_name: 'Shangri-La Bangkok',
    room_number: '1508',
    completed_at: new Date(Date.now() - 86400000).toISOString()
  }
]

async function seedJobs() {
  console.log('🌱 Seeding mockup jobs...\n')

  try {
    // Get current user (staff)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.log('⚠️  No authenticated user found.')
      console.log('   Please login to the staff app first, then run this script again.\n')
      process.exit(1)
    }

    console.log(`✓ Authenticated as: ${user.email}`)

    // Get or create a customer profile
    let customerId
    const { data: existingCustomer } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'CUSTOMER')
      .limit(1)
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.id
      console.log('✓ Found existing customer\n')
    } else {
      console.log('Creating test customer...')
      const { data: newCustomer, error } = await supabase
        .from('profiles')
        .insert({
          email: `customer.test.${Date.now()}@theblissathome.com`,
          role: 'CUSTOMER',
          full_name: 'ทดสอบ ลูกค้า',
          phone: '0812345678',
          status: 'ACTIVE'
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating customer:', error.message)
        return
      }
      customerId = newCustomer.id
      console.log('✓ Created test customer\n')
    }

    // Prepare jobs data
    const jobsToInsert = mockupJobs.map((job: any) => ({
      ...job,
      customer_id: customerId,
      staff_id: (job.status !== 'pending') ? user.id : null
    }))

    // Insert jobs
    console.log(`Inserting ${jobsToInsert.length} mockup jobs...`)
    const { data, error } = await supabase
      .from('jobs')
      .insert(jobsToInsert)
      .select()

    if (error) {
      console.error('❌ Error inserting jobs:', error.message)
      console.error('   Details:', error)
      return
    }

    console.log(`✅ Successfully created ${data?.length || 0} jobs!\n`)

    // Show summary
    if (data) {
      const statusCount = data.reduce((acc: any, job: any) => {
        acc[job.status] = (acc[job.status] || 0) + 1
        return acc
      }, {})

      console.log('📊 Jobs by status:')
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`)
      })
    }

    console.log('\n✨ Done! Check your staff app to see the mockup data.')
    console.log(`   ${process.env.VITE_SUPABASE_URL?.replace('//', '//staff.')}/staff/jobs\n`)

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

seedJobs()
