/**
 * Fix Test User Role to HOTEL
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function fixUserRole() {
  console.log('🔧 Fixing Test User Role...')

  const testUserId = '23781861-9b8f-4039-bda0-e5b20f968a98'

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        role: 'HOTEL',
        full_name: 'Test Hotel User'
      })
      .eq('id', testUserId)
      .select()

    if (error) {
      console.error('❌ Update failed:', error)
      return
    }

    console.log('✅ User role updated to HOTEL!')
    console.log('   Updated profile:', data[0])

  } catch (error) {
    console.error('💥 Error:', error.message)
  }
}

fixUserRole()