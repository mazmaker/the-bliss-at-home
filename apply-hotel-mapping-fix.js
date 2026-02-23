/**
 * Apply Hotel Mapping Fix
 * เพิ่ม hotel_id column และ fix user mappings
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔧 APPLYING: Hotel Mapping Fix')
console.log('==============================')

async function applyHotelMappingFix() {
  try {
    // Read the migration SQL
    const migrationSQL = fs.readFileSync('./supabase/migrations/20260220150000_add_hotel_id_to_profiles.sql', 'utf8')

    // Split into individual statements (roughly)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'))

    console.log(`Found ${statements.length} SQL statements to execute`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]

      if (statement.includes('SELECT')) {
        // For SELECT statements, we want to see the results
        console.log(`\n📋 Executing verification query...`)
        const { data, error } = await supabase.rpc('execute_sql', {
          sql_query: statement
        })

        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error)
        } else {
          console.log('✅ Verification results:')
          console.table(data)
        }
      } else {
        // For other statements, just execute
        console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}...`)
        console.log(`   ${statement.substring(0, 80)}...`)

        const { error } = await supabase.rpc('execute_sql', {
          sql_query: statement
        })

        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error)
          // Don't stop on errors - some might be expected (column already exists, etc.)
        } else {
          console.log(`✅ Statement ${i + 1} completed successfully`)
        }
      }
    }

    console.log('\n🎉 Migration application completed!')

  } catch (error) {
    console.error('💥 Migration application failed:', error)

    // Fallback: Try applying SQL manually
    console.log('\n🔄 Trying fallback approach...')

    try {
      // 1. Add hotel_id column
      console.log('Adding hotel_id column...')
      const { error: addColumnError } = await supabase.rpc('execute_sql', {
        sql_query: `
          ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES hotels(id);
          CREATE INDEX IF NOT EXISTS idx_profiles_hotel_id ON profiles(hotel_id);
        `
      })

      if (addColumnError) {
        console.log('⚠️ Column might already exist:', addColumnError.message)
      } else {
        console.log('✅ hotel_id column added')
      }

      // 2. Manual user mapping
      console.log('\n🔗 Mapping users to hotels...')

      const mappings = [
        { email: 'info@dusit.com', hotel_id: '550e8400-e29b-41d4-a716-446655440003', hotel_name: 'Dusit Thani' },
        { email: 'reservations@hilton.com', hotel_id: '550e8400-e29b-41d4-a716-446655440001', hotel_name: 'Hilton Bangkok' },
        { email: 'sweettuay.bt@gmail.com', hotel_id: '550e8400-e29b-41d4-a716-446655440002', hotel_name: 'Nimman Resort' },
        { email: 'isweettuay.bt@gmail.com', hotel_id: '550e8400-e29b-41d4-a716-446655440002', hotel_name: 'Nimman Resort' },
        { email: 'test-hotel@thebliss.com', hotel_id: '3082d55a-b185-49b9-b4fc-01c00d61e7e1', hotel_name: 'Test Hotel Bangkok' },
        { email: 'ireservations@hilton.com', hotel_id: '550e8400-e29b-41d4-a716-446655440001', hotel_name: 'Hilton Bangkok' }
      ]

      for (const mapping of mappings) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ hotel_id: mapping.hotel_id })
          .eq('email', mapping.email)
          .eq('role', 'HOTEL')

        if (updateError) {
          console.error(`❌ Failed to map ${mapping.email}:`, updateError)
        } else {
          console.log(`✅ Mapped ${mapping.email} → ${mapping.hotel_name}`)
        }
      }

      // 3. Verify mappings
      console.log('\n📊 Verification - Hotel User Mappings:')
      const { data: mappedUsers, error: verifyError } = await supabase
        .from('profiles')
        .select(`
          email,
          role,
          hotel_id,
          hotels:hotel_id(name_th, hotel_slug)
        `)
        .eq('role', 'HOTEL')
        .order('email')

      if (verifyError) {
        console.error('❌ Verification failed:', verifyError)
      } else {
        console.log('\nCurrent mappings:')
        mappedUsers.forEach((user, index) => {
          const hotelName = user.hotels?.name_th || 'No hotel mapped'
          const hotelSlug = user.hotels?.hotel_slug || 'N/A'
          console.log(`${index + 1}. ${user.email} → ${hotelName} (${hotelSlug})`)
        })
      }

      console.log('\n✅ Fallback application completed!')

    } catch (fallbackError) {
      console.error('💥 Fallback also failed:', fallbackError)
    }
  }
}

applyHotelMappingFix()