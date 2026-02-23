#!/usr/bin/env node

/**
 * Check Hotel Coordinates in Database
 * 🔍 Debug why map is not showing
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://hbxowlasqmojpmkyvfib.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhieG93bGFzcW1vanBta3l2ZmliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5Mzk3MzQsImV4cCI6MjA1MDUxNTczNH0.Y4M-7HrjJ_DnJXv-d-J9_tFELJrE1zz2sXc3tM_tOoM'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkHotelCoordinates() {
  console.log('🔍 Checking Hotel Coordinates...')
  console.log('='*50)

  try {
    // 1. Check if latitude/longitude columns exist
    console.log('1️⃣ Checking if coordinate columns exist...')

    // 2. Get all hotels data
    const { data: hotels, error: hotelsError } = await supabase
      .from('hotels')
      .select('id, name_th, name_en, hotel_slug, address, latitude, longitude, status')
      .order('name_th')

    if (hotelsError) {
      console.error('❌ Error fetching hotels:', hotelsError)
      return
    }

    console.log(`📊 Total hotels: ${hotels?.length || 0}`)

    // 3. Check specific hotel: resort-chiang-mai
    console.log('\n2️⃣ Checking specific hotel: resort-chiang-mai')

    const targetHotel = hotels?.find(h =>
      h.hotel_slug === 'resort-chiang-mai' ||
      h.id === '550e8400-e29b-41d4-a716-446655440002'
    )

    if (targetHotel) {
      console.log('✅ Target hotel found:')
      console.log(`   Name: ${targetHotel.name_th} (${targetHotel.name_en})`)
      console.log(`   Slug: ${targetHotel.hotel_slug}`)
      console.log(`   ID: ${targetHotel.id}`)
      console.log(`   Address: ${targetHotel.address || 'ไม่ระบุ'}`)
      console.log(`   Latitude: ${targetHotel.latitude || 'NULL'}`)
      console.log(`   Longitude: ${targetHotel.longitude || 'NULL'}`)
      console.log(`   Status: ${targetHotel.status}`)

      if (targetHotel.latitude && targetHotel.longitude) {
        console.log('🗺️ Coordinates available! Map should display.')
      } else {
        console.log('⚠️ NO COORDINATES! This is why map is not showing.')
      }
    } else {
      console.log('❌ Target hotel NOT FOUND!')
    }

    // 4. Show all hotels with coordinates
    console.log('\n3️⃣ Hotels with coordinates:')
    const hotelsWithCoords = hotels?.filter(h => h.latitude && h.longitude) || []

    if (hotelsWithCoords.length === 0) {
      console.log('❌ NO HOTELS have coordinates! Migration not applied.')
    } else {
      hotelsWithCoords.forEach((hotel, index) => {
        console.log(`${index + 1}. ${hotel.name_th}`)
        console.log(`   📍 ${hotel.latitude}, ${hotel.longitude}`)
        console.log(`   🔗 /hotel/${hotel.hotel_slug}/profile`)
      })
    }

    // 5. Show hotels without coordinates
    console.log('\n4️⃣ Hotels WITHOUT coordinates:')
    const hotelsWithoutCoords = hotels?.filter(h => !h.latitude || !h.longitude) || []

    if (hotelsWithoutCoords.length > 0) {
      hotelsWithoutCoords.forEach((hotel, index) => {
        console.log(`${index + 1}. ${hotel.name_th} (${hotel.hotel_slug})`)
      })
      console.log(`\n⚠️ ${hotelsWithoutCoords.length} hotels need coordinates!`)
    }

    // 6. Check table schema
    console.log('\n5️⃣ Checking table schema...')

    const { data: schemaData, error: schemaError } = await supabase
      .from('hotels')
      .select('*')
      .limit(1)

    if (schemaError) {
      console.error('❌ Error checking schema:', schemaError)
    } else {
      const sampleHotel = schemaData?.[0]
      const hasLatitude = sampleHotel && 'latitude' in sampleHotel
      const hasLongitude = sampleHotel && 'longitude' in sampleHotel

      console.log(`   latitude column: ${hasLatitude ? '✅ EXISTS' : '❌ MISSING'}`)
      console.log(`   longitude column: ${hasLongitude ? '✅ EXISTS' : '❌ MISSING'}`)

      if (!hasLatitude || !hasLongitude) {
        console.log('\n🚨 COLUMNS MISSING! Run the migration SQL first.')
      }
    }

    // 7. Diagnosis and recommendations
    console.log('\n📋 DIAGNOSIS:')

    if (hotelsWithCoords.length === 0) {
      console.log('❌ Problem: No hotels have coordinates')
      console.log('💡 Solution: Run FINAL-HOTEL-MAP-MIGRATION.sql')
    } else if (!targetHotel?.latitude) {
      console.log('❌ Problem: Target hotel missing coordinates')
      console.log('💡 Solution: Update specific hotel coordinates')
    } else {
      console.log('✅ Data looks good! Check frontend issues:')
      console.log('   - Google Maps API Key')
      console.log('   - Console errors')
      console.log('   - Network requests')
    }

    // 8. Quick fix for target hotel
    if (targetHotel && (!targetHotel.latitude || !targetHotel.longitude)) {
      console.log('\n🛠️ QUICK FIX: Adding coordinates to target hotel...')

      const { error: updateError } = await supabase
        .from('hotels')
        .update({
          latitude: 18.7883,
          longitude: 98.9853
        })
        .eq('id', targetHotel.id)

      if (updateError) {
        console.error('❌ Failed to update:', updateError)
      } else {
        console.log('✅ Updated successfully! Try refreshing hotel profile.')
      }
    }

  } catch (error) {
    console.error('💥 Error:', error)
  }
}

checkHotelCoordinates()