// Apply database trigger fix - Version 2
require('dotenv').config({ path: '../apps/server/.env' });

const { createClient } = require('@supabase/supabase-js');

async function applyTriggerFix() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🔧 Applying database trigger fix...');
  console.log('📋 This will change job creation to wait for payment confirmation');

  try {
    // Method 1: Try to query existing triggers first
    console.log('\n🔍 Checking existing triggers...');
    const { data: triggers, error: triggerQuery } = await supabase
      .from('information_schema.triggers')
      .select('*')
      .eq('trigger_name', 'create_job_from_booking');

    console.log('📋 Existing triggers:', triggers?.length || 0);

    // Method 2: Try using a simplified approach - manual SQL execution
    console.log('\n⚠️ Note: Direct SQL execution may require manual database access');
    console.log('📋 SQL Commands to run manually:');

    console.log(`
--- Step 1: Drop existing trigger ---
DROP TRIGGER IF EXISTS create_job_from_booking ON bookings;

--- Step 2: Create new trigger ---
CREATE TRIGGER create_job_from_confirmed_booking
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (
    OLD.payment_status != 'paid' AND NEW.payment_status = 'paid'
    AND NEW.status = 'confirmed'
    AND NEW.is_hotel_booking != true
    AND NEW.customer_id IS NOT NULL
  )
  EXECUTE FUNCTION sync_booking_to_job();
    `);

    console.log('\n📋 Copy the SQL above and run it in:');
    console.log('  1. Supabase Dashboard → SQL Editor');
    console.log('  2. Or any PostgreSQL client connected to your database');

    console.log('\n✅ This will enforce: "ถ้าตัดไม่ผ่านไม่ให้ส่งงานให้สตาฟ"');

  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

applyTriggerFix().catch(console.error);