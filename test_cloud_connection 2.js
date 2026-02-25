// Script to test Supabase Cloud database connection and verify tables
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testCloudConnection() {
  try {
    console.log('🔍 Testing Supabase Cloud connection...')
    console.log('URL:', supabaseUrl)

    // Test 1: Check staff table exists and structure
    console.log('\n📋 Checking staff table...')
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .limit(1)

    if (staffError) {
      console.log('❌ Staff table error:', staffError.message)
    } else {
      console.log('✅ Staff table exists')
      console.log('Current staff count:', staffData?.length || 0)
    }

    // Test 2: Check profiles table
    console.log('\n👤 Checking profiles table...')
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)

    if (profileError) {
      console.log('❌ Profiles table error:', profileError.message)
    } else {
      console.log('✅ Profiles table exists')
      console.log('Current profiles count:', profileData?.length || 0)
    }

    // Test 3: Check skills table
    console.log('\n🛠️ Checking skills table...')
    const { data: skillsData, error: skillsError } = await supabase
      .from('skills')
      .select('*')
      .limit(5)

    if (skillsError) {
      console.log('❌ Skills table error:', skillsError.message)
    } else {
      console.log('✅ Skills table exists')
      console.log('Sample skills:', skillsData?.map(s => `${s.name_th} (${s.name_en})`).join(', ') || 'None')
    }

    // Test 4: Check staff_skills table
    console.log('\n🔗 Checking staff_skills table...')
    const { data: staffSkillsData, error: staffSkillsError } = await supabase
      .from('staff_skills')
      .select('*')
      .limit(1)

    if (staffSkillsError) {
      console.log('❌ Staff_skills table error:', staffSkillsError.message)
    } else {
      console.log('✅ Staff_skills table exists')
      console.log('Current staff_skills count:', staffSkillsData?.length || 0)
    }

    // Summary
    console.log('\n📊 Database Status Summary:')
    console.log('- Connection:', supabaseUrl ? '✅' : '❌')
    console.log('- Staff table:', staffError ? '❌' : '✅')
    console.log('- Profiles table:', profileError ? '❌' : '✅')
    console.log('- Skills table:', skillsError ? '❌' : '✅')
    console.log('- Staff_skills table:', staffSkillsError ? '❌' : '✅')

    return {
      success: !staffError && !profileError && !skillsError && !staffSkillsError,
      skillsCount: skillsData?.length || 0,
      staffCount: staffData?.length || 0,
      profilesCount: profileData?.length || 0
    }

  } catch (error) {
    console.error('❌ Connection test failed:', error.message)
    return { success: false, error: error.message }
  }
}

testCloudConnection().then(result => {
  if (result.success) {
    console.log('\n🎉 Cloud database is ready!')
  } else {
    console.log('\n🚫 Cloud database has issues that need to be resolved')
  }
})