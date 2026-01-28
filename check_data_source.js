// Simple check of data source without accessing auth.users directly
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkDataSource() {
  try {
    console.log('🔍 Analyzing Staff Data Source...')

    // Get staff data with details
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')

    if (staffError) {
      console.error('❌ Error getting staff:', staffError.message)
      return
    }

    console.log('👥 Current Staff Records:', staffData.length)
    console.log('')

    staffData.forEach((staff, index) => {
      console.log(`${index + 1}. ${staff.name_th} (${staff.status})`)
      console.log(`   📞 Phone: ${staff.phone}`)
      console.log(`   🆔 Profile ID: ${staff.profile_id || '❌ No auth account'}`)
      console.log(`   📅 Created: ${new Date(staff.created_at).toLocaleString()}`)
      console.log(`   💰 Earnings: ฿${staff.total_earnings?.toLocaleString()}`)
      console.log('')
    })

    // Check profiles table for connected users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')

    if (!profilesError && profiles) {
      console.log('📋 User Profiles:', profiles.length)
      profiles.forEach((profile, index) => {
        console.log(`${index + 1}. ${profile.email} (${profile.role})`)
        console.log(`   👤 Name: ${profile.full_name}`)
      })
    }

    console.log('\n🎯 DATA SOURCE ANALYSIS:')
    console.log('━'.repeat(50))

    const hasProfileIds = staffData.some(s => s.profile_id)
    const allCreatedToday = staffData.every(s => {
      const created = new Date(s.created_at)
      const today = new Date()
      return created.toDateString() === today.toDateString()
    })

    console.log(`📊 Staff records: ${staffData.length}`)
    console.log(`🔗 Connected to auth users: ${hasProfileIds ? 'Yes' : '❌ No'}`)
    console.log(`📅 All created today: ${allCreatedToday ? '✅ Yes (likely test data)' : 'No'}`)
    console.log(`💼 Has realistic earnings: ${staffData.some(s => s.total_earnings > 0) ? '✅ Yes' : 'No'}`)

    console.log('\n🏷️ DATA TYPE CONCLUSION:')
    if (!hasProfileIds && allCreatedToday) {
      console.log('📦 MOCK DATA - Inserted directly into database')
      console.log('   ↳ No authentication accounts')
      console.log('   ↳ Created for testing purposes')
      console.log('   ↳ Not from real LINE registrations')
    } else {
      console.log('👤 REAL DATA - From actual user registrations')
    }

    console.log('\n🎭 MOCK vs REAL INDICATORS:')
    console.log('📦 Mock Data Signs:')
    console.log('   • No profile_id connections')
    console.log('   • All created on same date/time')
    console.log('   • Perfect round numbers (450000, 320000)')
    console.log('   • Thai names with descriptive surnames')
    console.log('')
    console.log('👤 Real Data Signs:')
    console.log('   • Connected to auth.users via profile_id')
    console.log('   • Spread across different registration dates')
    console.log('   • Irregular earnings amounts')
    console.log('   • Real LINE user data')

    console.log('\n💡 TO GET REAL STAFF DATA:')
    console.log('1. 📱 Staff use LINE LIFF app: http://localhost:3004/staff/register')
    console.log('2. 📝 They fill registration form')
    console.log('3. ✅ Admin approves via: http://localhost:3001/admin/staff')
    console.log('4. 🔗 Data gets connected to real auth accounts')

  } catch (error) {
    console.error('❌ Analysis failed:', error.message)
  }
}

checkDataSource()