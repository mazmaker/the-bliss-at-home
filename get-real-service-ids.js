/**
 * Get Real Service IDs from Database
 * ดึง service_id ที่มีอยู่จริงในฐานข้อมูล
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: './apps/server/.env' })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getRealServiceIds() {
  console.log('🔍 === ดึง Service IDs ที่มีอยู่จริง === 🔍\n')

  try {
    // Get all services
    const { data: services, error } = await supabase
      .from('services')
      .select('id, name_th, name_en, duration')
      .order('name_th')

    if (error) {
      console.log('❌ Error:', error.message)
      return
    }

    console.log(`✅ พบ Services: ${services.length} รายการ\n`)

    services.forEach((service, index) => {
      console.log(`${index + 1}. 📋 "${service.name_th}"${service.name_en ? ` (${service.name_en})` : ''}`)
      console.log(`   🆔 ID: ${service.id}`)
      console.log(`   ⏱️  Duration: ${service.duration} นาที`)
      console.log('')
    })

    // Return first service for testing
    if (services.length > 0) {
      console.log('🎯 แนะนำใช้ Service แรก สำหรับทดสอบ:')
      console.log(`   service_id: "${services[0].id}"`)
      console.log(`   name: "${services[0].name_th}"`)

      // Generate updated test script
      console.log('\n📝 Updated test script:')
      console.log(`
// Updated booking data with real service_id
const testBookingData = {
  hotel_id: '550e8400-e29b-41d4-a716-446655440001',
  service_id: '${services[0].id}', // ✅ Real service ID
  booking_date: '2026-02-24',
  booking_time: '14:00',
  duration: ${services[0].duration || 60},
  base_price: 1000,
  final_price: 1000,
  hotel_room_number: 'FIXED-101',
  customer_notes: 'Fixed test booking with real service ID',
  status: 'confirmed',
  payment_status: 'pending',
  is_hotel_booking: true,
  services: [
    {
      service_id: '${services[0].id}',
      duration: ${services[0].duration || 60},
      price: 1000,
      recipient_index: 0,
      sort_order: 0
    }
  ]
}
`)
    }

  } catch (error) {
    console.error('💥 Error:', error.message)
  }

  console.log('\n🎉 === เสร็จสิ้น ===')
}

// Run the function
getRealServiceIds()