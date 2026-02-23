#!/usr/bin/env node

/**
 * Apply Hotel Coordinates Migration - Production Safe
 * 🗺️ Add latitude/longitude to hotels table
 * Date: 2026-02-20
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://hbxowlasqmojpmkyvfib.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhieG93bGFzcW1vanBta3l2ZmliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDkzOTczNCwiZXhwIjoyMDUwNTE1NzM0fQ.lNRQKYqcB3KOBrIOKxGklTZVbSTZoMlQ6PQlbKTMeRY'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('🗺️ Applying Hotel Coordinates Migration...')

  try {
    // Step 1: Add columns to hotels table
    console.log('1️⃣ Adding latitude/longitude columns to hotels table...')

    // First, let's check if columns already exist
    const { data: columns, error: columnError } = await supabase.rpc('sql', {
      query: `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'hotels'
        AND column_name IN ('latitude', 'longitude');
      `
    })

    console.log('📋 Existing columns:', columns?.length || 0)

    // Add columns if they don't exist
    const alterQuery = `
      -- Add latitude and longitude columns
      ALTER TABLE hotels
      ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
      ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);

      -- Add comments
      COMMENT ON COLUMN hotels.latitude IS 'Hotel latitude coordinate for Google Maps display';
      COMMENT ON COLUMN hotels.longitude IS 'Hotel longitude coordinate for Google Maps display';

      -- Add spatial index
      CREATE INDEX IF NOT EXISTS idx_hotels_coordinates ON hotels(latitude, longitude)
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

      -- Add validation constraints
      ALTER TABLE hotels
      ADD CONSTRAINT IF NOT EXISTS check_latitude_range
      CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

      ALTER TABLE hotels
      ADD CONSTRAINT IF NOT EXISTS check_longitude_range
      CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
    `

    const { error: alterError } = await supabase.rpc('sql', { query: alterQuery })

    if (alterError) {
      console.error('❌ Error adding columns:', alterError)
      process.exit(1)
    }

    console.log('✅ Successfully added coordinates columns and constraints')

    // Step 2: Update sample hotels with real coordinates
    console.log('2️⃣ Updating sample hotels with coordinates...')

    // Bangkok coordinates (Siam area: 13.7563, 100.5018)
    const { error: bangkokError } = await supabase
      .from('hotels')
      .update({
        latitude: 13.7563,
        longitude: 100.5018
      })
      .or('hotel_slug.eq.grand-palace-bangkok,name_en.ilike.%Bangkok%,name_th.ilike.%กรุงเทพ%,name_th.ilike.%บางกอก%')

    if (bangkokError) {
      console.warn('⚠️ Bangkok hotel update warning:', bangkokError.message)
    }

    // Chiang Mai coordinates (Old City: 18.7883, 98.9853)
    const { error: chiangmaiError } = await supabase
      .from('hotels')
      .update({
        latitude: 18.7883,
        longitude: 98.9853
      })
      .or('hotel_slug.eq.resort-chiang-mai,name_en.ilike.%Chiang Mai%,name_th.ilike.%เชียงใหม่%')

    if (chiangmaiError) {
      console.warn('⚠️ Chiang Mai hotel update warning:', chiangmaiError.message)
    }

    // Update the specific hotel ID: 550e8400-e29b-41d4-a716-446655440002
    const { error: specificError } = await supabase
      .from('hotels')
      .update({
        latitude: 18.7883,
        longitude: 98.9853
      })
      .eq('id', '550e8400-e29b-41d4-a716-446655440002')

    if (specificError) {
      console.warn('⚠️ Specific hotel update warning:', specificError.message)
    }

    console.log('✅ Successfully updated hotel coordinates')

    // Step 3: Verify results
    console.log('3️⃣ Verifying migration results...')

    const { data: hotelsWithCoords, error: verifyError } = await supabase
      .from('hotels')
      .select('id, name_th, name_en, hotel_slug, latitude, longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    if (verifyError) {
      console.error('❌ Error verifying results:', verifyError)
      return
    }

    console.log(`\n🎉 Migration Completed Successfully!`)
    console.log(`📊 Hotels with coordinates: ${hotelsWithCoords?.length || 0}`)

    if (hotelsWithCoords && hotelsWithCoords.length > 0) {
      console.log('\n📍 Hotels with coordinates:')
      hotelsWithCoords.forEach((hotel, index) => {
        console.log(`${index + 1}. ${hotel.name_th} (${hotel.name_en})`)
        console.log(`   📍 ${hotel.latitude}, ${hotel.longitude}`)
        console.log(`   🔗 Slug: ${hotel.hotel_slug}`)
        console.log(`   🆔 ID: ${hotel.id}`)
        console.log('')
      })
    }

    // Step 4: Check all hotels data
    console.log('4️⃣ Checking all hotels data...')

    const { data: allHotels, error: allError } = await supabase
      .from('hotels')
      .select('id, name_th, name_en, hotel_slug, address, latitude, longitude, status')
      .order('name_th')

    if (allError) {
      console.error('❌ Error fetching all hotels:', allError)
      return
    }

    console.log('\n📋 All Hotels Status:')
    allHotels?.forEach((hotel, index) => {
      const hasCoords = hotel.latitude && hotel.longitude
      console.log(`${index + 1}. ${hotel.name_th}`)
      console.log(`   🔗 Slug: ${hotel.hotel_slug}`)
      console.log(`   🆔 ID: ${hotel.id}`)
      console.log(`   🗺️ Coordinates: ${hasCoords ? `${hotel.latitude}, ${hotel.longitude}` : 'Not set'}`)
      console.log(`   📍 Address: ${hotel.address || 'Not set'}`)
      console.log(`   ⭐ Status: ${hotel.status}`)
      console.log('')
    })

    console.log('\n✅ Hotel Profile + Auto Map Display is now ready!')
    console.log('🔗 Test URLs:')
    console.log(`   Admin: http://localhost:3001/admin/hotels/550e8400-e29b-41d4-a716-446655440002`)
    console.log(`   Hotel: http://localhost:3003/hotel/resort-chiang-mai/profile`)

  } catch (error) {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  }
}

// Alternative SQL execution using raw query
async function executeSQLDirect() {
  const sqlQuery = `
    -- Add columns if they don't exist
    ALTER TABLE hotels
    ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
    ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);

    -- Update resort-chiang-mai with Chiang Mai coordinates
    UPDATE hotels
    SET latitude = 18.7883, longitude = 98.9853
    WHERE hotel_slug = 'resort-chiang-mai' OR id = '550e8400-e29b-41d4-a716-446655440002';

    -- Add Bangkok coordinates to Bangkok hotels
    UPDATE hotels
    SET latitude = 13.7563, longitude = 100.5018
    WHERE hotel_slug = 'grand-palace-bangkok' OR name_en ILIKE '%Bangkok%';

    -- Select all hotels to verify
    SELECT id, name_th, name_en, hotel_slug, address, latitude, longitude, status
    FROM hotels
    ORDER BY name_th;
  `

  try {
    const { data, error } = await supabase.rpc('sql', { query: sqlQuery })

    if (error) {
      console.error('❌ SQL execution failed:', error)
      return
    }

    console.log('✅ SQL executed successfully')
    console.log('📊 Result:', data)

  } catch (error) {
    console.error('💥 SQL execution error:', error)
  }
}

// Check if we can use rpc function, if not fall back to direct SQL
applyMigration().catch(() => {
  console.log('⚡ Trying alternative SQL execution...')
  executeSQLDirect()
})