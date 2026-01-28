// Script to verify basic staff data without complex joins
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifySimpleData() {
  try {
    console.log('🔍 Testing basic staff data (no joins)...')

    // Test basic staff query
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')

    if (staffError) {
      console.error('❌ Basic staff query error:', staffError.message)
      return false
    }

    console.log('✅ Basic staff data:', staffData.length, 'records')
    staffData.forEach((staff, index) => {
      console.log(`${index + 1}. ${staff.name_th} (${staff.status}) - ${staff.phone}`)
    })

    // Test skills
    const { data: skillsData, error: skillsError } = await supabase
      .from('skills')
      .select('*')
      .limit(3)

    if (skillsError) {
      console.error('❌ Skills query error:', skillsError.message)
    } else {
      console.log('\n🛠️ Sample skills:', skillsData.map(s => s.name_th).join(', '))
    }

    // Test staff_skills junction table
    const { data: staffSkillsData, error: staffSkillsError } = await supabase
      .from('staff_skills')
      .select('*')

    if (staffSkillsError) {
      console.error('❌ Staff skills query error:', staffSkillsError.message)
    } else {
      console.log('\n🔗 Staff-skills relationships:', staffSkillsData.length, 'records')
    }

    // Test with simpler join - staff with skills only
    console.log('\n🔗 Testing staff with skills (no profiles)...')
    const { data: staffWithSkills, error: skillsJoinError } = await supabase
      .from('staff')
      .select(`
        name_th,
        status,
        phone,
        rating,
        skills:staff_skills(
          level,
          years_experience,
          skill:skills(name_th, name_en)
        )
      `)

    if (skillsJoinError) {
      console.error('❌ Staff-skills join error:', skillsJoinError.message)
    } else {
      console.log('✅ Staff with skills join successful!')
      staffWithSkills.forEach((staff, index) => {
        console.log(`${index + 1}. ${staff.name_th} (${staff.status})`)
        staff.skills?.forEach(skill => {
          console.log(`   - ${skill.skill?.name_th} (${skill.level})`)
        })
      })
    }

    return true

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

verifySimpleData().then(success => {
  if (success) {
    console.log('\n✅ Basic data is working!')
    console.log('💡 Issue seems to be with the profiles relationship')
    console.log('📱 The staff management should work if we fix the profiles join')
  }
})