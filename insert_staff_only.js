// Script to insert only staff data (without admin user creation)
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function insertStaffData() {
  try {
    console.log('👥 Inserting staff data into cloud database...')

    // Get skills for relationships
    const { data: skills, error: skillsError } = await supabase
      .from('skills')
      .select('*')

    if (skillsError) {
      console.error('❌ Error getting skills:', skillsError.message)
      return false
    }

    console.log('✅ Found skills:', skills.map(s => s.name_en).join(', '))

    // Staff data to insert
    const staffData = [
      {
        name_th: 'สมหญิง นวดเก่ง',
        phone: '081-234-5678',
        status: 'active',
        rating: 4.8,
        total_reviews: 156,
        total_jobs: 1250,
        total_earnings: 450000,
        is_available: true
      },
      {
        name_th: 'ดอกไม้ ทำเล็บสวย',
        phone: '082-345-6789',
        status: 'active',
        rating: 4.9,
        total_reviews: 203,
        total_jobs: 890,
        total_earnings: 320000,
        is_available: true
      },
      {
        name_th: 'แก้ว สปาชำนาญ',
        phone: '083-456-7890',
        status: 'active',
        rating: 4.7,
        total_reviews: 89,
        total_jobs: 670,
        total_earnings: 520000,
        is_available: true
      },
      {
        name_th: 'มานี รอดำเนินการ',
        phone: '084-567-8901',
        status: 'pending',
        rating: 0,
        total_reviews: 0,
        total_jobs: 0,
        total_earnings: 0,
        is_available: false
      },
      {
        name_th: 'สมชาย มือใหม่',
        phone: '085-678-9012',
        status: 'pending',
        rating: 0,
        total_reviews: 0,
        total_jobs: 0,
        total_earnings: 0,
        is_available: false
      }
    ]

    // Clear existing data first
    console.log('🧹 Clearing existing staff data...')
    await supabase.from('staff_skills').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('staff').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Insert staff
    console.log('📝 Inserting staff records...')
    const { data: insertedStaff, error: staffError } = await supabase
      .from('staff')
      .insert(staffData)
      .select()

    if (staffError) {
      console.error('❌ Error inserting staff:', staffError.message)
      return false
    }

    console.log('✅ Inserted', insertedStaff.length, 'staff members')

    // Add staff skills relationships
    console.log('🔗 Adding staff skills...')

    const massageSkill = skills.find(s => s.name_en === 'Thai Massage')
    const nailSkill = skills.find(s => s.name_en === 'Gel Manicure')
    const spaSkill = skills.find(s => s.name_en === 'Thai Spa')

    const skillsRelations = []

    // สมหญิง -> Thai Massage (expert)
    if (insertedStaff[0] && massageSkill) {
      skillsRelations.push({
        staff_id: insertedStaff[0].id,
        skill_id: massageSkill.id,
        level: 'expert',
        years_experience: 5
      })
    }

    // ดอกไม้ -> Gel Manicure (advanced)
    if (insertedStaff[1] && nailSkill) {
      skillsRelations.push({
        staff_id: insertedStaff[1].id,
        skill_id: nailSkill.id,
        level: 'advanced',
        years_experience: 3
      })
    }

    // แก้ว -> Thai Spa (expert) + Thai Massage (intermediate)
    if (insertedStaff[2] && spaSkill) {
      skillsRelations.push({
        staff_id: insertedStaff[2].id,
        skill_id: spaSkill.id,
        level: 'expert',
        years_experience: 7
      })
    }
    if (insertedStaff[2] && massageSkill) {
      skillsRelations.push({
        staff_id: insertedStaff[2].id,
        skill_id: massageSkill.id,
        level: 'intermediate',
        years_experience: 4
      })
    }

    // มานี -> Gel Manicure (intermediate)
    if (insertedStaff[3] && nailSkill) {
      skillsRelations.push({
        staff_id: insertedStaff[3].id,
        skill_id: nailSkill.id,
        level: 'intermediate',
        years_experience: 2
      })
    }

    // สมชาย -> Thai Massage (beginner)
    if (insertedStaff[4] && massageSkill) {
      skillsRelations.push({
        staff_id: insertedStaff[4].id,
        skill_id: massageSkill.id,
        level: 'beginner',
        years_experience: 1
      })
    }

    if (skillsRelations.length > 0) {
      const { error: skillsRelError } = await supabase
        .from('staff_skills')
        .insert(skillsRelations)

      if (skillsRelError) {
        console.error('❌ Error inserting staff skills:', skillsRelError.message)
      } else {
        console.log('✅ Added', skillsRelations.length, 'skill relationships')
      }
    }

    // Verify the data
    console.log('\n🔍 Verifying inserted data...')
    const { data: verifyStaff, error: verifyError } = await supabase
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

    if (verifyError) {
      console.error('❌ Verification error:', verifyError.message)
    } else {
      console.log('✅ Data verification successful!')
      console.log('\n📊 Staff Summary:')
      verifyStaff.forEach((staff, index) => {
        console.log(`${index + 1}. ${staff.name_th} (${staff.status})`)
        staff.skills?.forEach(skill => {
          console.log(`   - ${skill.skill.name_th} (${skill.level})`)
        })
      })
    }

    console.log('\n🎉 Staff data insertion completed!')
    console.log('📊 Total: 5 staff members (3 active, 2 pending)')

    return true

  } catch (error) {
    console.error('❌ Staff insertion failed:', error.message)
    return false
  }
}

insertStaffData().then(success => {
  if (success) {
    console.log('\n✅ Staff data ready! You can now switch to real database mode.')
    console.log('ℹ️ Note: Admin user setup can be done manually through Supabase dashboard if needed.')
  }
})