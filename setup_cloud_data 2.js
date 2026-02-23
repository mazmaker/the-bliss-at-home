// Script to set up admin user and sample data in Supabase Cloud
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupCloudData() {
  try {
    console.log('🚀 Setting up Supabase Cloud data...')

    // 1. Create admin user
    console.log('📝 Creating admin user...')
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email: 'admin@theblissathome.com',
      password: 'admin123',
      email_confirm: true,
      user_metadata: {
        full_name: 'ผู้ดูแลระบบ',
        role: 'ADMIN'
      }
    })

    if (createError && createError.message !== 'A user with this email address has already been registered') {
      console.error('❌ Error creating admin user:', createError.message)
      return
    }

    const userId = user?.user?.id || (await supabase.auth.admin.listUsers()).data.users?.find(u => u.email === 'admin@theblissathome.com')?.id

    if (userId) {
      // 2. Update profile
      console.log('👤 Updating admin profile...')
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: 'admin@theblissathome.com',
          role: 'ADMIN',
          full_name: 'ผู้ดูแลระบบ',
          phone: '0812345678',
          status: 'ACTIVE'
        }, { onConflict: 'id' })

      if (profileError) {
        console.log('ℹ️ Profile update info:', profileError.message)
      }
    }

    // 3. Add sample staff data
    console.log('👥 Adding sample staff...')
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

    const { data: staffInsert, error: staffError } = await supabase
      .from('staff')
      .upsert(staffData, { onConflict: 'phone' })

    if (staffError) {
      console.log('ℹ️ Staff data info:', staffError.message)
    } else {
      console.log('✅ Added', staffInsert?.length || staffData.length, 'staff members')
    }

    console.log('🎉 Setup completed!')
    console.log('📧 Admin Email: admin@theblissathome.com')
    console.log('🔐 Admin Password: admin123')
    console.log('🌐 Admin URL: http://localhost:3001/admin/staff')

  } catch (error) {
    console.error('❌ Setup error:', error.message)
  }
}

setupCloudData()