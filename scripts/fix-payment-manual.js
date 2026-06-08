// Quick script to fix payment method for booking BK20260608-0354
require('dotenv').config({ path: '../apps/server/.env' });

const { createClient } = require('@supabase/supabase-js');

async function fixPaymentMethod() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🔧 Fixing payment method for BK20260608-0354...');

  // Update payment method
  const { data, error } = await supabase
    .from('bookings')
    .update({
      payment_method: 'credit_card',
      payment_method_recorded: 'credit_card',
      updated_at: new Date().toISOString()
    })
    .eq('booking_number', 'BK20260608-0354')
    .select();

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log('✅ Payment method updated:', data);

  // Verify
  const { data: booking } = await supabase
    .from('bookings')
    .select('booking_number, payment_method, payment_method_recorded, payment_status, status')
    .eq('booking_number', 'BK20260608-0354')
    .single();

  console.log('📋 Current booking state:', booking);
}

fixPaymentMethod().catch(console.error);