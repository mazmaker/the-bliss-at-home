#!/usr/bin/env node
/**
 * Get a real service ID for testing
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function getRealService() {
  console.log('🔍 FINDING A REAL SERVICE ID...')

  try {
    const { data: services, error } = await supabase
      .from('services')
      .select('id, name_th, name_en')
      .limit(5)

    if (error) {
      console.log('❌ Error fetching services:', error.message)
      return null
    }

    if (services && services.length > 0) {
      console.log(`✅ Found ${services.length} services:`)
      services.forEach((service, i) => {
        console.log(`  ${i+1}. ${service.id} - ${service.name_en || service.name_th}`)
      })

      console.log(`\n🎯 Using service: ${services[0].id}`)
      return services[0].id
    } else {
      console.log('❌ No services found')
      return null
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    return null
  }
}

getRealService()