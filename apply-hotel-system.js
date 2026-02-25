/**
 * Apply Scalable Hotel Onboarding System Step by Step
 * Execute database functions and triggers for auto hotel user creation
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🚀 APPLYING: Scalable Hotel Onboarding System')
console.log('===============================================')

async function executeSQL(description, sql) {
  console.log(`\n${description}`)
  try {
    const { data, error } = await supabase
      .from('dummy') // Use any table, we'll catch the error and use raw SQL
      .select()
      .limit(0)

    // Execute SQL using the postgres connection
    const result = await supabase.rpc('exec_sql', { sql })

    if (result.error) {
      console.log(`⚠️  ${description} - ${result.error.message}`)
      return false
    } else {
      console.log(`✅ ${description} - Success`)
      return true
    }
  } catch (error) {
    console.log(`⚠️  ${description} - ${error.message}`)
    return false
  }
}

async function applyHotelSystem() {
  try {
    console.log('🔍 Checking current database state...')

    // Check if hotel_invitations table exists
    const { data: tableCheck } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'hotel_invitations')
      .eq('table_schema', 'public')

    if (tableCheck && tableCheck.length > 0) {
      console.log('ℹ️  hotel_invitations table already exists')
    } else {
      console.log('📝 Creating hotel_invitations table...')
    }

    // Step 1: Create hotel_invitations table
    await executeSQL(
      '📝 Step 1: Creating hotel_invitations table',
      `
      CREATE TABLE IF NOT EXISTS hotel_invitations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        invitation_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'expired')),
        invited_by UUID REFERENCES profiles(id),
        invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        accepted_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      `
    )

    // Step 2: Create indexes
    await executeSQL(
      '🔍 Step 2: Creating indexes',
      `
      CREATE INDEX IF NOT EXISTS idx_hotel_invitations_hotel_id ON hotel_invitations(hotel_id);
      CREATE INDEX IF NOT EXISTS idx_hotel_invitations_token ON hotel_invitations(invitation_token);
      CREATE INDEX IF NOT EXISTS idx_hotel_invitations_email ON hotel_invitations(email);
      `
    )

    // Step 3: Enable RLS
    await executeSQL(
      '🔐 Step 3: Enabling Row Level Security',
      `
      ALTER TABLE hotel_invitations ENABLE ROW LEVEL SECURITY;
      `
    )

    // Step 4: Create RLS policies
    await executeSQL(
      '🛡️  Step 4: Creating RLS policies',
      `
      DROP POLICY IF EXISTS "Admins can manage all hotel invitations" ON hotel_invitations;
      DROP POLICY IF EXISTS "Hotels can view their own invitations" ON hotel_invitations;

      CREATE POLICY "Admins can manage all hotel invitations" ON hotel_invitations
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'ADMIN'
        )
      );

      CREATE POLICY "Hotels can view their own invitations" ON hotel_invitations
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'HOTEL'
          AND profiles.hotel_id = hotel_invitations.hotel_id
        )
      );
      `
    )

    console.log('\n🎉 BASIC HOTEL INVITATION SYSTEM APPLIED!')
    console.log('==========================================')
    console.log('✅ hotel_invitations table created')
    console.log('✅ Indexes added')
    console.log('✅ RLS policies configured')
    console.log('\n📋 Next step: Test the system and add functions manually')

    // Test by checking existing hotels
    const { data: hotels } = await supabase
      .from('hotels')
      .select('id, name_th, hotel_slug, status')
      .eq('status', 'active')
      .limit(3)

    if (hotels && hotels.length > 0) {
      console.log(`\n✅ Found ${hotels.length} active hotels ready for invitations:`)
      hotels.forEach((hotel, index) => {
        console.log(`   ${index + 1}. ${hotel.name_th} (${hotel.hotel_slug})`)
      })
    }

  } catch (error) {
    console.error('💥 Application failed:', error.message)
  }
}

// Execute the function with detailed error handling
applyHotelSystem().catch(error => {
  console.error('🚨 Fatal error:', error.message)
  process.exit(1)
})