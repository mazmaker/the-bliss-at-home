#!/usr/bin/env node

/**
 * Get Full Service IDs
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

async function getFullServiceIds() {
  console.log('🔍 Getting full service IDs...')

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const { data: services, error } = await supabase
      .from('services')
      .select('id, name_th, category')
      .limit(3)

    if (error) {
      console.error('❌ Query failed:', error.message)
      return
    }

    console.log('📋 Full Service IDs:')
    services.forEach(service => {
      console.log(`   Full ID: ${service.id}`)
      console.log(`   Name: ${service.name_th}`)
      console.log(`   Category: ${service.category}`)
      console.log('')
    })

  } catch (error) {
    console.error('💥 Failed:', error.message)
  }
}

getFullServiceIds()