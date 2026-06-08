// Apply database trigger fix
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
    // Step 1: Drop existing trigger
    console.log('\n1️⃣ Dropping old trigger...');
    const { error: dropError } = await supabase
      .rpc('exec', {
        query: 'DROP TRIGGER IF EXISTS create_job_from_booking ON bookings;'
      });

    if (dropError) {
      console.log('⚠️ Drop trigger result:', dropError.message);
    } else {
      console.log('✅ Old trigger dropped');
    }

    // Step 2: Create new trigger
    console.log('\n2️⃣ Creating new payment-based trigger...');
    const newTrigger = `
CREATE TRIGGER create_job_from_confirmed_booking
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (
    -- Only create job when payment is confirmed
    OLD.payment_status != 'paid' AND NEW.payment_status = 'paid'
    AND NEW.status = 'confirmed'
    -- Skip hotel bookings (they handle jobs separately)
    AND NEW.is_hotel_booking != true
    -- Ensure we have customer_id
    AND NEW.customer_id IS NOT NULL
  )
  EXECUTE FUNCTION sync_booking_to_job();`;

    const { error: createError } = await supabase
      .rpc('exec', { query: newTrigger });

    if (createError) {
      console.log('❌ Create trigger error:', createError.message);
      return;
    } else {
      console.log('✅ New payment-based trigger created');
    }

    console.log('\n🎉 Database trigger fix applied successfully!');
    console.log('📋 Jobs will now only be created AFTER payment confirmation');
    console.log('✅ Requirement enforced: "ถ้าตัดไม่ผ่านไม่ให้ส่งงานให้สตาฟ"');

  } catch (error) {
    console.error('💥 Error applying trigger fix:', error.message);
  }
}

applyTriggerFix().catch(console.error);