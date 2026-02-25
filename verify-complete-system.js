const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyCompleteSystem() {
  console.log('🔍 COMPLETE SYSTEM VERIFICATION')
  console.log('=====================================')

  try {
    // 1. Check Hotels Table
    console.log('\n1️⃣ HOTELS TABLE VERIFICATION:')
    console.log('----------------------------')

    const { data: hotels, error: hotelError } = await supabase
      .from('hotels')
      .select('*')
      .in('login_email', ['bangkok@testhotel.com', 'chiangmai@testhotel.com'])

    if (hotelError) {
      console.error('❌ Error fetching hotels:', hotelError)
      return
    }

    hotels.forEach(hotel => {
      console.log(`\n🏨 ${hotel.name_th}:`)
      console.log(`   📧 Login Email: ${hotel.login_email}`)
      console.log(`   🆔 Hotel ID: ${hotel.id}`)
      console.log(`   👤 Auth User ID: ${hotel.auth_user_id}`)
      console.log(`   🔐 Password Change Required: ${hotel.password_change_required}`)
      console.log(`   ✅ Login Enabled: ${hotel.login_enabled}`)
      console.log(`   🔑 Temporary Password: ${hotel.temporary_password}`)
      console.log(`   📊 Status: ${hotel.status}`)

      // Validation checks
      const checks = {
        '✅ Has auth_user_id': !!hotel.auth_user_id,
        '✅ Has login_email': !!hotel.login_email,
        '✅ Password change required': hotel.password_change_required === true,
        '✅ Login enabled': hotel.login_enabled === true,
        '✅ Has temporary password': !!hotel.temporary_password,
        '✅ Status is active': hotel.status === 'active'
      }

      Object.entries(checks).forEach(([check, passed]) => {
        console.log(`   ${passed ? '✅' : '❌'} ${check.replace('✅ ', '')}`)
      })
    })

    // 2. Check Profiles Table
    console.log('\n\n2️⃣ PROFILES TABLE VERIFICATION:')
    console.log('------------------------------')

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .in('email', ['bangkok@testhotel.com', 'chiangmai@testhotel.com'])

    if (profileError) {
      console.error('❌ Error fetching profiles:', profileError)
      return
    }

    profiles.forEach(profile => {
      console.log(`\n👤 ${profile.email}:`)
      console.log(`   🆔 Profile ID: ${profile.id}`)
      console.log(`   🏨 Hotel ID: ${profile.hotel_id}`)
      console.log(`   👨‍💼 Role: ${profile.role}`)
      console.log(`   📛 Full Name: ${profile.full_name}`)

      // Validation checks
      const checks = {
        '✅ Has profile ID': !!profile.id,
        '✅ Has hotel_id': !!profile.hotel_id,
        '✅ Role is HOTEL': profile.role === 'HOTEL',
        '✅ Has email': !!profile.email
      }

      Object.entries(checks).forEach(([check, passed]) => {
        console.log(`   ${passed ? '✅' : '❌'} ${check.replace('✅ ', '')}`)
      })
    })

    // 3. Cross-Reference Validation
    console.log('\n\n3️⃣ CROSS-REFERENCE VALIDATION:')
    console.log('------------------------------')

    hotels.forEach(hotel => {
      const matchingProfile = profiles.find(p => p.id === hotel.auth_user_id)
      console.log(`\n🔗 ${hotel.name_th}:`)

      if (matchingProfile) {
        console.log(`   ✅ Profile found for auth_user_id`)
        console.log(`   ✅ Profile hotel_id matches: ${matchingProfile.hotel_id === hotel.id}`)
        console.log(`   ✅ Profile role is HOTEL: ${matchingProfile.role === 'HOTEL'}`)
        console.log(`   ✅ Profile email matches: ${matchingProfile.email === hotel.login_email}`)
      } else {
        console.log(`   ❌ NO MATCHING PROFILE FOUND`)
      }
    })

    // 4. Test Direct Database Queries
    console.log('\n\n4️⃣ DIRECT QUERY TESTS:')
    console.log('----------------------')

    for (const hotel of hotels) {
      console.log(`\n🧪 Testing ${hotel.name_th}:`)

      // Test the exact query used in the login component
      const { data: testQuery, error: testError } = await supabase
        .from('hotels')
        .select('password_change_required')
        .eq('auth_user_id', hotel.auth_user_id)
        .single()

      if (testError) {
        console.log(`   ❌ Query failed:`, testError.message)
      } else {
        console.log(`   ✅ Query successful`)
        console.log(`   📊 password_change_required: ${testQuery.password_change_required}`)
      }
    }

    // 5. Login Flow Simulation
    console.log('\n\n5️⃣ LOGIN FLOW SIMULATION:')
    console.log('-------------------------')

    for (const hotel of hotels) {
      console.log(`\n🔐 Simulating login for ${hotel.name_th}:`)

      // Step 1: User would login with email/password
      console.log(`   📧 Email: ${hotel.login_email}`)
      console.log(`   🔑 Temp Password: ${hotel.temporary_password}`)

      // Step 2: After successful login, system would check profile
      const profile = profiles.find(p => p.id === hotel.auth_user_id)
      if (profile) {
        console.log(`   ✅ Profile loaded: role = ${profile.role}`)

        // Step 3: Check if role === 'HOTEL'
        if (profile.role === 'HOTEL') {
          console.log(`   ✅ Role validation passed`)

          // Step 4: Check password_change_required
          if (hotel.password_change_required) {
            console.log(`   ✅ Password change required - SHOULD SHOW FORM`)
          } else {
            console.log(`   ➡️ Password change not required - SHOULD REDIRECT`)
          }
        } else {
          console.log(`   ❌ Role validation failed`)
        }
      } else {
        console.log(`   ❌ Profile not found`)
      }
    }

    // 6. Final Summary
    console.log('\n\n6️⃣ SYSTEM STATUS SUMMARY:')
    console.log('=========================')

    const totalHotels = hotels.length
    const validHotels = hotels.filter(h =>
      h.auth_user_id &&
      h.login_email &&
      h.password_change_required === true &&
      h.login_enabled === true &&
      h.temporary_password
    ).length

    const totalProfiles = profiles.length
    const validProfiles = profiles.filter(p =>
      p.id &&
      p.hotel_id &&
      p.role === 'HOTEL' &&
      p.email
    ).length

    console.log(`📊 Hotels: ${validHotels}/${totalHotels} valid`)
    console.log(`📊 Profiles: ${validProfiles}/${totalProfiles} valid`)

    const systemReady = validHotels === 2 && validProfiles === 2
    console.log(`\n🎯 SYSTEM STATUS: ${systemReady ? '✅ READY FOR TESTING' : '❌ NEEDS FIXES'}`)

    if (systemReady) {
      console.log('\n🚀 READY TO TEST:')
      console.log('1. Go to: http://localhost:3003/')
      console.log('2. Login: bangkok@testhotel.com / TempPass123!')
      console.log('3. Should show password change form')
      console.log('4. Test: chiangmai@testhotel.com / TempPass456!')
    } else {
      console.log('\n🔧 ISSUES TO FIX:')
      if (validHotels < 2) console.log('- Fix hotel data')
      if (validProfiles < 2) console.log('- Fix profile data')
    }

  } catch (error) {
    console.error('❌ Verification error:', error)
  }
}

verifyCompleteSystem()