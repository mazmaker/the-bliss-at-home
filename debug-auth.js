/**
 * 🔍 Debug Authentication Token Issue
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const userId = 'a127cc5a-e886-4c0c-86a1-e50b56c31fd0' // From console logs

console.log('🔍 Checking user authentication...')

async function debugAuth() {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, role, hotel_id, hotels:hotel_id(name_th)')
    .eq('id', userId)
    .single()

  if (error) {
    console.log('❌ Profile error:', error.message)
    return
  }

  console.log('📋 User:', profile.email)
  console.log('📋 Role:', profile.role)
  console.log('📋 Hotel ID:', profile.hotel_id || 'NULL')
  console.log('📋 Hotel:', profile.hotels?.name_th || 'NOT MAPPED')

  if (!profile.hotel_id) {
    console.log('❌ PROBLEM: User has no hotel_id')
    console.log('💡 Solution: User needs to be mapped to hotel')
  } else {
    console.log('✅ User has hotel_id - auth should work')
  }
}

debugAuth()