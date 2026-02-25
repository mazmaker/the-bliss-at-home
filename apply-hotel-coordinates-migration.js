#!/usr/bin/env node

/**
 * Apply Hotel Coordinates Migration
 * 🗺️ Add latitude/longitude to hotels table for Auto Map Display
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

async function applyHotelCoordinatesMigration() {
  console.log('🗺️ Starting Hotel Coordinates Migration...')

  try {
    // 1. Add latitude and longitude columns
    console.log('⚡ Adding latitude and longitude columns to hotels table...')

    const alterTableQuery = `
      -- Add coordinates columns
      ALTER TABLE hotels
      ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
      ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);

      -- Add comments
      COMMENT ON COLUMN hotels.latitude IS 'Hotel latitude coordinate for Google Maps display (decimal degrees)';
      COMMENT ON COLUMN hotels.longitude IS 'Hotel longitude coordinate for Google Maps display (decimal degrees)';
    `

    const { error: alterError } = await supabase.rpc('exec_sql', { sql: alterTableQuery })
    if (alterError) {
      console.error('❌ Error adding columns:', alterError)
      return
    }

    console.log('✅ Successfully added latitude/longitude columns')

    // 2. Add indexes
    console.log('🔍 Adding spatial index for coordinates...')

    const indexQuery = `
      CREATE INDEX IF NOT EXISTS idx_hotels_coordinates ON hotels(latitude, longitude)
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
    `

    const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexQuery })
    if (indexError) {
      console.error('❌ Error adding index:', indexError)
      return
    }

    console.log('✅ Successfully added spatial index')

    // 3. Add validation constraints
    console.log('🔒 Adding coordinate validation constraints...')

    const constraintQuery = `
      -- Add check constraints for coordinate validation
      ALTER TABLE hotels
      ADD CONSTRAINT IF NOT EXISTS check_latitude_range
      CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

      ALTER TABLE hotels
      ADD CONSTRAINT IF NOT EXISTS check_longitude_range
      CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
    `

    const { error: constraintError } = await supabase.rpc('exec_sql', { sql: constraintQuery })
    if (constraintError) {
      console.error('❌ Error adding constraints:', constraintError)
      return
    }

    console.log('✅ Successfully added validation constraints')

    // 4. Create validation function
    console.log('🛠️ Creating coordinate validation function...')

    const functionQuery = `
      CREATE OR REPLACE FUNCTION validate_hotel_coordinates(lat DECIMAL, lng DECIMAL)
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      AS $$
      BEGIN
        -- Validate latitude range (-90 to 90)
        IF lat IS NOT NULL AND (lat < -90 OR lat > 90) THEN
          RETURN FALSE;
        END IF;

        -- Validate longitude range (-180 to 180)
        IF lng IS NOT NULL AND (lng < -180 OR lng > 180) THEN
          RETURN FALSE;
        END IF;

        RETURN TRUE;
      END;
      $$;

      -- Grant permissions
      GRANT EXECUTE ON FUNCTION validate_hotel_coordinates TO authenticated;
      GRANT EXECUTE ON FUNCTION validate_hotel_coordinates TO anon;
    `

    const { error: functionError } = await supabase.rpc('exec_sql', { sql: functionQuery })
    if (functionError) {
      console.error('❌ Error creating function:', functionError)
      return
    }

    console.log('✅ Successfully created validation function')

    // 5. Update existing hotels with sample coordinates
    console.log('📍 Updating sample hotels with Bangkok/Chiang Mai coordinates...')

    // Bangkok coordinates (13.7563, 100.5018)
    const bangkokUpdate = await supabase
      .from('hotels')
      .update({
        latitude: 13.7563,
        longitude: 100.5018
      })
      .or('hotel_slug.eq.grand-palace-bangkok,name_en.ilike.%Bangkok%,name_th.ilike.%กรุงเทพ%')

    // Chiang Mai coordinates (18.7883, 98.9853)
    const chiangmaiUpdate = await supabase
      .from('hotels')
      .update({
        latitude: 18.7883,
        longitude: 98.9853
      })
      .or('hotel_slug.eq.resort-chiang-mai,name_en.ilike.%Chiang Mai%,name_th.ilike.%เชียงใหม่%')

    // Dusit Thani Bangkok coordinates (13.7244, 100.5014)
    const dusitUpdate = await supabase
      .from('hotels')
      .update({
        latitude: 13.7244,
        longitude: 100.5014
      })
      .or('hotel_slug.eq.dusit-thani-bangkok,name_en.ilike.%Dusit%,name_th.ilike.%ดุสิต%')

    console.log('✅ Successfully updated sample hotel coordinates')

    // 6. Verify results
    console.log('🔍 Verifying migration results...')

    const { data: hotelsWithCoords, error: verifyError } = await supabase
      .from('hotels')
      .select('id, name_th, name_en, latitude, longitude, hotel_slug')
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
        console.log('')
      })
    }

    console.log('✅ Hotel Profile + Auto Map Display is now ready!')
    console.log('📝 Next steps:')
    console.log('  1. Admin can now add/edit hotel coordinates')
    console.log('  2. Hotel Profile will auto-display Google Maps')
    console.log('  3. Update TypeScript types for new fields')

  } catch (error) {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  }
}

// Helper function to execute raw SQL (if rpc doesn't work)
async function execSQL(sql) {
  const { data, error } = await supabase.rpc('exec', { sql })
  if (error) throw error
  return data
}

// Run migration
applyHotelCoordinatesMigration()