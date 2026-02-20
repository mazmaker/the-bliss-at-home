/**
 * Check Profiles Table Schema
 * ตรวจสอบ structure ของ profiles table
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 CHECKING: Profiles Table Schema')
console.log('==================================')

async function checkProfilesSchema() {
  try {
    // 1. Get sample profiles to see structure
    console.log('\n📋 1. Sample Profiles:')
    console.log('======================')

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5)

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError)
      return
    }

    if (profiles && profiles.length > 0) {
      console.log('Available columns:')
      const columns = Object.keys(profiles[0])
      columns.forEach((col, index) => {
        console.log(`  ${index + 1}. ${col}`)
      })

      console.log('\nSample data:')
      profiles.forEach((profile, index) => {
        console.log(`\n${index + 1}. Profile:`)
        Object.entries(profile).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`)
        })
      })
    } else {
      console.log('No profiles found')
    }

    // 2. Look for HOTEL role specifically
    console.log('\n👥 2. Users with HOTEL role:')
    console.log('============================')

    const { data: hotelProfiles, error: hotelError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'HOTEL')

    if (hotelError) {
      console.error('❌ Error fetching hotel profiles:', hotelError)
      return
    }

    if (hotelProfiles && hotelProfiles.length > 0) {
      hotelProfiles.forEach((profile, index) => {
        console.log(`\n${index + 1}. Hotel User:`)
        console.log(`   ID: ${profile.id}`)
        console.log(`   Email: ${profile.email}`)
        console.log(`   Role: ${profile.role}`)
        console.log(`   Created: ${profile.created_at}`)
        console.log(`   Updated: ${profile.updated_at}`)
      })
    } else {
      console.log('No hotel users found')
    }

    // 3. Check if there's a separate hotel_users or hotel_staff table
    console.log('\n🔍 3. Checking for Hotel-related tables:')
    console.log('========================================')

    // Try to find hotels relationship
    const { data: hotelRelations, error: hotelRelationsError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        role,
        hotels:hotels(id, name_th, name_en, hotel_slug)
      `)
      .eq('role', 'HOTEL')
      .limit(3)

    if (hotelRelationsError) {
      console.log('❌ No direct hotel relation found:', hotelRelationsError.message)
    } else {
      console.log('✅ Found hotel relations:')
      hotelRelations.forEach((profile, index) => {
        console.log(`${index + 1}. ${profile.email} → Hotels: ${JSON.stringify(profile.hotels)}`)
      })
    }

    // 4. Check recent bookings to see who created them
    console.log('\n📊 4. Recent Bookings - Created By:')
    console.log('==================================')

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, booking_number, hotel_id, created_by, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError)
    } else {
      console.log('Recent bookings:')
      for (const booking of bookings) {
        // Get creator info if exists
        let creatorInfo = 'Unknown'
        if (booking.created_by) {
          const { data: creator } = await supabase
            .from('profiles')
            .select('email, role')
            .eq('id', booking.created_by)
            .single()

          if (creator) {
            creatorInfo = `${creator.email} (${creator.role})`
          }
        }

        console.log(`  #${booking.booking_number} → Hotel: ${booking.hotel_id} → Created by: ${creatorInfo}`)
      }
    }

  } catch (error) {
    console.error('💥 Schema check failed:', error)
  }
}

checkProfilesSchema()