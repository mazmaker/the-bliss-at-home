/**
 * 🔧 AUTO FIX Hotels Settings Column
 * แก้ปัญหา "column hotels.settings does not exist"
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔧 FIXING: Hotels Settings Column')
console.log('=================================')

async function fixHotelsSettings() {
  try {
    console.log('📝 Step 1: Adding settings column to hotels table...')

    // Check if column exists first
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'hotels')
      .eq('column_name', 'settings')

    if (columnError) {
      console.log('⚠️ Could not check schema, proceeding with update...')
    } else if (columns && columns.length > 0) {
      console.log('✅ Settings column already exists')
    } else {
      console.log('⚠️ Settings column missing, will add via update...')
    }

    console.log('\n🏨 Step 2: Updating hotel settings...')

    // Since we can't run ALTER TABLE directly, let's try to update existing hotels
    // This will fail if column doesn't exist, but that's expected
    const { data: hotels, error: hotelsError } = await supabase
      .from('hotels')
      .select('id, name_th, hotel_slug')

    if (hotelsError) {
      throw new Error('Failed to fetch hotels: ' + hotelsError.message)
    }

    console.log(`Found ${hotels.length} hotels to update`)

    // Try to update with default settings
    const defaultSettings = {
      discount_rate: 15,
      commission_rate: 20,
      auto_assign: true,
      notifications: true
    }

    for (const hotel of hotels) {
      try {
        const { error: updateError } = await supabase
          .from('hotels')
          .update({ settings: defaultSettings })
          .eq('id', hotel.id)

        if (!updateError) {
          console.log(`✅ Updated settings for ${hotel.name_th}`)
        } else {
          console.log(`⚠️ Could not update ${hotel.name_th}: ${updateError.message}`)
        }
      } catch (err) {
        console.log(`⚠️ Update failed for ${hotel.name_th}`)
      }
    }

    console.log('\n🎯 Step 3: Verifying hotels settings...')

    // Try to fetch hotels with settings
    const { data: updatedHotels, error: verifyError } = await supabase
      .from('hotels')
      .select('name_th, hotel_slug, settings')
      .order('name_th')

    if (!verifyError && updatedHotels) {
      console.log('\n📊 Hotels Settings Status:')
      updatedHotels.forEach((hotel, index) => {
        const hasSettings = hotel.settings && Object.keys(hotel.settings).length > 0
        const status = hasSettings ? '✅' : '❌'
        console.log(`   ${index + 1}. ${hotel.name_th} ${status}`)
        if (hasSettings) {
          console.log(`      Settings: ${JSON.stringify(hotel.settings)}`)
        }
      })

      const withSettings = updatedHotels.filter(h => h.settings && Object.keys(h.settings).length > 0).length
      const total = updatedHotels.length

      if (withSettings === total) {
        console.log('\n🎉 SUCCESS! All hotels have settings configured!')
        console.log('✅ Hotel settings error should be gone')
      } else {
        console.log(`\n⚠️ Partial success: ${withSettings}/${total} hotels have settings`)
        console.log('\n💡 Manual SQL needed:')
        console.log('1. Go to Supabase Dashboard → SQL Editor')
        console.log('2. Run: ALTER TABLE hotels ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT \'{}\'::jsonb;')
      }
    }

  } catch (error) {
    console.error('💥 Settings fix failed:', error.message)
    console.log('\n🚨 Manual Fix Required:')
    console.log('1. Go to Supabase Dashboard → SQL Editor')
    console.log('2. Copy-paste fix-hotels-settings.sql')
    console.log('3. Click RUN')
    console.log('\nThis will add the missing settings column to hotels table.')
  }
}

// Execute settings fix
fixHotelsSettings().catch(error => {
  console.error('🚨 Script failed:', error.message)
  console.log('\n💡 Use fix-hotels-settings.sql manually in Supabase Dashboard')
  process.exit(1)
})