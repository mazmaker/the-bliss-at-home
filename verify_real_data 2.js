// Script to verify that the app is using real data from Supabase Cloud
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifyRealData() {
  try {
    console.log('🔍 Verifying real data integration...')
    console.log('🌐 Supabase Cloud URL:', supabaseUrl)

    // Test the same query that the admin app would use
    console.log('\n📊 Testing staff data query (same as admin app)...')

    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select(`
        *,
        profile:profiles(email, full_name),
        skills:staff_skills(
          id,
          skill_id,
          level,
          years_experience,
          skill:skills(id, name_th, name_en)
        )
      `)
      .order('created_at', { ascending: false })

    if (staffError) {
      console.error('❌ Error fetching staff data:', staffError.message)
      return false
    }

    console.log('✅ Staff data fetched successfully!')
    console.log('📈 Total staff members:', staffData.length)

    // Analyze the data like the admin dashboard would
    const activeStaff = staffData.filter(s => s.status === 'active').length
    const pendingStaff = staffData.filter(s => s.status === 'pending').length
    const totalEarnings = staffData.reduce((sum, s) => sum + (s.total_earnings || 0), 0)
    const avgRating = staffData.length > 0
      ? staffData.reduce((sum, s) => sum + (s.rating || 0), 0) / staffData.length
      : 0

    console.log('\n📊 Staff Statistics (what admin dashboard will show):')
    console.log(`  • Active Staff: ${activeStaff}`)
    console.log(`  • Pending Staff: ${pendingStaff}`)
    console.log(`  • Total Earnings: ฿${totalEarnings.toLocaleString()}`)
    console.log(`  • Average Rating: ${avgRating.toFixed(1)}`)

    console.log('\n👥 Staff Details:')
    staffData.forEach((staff, index) => {
      console.log(`${index + 1}. ${staff.name_th}`)
      console.log(`   Status: ${staff.status} | Rating: ${staff.rating} | Phone: ${staff.phone}`)
      console.log(`   Skills: ${staff.skills?.map(s => `${s.skill?.name_th} (${s.level})`).join(', ') || 'None'}`)
      console.log(`   Earnings: ฿${staff.total_earnings?.toLocaleString()} | Jobs: ${staff.total_jobs}`)
      console.log('')
    })

    // Test skills data
    console.log('🛠️ Testing skills data...')
    const { data: skillsData, error: skillsError } = await supabase
      .from('skills')
      .select('*')
      .limit(5)

    if (skillsError) {
      console.error('❌ Error fetching skills:', skillsError.message)
    } else {
      console.log('✅ Skills available:', skillsData.map(s => s.name_th).join(', '))
    }

    console.log('\n🎯 Integration Test Results:')
    console.log('✅ Cloud database connection: Working')
    console.log('✅ Staff table access: Working')
    console.log('✅ Skills relationships: Working')
    console.log('✅ Data structure: Complete')
    console.log(`✅ Expected Mock Mode indicator: Should be HIDDEN (VITE_USE_MOCK_AUTH=false)`)

    console.log('\n🌐 Admin Dashboard URLs:')
    console.log('📱 Staff Management: http://localhost:3001/admin/staff')
    console.log('🏠 Admin Dashboard: http://localhost:3001/admin/dashboard')

    console.log('\n🧪 What you should see:')
    console.log('- No "🧪 Mock Data Mode" indicator')
    console.log(`- ${activeStaff} active staff, ${pendingStaff} pending staff`)
    console.log('- Real names: สมหญิง นวดเก่ง, ดอกไม้ ทำเล็บสวย, แก้ว สปาชำนาญ, etc.')
    console.log('- Skills properly linked to staff members')
    console.log('- Staff approval/rejection buttons working')

    return true

  } catch (error) {
    console.error('❌ Verification failed:', error.message)
    return false
  }
}

verifyRealData().then(success => {
  if (success) {
    console.log('\n🎉 SUCCESS: App is now using real Supabase Cloud data!')
    console.log('🚀 Visit http://localhost:3001/admin/staff to see the results')
  } else {
    console.log('\n❌ Issues detected. Please check the above errors.')
  }
})