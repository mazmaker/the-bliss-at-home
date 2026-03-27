#!/usr/bin/env node

/**
 * Test new pricing logic without arbitrary multipliers
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// NEW pricing function (without arbitrary multipliers)
function getPriceForDuration(service, duration) {
  // Use stored per-duration prices if available
  if (duration === 60 && service.price_60) return service.price_60
  if (duration === 90 && service.price_90) return service.price_90
  if (duration === 120 && service.price_120) return service.price_120

  // For standard durations, calculate from base_price with fixed multipliers
  const basePrice = Number(service.base_price)

  switch (duration) {
    case 60:
      return Math.round(basePrice * 1.0)
    case 90:
      return Math.round(basePrice * 1.435)
    case 120:
      return Math.round(basePrice * 1.855)
    default:
      // For non-standard durations, use base_price as fallback
      console.warn(`⚠️ Non-standard duration ${duration} min for service ${service.name_th}. Using base_price as fallback.`)
      return Math.round(basePrice)
  }
}

function getAvailableDurations(service) {
  if (service.duration_options && Array.isArray(service.duration_options)) {
    return service.duration_options.sort((a, b) => a - b)
  }
  return [service.duration || 60]
}

async function main() {
  console.log('🔍 Testing NEW Pricing Logic (No Arbitrary Multipliers)\n')

  const { data: services, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)

  if (error) {
    console.error('❌ Error fetching services:', error)
    return
  }

  let problemServices = []

  services.forEach((service, index) => {
    const durations = getAvailableDurations(service)
    console.log(`${index + 1}. 📋 ${service.name_th}`)
    console.log(`   Duration options: [${durations.join(', ')}] min`)

    durations.forEach(dur => {
      const price = getPriceForDuration(service, dur)
      const hasStoredPrice =
        (dur === 60 && service.price_60) ||
        (dur === 90 && service.price_90) ||
        (dur === 120 && service.price_120)

      const priceSource = hasStoredPrice ? '(stored)' : '(calculated)'
      console.log(`   ${dur} min: ฿${price.toLocaleString()} ${priceSource}`)

      // Check for problematic cases
      if (dur !== 60 && dur !== 90 && dur !== 120) {
        problemServices.push({
          service: service.name_th,
          duration: dur,
          price,
          reason: 'Non-standard duration'
        })
      }
    })
    console.log('')
  })

  if (problemServices.length > 0) {
    console.log('⚠️ SERVICES WITH ISSUES:')
    console.log('=' .repeat(50))
    problemServices.forEach(prob => {
      console.log(`❌ ${prob.service}`)
      console.log(`   Duration: ${prob.duration} min (${prob.reason})`)
      console.log(`   Price: ฿${prob.price.toLocaleString()}`)
      console.log('')
    })

    console.log('🔧 RECOMMENDED FIXES:')
    console.log('1. Add stored prices for these durations')
    console.log('2. OR adjust duration_options to use 60/90/120 only')
  } else {
    console.log('✅ All services use proper duration/pricing!')
  }
}

main().catch(console.error)