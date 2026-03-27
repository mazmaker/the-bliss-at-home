#!/usr/bin/env node

/**
 * Apply pricing fixes to use only standard durations (60/90/120)
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function main() {
  console.log('🔧 Applying Services Pricing Fixes...\n')

  try {
    // 1. Fix สปาไทย: Change 150 min to 120 min and add all options
    console.log('1. Fixing สปาไทย...')
    const { error: error1 } = await supabase
      .from('services')
      .update({
        duration_options: [60, 90, 120],
        duration: 120,
        price_60: 1500,
        price_90: 2000,
        price_120: 2500
      })
      .eq('name_th', 'สปาไทย')

    if (error1) {
      console.error('❌ Error updating สปาไทย:', error1.message)
    } else {
      console.log('✅ สปาไทย updated')
    }

    // 2. Fix แพ็กเกจทาสีเจลมือและเท้า: Add price_120
    console.log('2. Fixing แพ็กเกจทาสีเจลมือและเท้า...')
    const { error: error2 } = await supabase
      .from('services')
      .update({
        price_120: 1700
      })
      .eq('name_th', 'แพ็กเกจทาสีเจลมือและเท้า')

    if (error2) {
      console.error('❌ Error updating แพ็กเกจทาสีเจลมือและเท้า:', error2.message)
    } else {
      console.log('✅ แพ็กเกจทาสีเจลมือและเท้า updated')
    }

    // 3. Fix นวดน้ำมัน (2 ชั่วโมง): Add price_120
    console.log('3. Fixing นวดน้ำมัน (2 ชั่วโมง)...')
    const { error: error3 } = await supabase
      .from('services')
      .update({
        price_120: 1000
      })
      .eq('name_th', 'นวดน้ำมัน (2 ชั่วโมง)')

    if (error3) {
      console.error('❌ Error updating นวดน้ำมัน (2 ชั่วโมง):', error3.message)
    } else {
      console.log('✅ นวดน้ำมัน (2 ชั่วโมง) updated')
    }

    console.log('\n🎉 All pricing fixes applied successfully!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

main().catch(console.error)