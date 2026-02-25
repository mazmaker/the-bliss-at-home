#!/usr/bin/env node

/**
 * Check Available Services for Testing
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

async function checkAvailableServices() {
  console.log('🔍 Checking available services and hotels...')

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    // Check services
    console.log('\n📋 Available Services:')
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name_th, name_en, category, base_price')
      .limit(5)

    if (servicesError) {
      console.error('❌ Services query failed:', servicesError.message)
    } else {
      services.forEach(service => {
        console.log(`   ${service.id.slice(-8)} - ${service.name_th} (${service.category}) - ฿${service.base_price}`)
      })
    }

    // Check hotels
    console.log('\n🏨 Available Hotels:')
    const { data: hotels, error: hotelsError } = await supabase
      .from('hotels')
      .select('id, name_th, address, phone, email, rating')
      .limit(3)

    if (hotelsError) {
      console.error('❌ Hotels query failed:', hotelsError.message)
    } else {
      hotels.forEach(hotel => {
        console.log(`   ${hotel.id.slice(-8)} - ${hotel.name_th}`)
        console.log(`      Address: ${hotel.address || 'ไม่ระบุ'}`)
        console.log(`      Phone: ${hotel.phone || 'ไม่ระบุ'}`)
        console.log(`      Email: ${hotel.email || 'ไม่ระบุ'}`)
        console.log(`      Rating: ${hotel.rating || 0} (${hotel.total_reviews || 0} reviews)`)
        console.log('')
      })
    }

  } catch (error) {
    console.error('💥 Check failed:', error.message)
  }
}

checkAvailableServices()