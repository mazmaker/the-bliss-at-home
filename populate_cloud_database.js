// Script to populate Supabase Cloud database with admin user and staff data
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function populateCloudDatabase() {
  try {
    console.log('🚀 Populating Supabase Cloud database...')

    // Step 1: Create or update admin user
    console.log('\n👤 Creating admin user...')

    // Check if admin user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingAdmin = existingUsers.users.find(u => u.email === 'admin@theblissathome.com')

    let adminUserId

    if (existingAdmin) {
      console.log('ℹ️ Admin user already exists:', existingAdmin.email)
      adminUserId = existingAdmin.id
    } else {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'admin@theblissathome.com',
        password: 'admin123',
        email_confirm: true,
        user_metadata: {
          full_name: 'ผู้ดูแลระบบ'
        }
      })

      if (createError) {
        console.error('❌ Error creating admin user:', createError.message)
        return false
      }

      adminUserId = newUser.user.id
      console.log('✅ Admin user created:', newUser.user.email)
    }

    // Update/create admin profile
    console.log('📝 Setting up admin profile...')
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: adminUserId,
        email: 'admin@theblissathome.com',
        role: 'ADMIN',
        full_name: 'ผู้ดูแลระบบ',
        phone: '0812345678',
        status: 'ACTIVE'
      }, { onConflict: 'id' })

    if (profileError) {
      console.log('⚠️ Profile update info:', profileError.message)
    } else {
      console.log('✅ Admin profile updated')
    }

    // Step 2: Get skills for staff relationships
    console.log('\n🔍 Getting skills data...')
    const { data: skills, error: skillsError } = await supabase
      .from('skills')
      .select('*')

    if (skillsError) {
      console.error('❌ Error getting skills:', skillsError.message)
      return false
    }

    const massageSkill = skills.find(s => s.name_en === 'Thai Massage')
    const nailSkill = skills.find(s => s.name_en === 'Gel Manicure')
    const spaSkill = skills.find(s => s.name_en === 'Thai Spa')

    console.log('✅ Found skills:', skills.length)

    // Step 3: Insert sample staff data
    console.log('\n👥 Adding sample staff data...')

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

    // Clear existing staff data first
    await supabase.from('staff_skills').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('staff').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    const { data: insertedStaff, error: staffError } = await supabase
      .from('staff')
      .insert(staffData)
      .select()

    if (staffError) {
      console.error('❌ Error inserting staff:', staffError.message)
      return false
    }

    console.log('✅ Inserted', insertedStaff.length, 'staff members')

    // Step 4: Add staff skills relationships
    console.log('\n🔗 Adding staff skills relationships...')

    const skillsRelations = []

    // Map staff to skills
    if (insertedStaff[0] && massageSkill) { // สมหญิง -> Thai Massage
      skillsRelations.push({
        staff_id: insertedStaff[0].id,
        skill_id: massageSkill.id,
        level: 'expert',
        years_experience: 5
      })
    }

    if (insertedStaff[1] && nailSkill) { // ดอกไม้ -> Gel Manicure
      skillsRelations.push({
        staff_id: insertedStaff[1].id,
        skill_id: nailSkill.id,
        level: 'advanced',
        years_experience: 3
      })
    }

    if (insertedStaff[2] && spaSkill) { // แก้ว -> Thai Spa
      skillsRelations.push({
        staff_id: insertedStaff[2].id,
        skill_id: spaSkill.id,
        level: 'expert',
        years_experience: 7
      })
    }

    if (insertedStaff[2] && massageSkill) { // แก้ว -> Thai Massage (secondary skill)
      skillsRelations.push({
        staff_id: insertedStaff[2].id,
        skill_id: massageSkill.id,
        level: 'intermediate',
        years_experience: 4
      })
    }

    if (insertedStaff[3] && nailSkill) { // มานี -> Gel Manicure
      skillsRelations.push({
        staff_id: insertedStaff[3].id,
        skill_id: nailSkill.id,
        level: 'intermediate',
        years_experience: 2
      })
    }

    if (insertedStaff[4] && massageSkill) { // สมชาย -> Thai Massage
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
        console.log('✅ Added', skillsRelations.length, 'staff-skill relationships')
      }
    }

    // Final verification
    console.log('\n🔍 Verifying data...')
    const { data: finalStaff, error: verifyError } = await supabase
      .from('staff')
      .select(`
        *,
        skills:staff_skills(
          id,
          skill_id,
          level,
          years_experience,
          skill:skills(name_th, name_en)
        )
      `)

    if (verifyError) {
      console.error('❌ Verification error:', verifyError.message)
    } else {
      console.log('✅ Final verification successful!')
      console.log('📊 Staff Summary:')
      finalStaff.forEach(staff => {
        console.log(`  • ${staff.name_th} (${staff.status}) - ${staff.skills?.length || 0} skills`)
      })
    }

    console.log('\n🎉 Database population completed!')
    console.log('👤 Admin: admin@theblissathome.com / admin123')
    console.log('📊 Staff: 5 members (3 active, 2 pending)')
    console.log('🔗 Skills: Connected to appropriate specializations')

    return true

  } catch (error) {
    console.error('❌ Population failed:', error.message)
    return false
  }
}

populateCloudDatabase().then(success => {
  if (success) {
    console.log('\n✅ Ready to switch to real database mode!')
  } else {
    console.log('\n❌ Please resolve issues before switching modes')
  }
})