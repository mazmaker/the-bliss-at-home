import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
// You need to use service role key for admin operations
const serviceRoleKey = 'YOUR_SERVICE_ROLE_KEY_HERE' // Get from Supabase Dashboard > Settings > API

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function createTestUsers() {
  console.log('Creating test users via Supabase Management API...')

  // This won't work with anon key - need to use Supabase Dashboard instead
  console.log('Please use Supabase Dashboard to create users:')
  console.log('1. Go to: https://supabase.com/dashboard/project/rbdvlfriqjnwpxmmgisf/auth/users')
  console.log('2. Click "Add user" for each test account')
  console.log('')
  console.log('Test Accounts:')
  console.log('┌────────────┬──────────────────┬──────────────┬─────────────────┐')
  console.log('│ Role       │ Email           │ Password     │ Full Name       │')
  console.log('├────────────┼──────────────────┼──────────────┼─────────────────┤')
  console.log('│ ADMIN      │ admin@bliss.test │ Admin123!    │ Admin User      │')
  console.log('│ CUSTOMER   │ customer@bliss.. │ Customer123! │ Customer User   │')
  console.log('│ HOTEL      │ hotel@bliss.test │ Hotel123!    │ Hotel Manager   │')
  console.log('│ STAFF      │ staff@bliss.test │ Staff123!    │ Staff User      │')
  console.log('└────────────┴──────────────────┴──────────────┴─────────────────┘')
  console.log('')
  console.log('After creating users, run this SQL in SQL Editor:')
  console.log(`
UPDATE profiles SET role = 'ADMIN', status = 'ACTIVE', full_name = 'Admin User', phone = '+66812345678', language = 'th' WHERE email = 'admin@bliss.test';
UPDATE profiles SET role = 'CUSTOMER', status = 'ACTIVE', full_name = 'Customer User', phone = '+66823456789', language = 'th' WHERE email = 'customer@bliss.test';
UPDATE profiles SET role = 'HOTEL', status = 'ACTIVE', full_name = 'Hotel Manager', phone = '+66834567890', language = 'th' WHERE email = 'hotel@bliss.test';
UPDATE profiles SET role = 'STAFF', status = 'ACTIVE', full_name = 'Staff User', phone = '+66845678901', language = 'th' WHERE email = 'staff@bliss.test';

-- Verify
SELECT email, full_name, role, status FROM profiles WHERE email LIKE '%@bliss.test' ORDER BY role;
  `)
}

createTestUsers()
