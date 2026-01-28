// Check all staff members including pending ones
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkAllStaff() {
  try {
    console.log('🔍 Checking all staff members with service role...')

    const { data: allStaff, error } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error:', error.message)
      return
    }

    console.log('📊 Total staff in database:', allStaff.length)
    console.log('')

    allStaff.forEach((staff, index) => {
      console.log(`${index + 1}. ${staff.name_th}`)
      console.log(`   Status: ${staff.status}`)
      console.log(`   Phone: ${staff.phone}`)
      console.log(`   Rating: ${staff.rating}`)
      console.log(`   Created: ${new Date(staff.created_at).toLocaleString()}`)
      console.log('')
    })

    // Check status breakdown
    const statusBreakdown = {}
    allStaff.forEach(staff => {
      statusBreakdown[staff.status] = (statusBreakdown[staff.status] || 0) + 1
    })

    console.log('📈 Status Breakdown:')
    Object.keys(statusBreakdown).forEach(status => {
      console.log(`  ${status}: ${statusBreakdown[status]}`)
    })

    // Test anon access to see if RLS is filtering
    console.log('\n🔍 Testing with anon key (what the app sees)...')

    const anonSupabase = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc')

    const { data: anonStaff, error: anonError } = await anonSupabase
      .from('staff')
      .select('*')

    if (anonError) {
      console.error('❌ Anon access error:', anonError.message)
    } else {
      console.log('✅ Anon can see:', anonStaff.length, 'staff members')
      console.log('Names:', anonStaff.map(s => s.name_th).join(', '))
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message)
  }
}

checkAllStaff()