/**
 * Create Test Service Data for Hotel Booking
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function createTestService() {
  console.log('🛠️ Creating Test Service for Booking...')

  const testServiceId = '123e4567-e89b-12d3-a456-426614174000'

  try {
    // Check if service exists
    const { data: existingService, error: checkError } = await supabase
      .from('services')
      .select('id, name')
      .eq('id', testServiceId)
      .single()

    if (existingService) {
      console.log('✅ Test service already exists:', existingService.name)
      return existingService
    }

    // Create test service
    const testService = {
      id: testServiceId,
      name: 'Traditional Thai Massage',
      name_en: 'Traditional Thai Massage',
      name_th: 'นวดแผนไทย',
      description: 'Relaxing traditional Thai massage',
      description_en: 'Relaxing traditional Thai massage',
      description_th: 'นวดผ่อนคลายแผนไทย',
      base_price: 2000,
      duration_minutes: 120,
      category: 'massage',
      is_active: true,
      requires_therapist: true,
      max_recipients: 2
    }

    const { data, error } = await supabase
      .from('services')
      .insert(testService)
      .select()
      .single()

    if (error) {
      console.error('❌ Service creation failed:', error)
      return null
    }

    console.log('✅ Test service created successfully!')
    console.log(`   ID: ${data.id}`)
    console.log(`   Name: ${data.name}`)
    console.log(`   Price: ฿${data.base_price}`)

    return data

  } catch (error) {
    console.error('💥 Error:', error.message)
    return null
  }
}

createTestService()