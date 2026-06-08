// Fix existing payment method display issue
require('dotenv').config({ path: '../apps/server/.env' });

const { createClient } = require('@supabase/supabase-js');

async function fixExistingPaymentMethods() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🔧 Fixing existing payment method display issue...');
  console.log('📋 This will change cash+pending bookings to show "รอการชำระเงิน" instead of "เงินสด"');

  try {
    // Update existing 'cash' records with 'pending' status to 'other'
    // This prevents them from showing as cash when they're actually waiting for payment
    console.log('\n1️⃣ Updating cash+pending records to fix display...');
    const { data: updateResult, error: updateError, count } = await supabase
      .from('bookings')
      .update({ payment_method: 'other' })
      .eq('payment_method', 'cash')
      .eq('payment_status', 'pending');

    if (updateError) {
      console.log('❌ Update error:', updateError.message);
      return;
    }

    console.log(`✅ Updated ${count || 0} bookings from cash+pending to other+pending`);
    console.log('   These will now show "รอการชำระเงิน" instead of "เงินสด"');

    // Verify the changes
    console.log('\n2️⃣ Verifying payment method distribution after fix...');
    const { data: stats, error: statsError } = await supabase
      .from('bookings')
      .select('payment_method, payment_status')
      .not('payment_method', 'is', null);

    if (statsError) {
      console.log('⚠️ Stats error:', statsError.message);
    } else {
      const paymentMethodCounts = stats.reduce((acc, booking) => {
        const key = `${booking.payment_method} (${booking.payment_status})`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      console.log('\n📊 Updated payment method distribution:');
      Object.entries(paymentMethodCounts).forEach(([method, count]) => {
        console.log(`   ${method}: ${count} bookings`);
      });
    }

    console.log('\n🎉 Payment method display fix completed!');
    console.log('✅ Pending bookings now show "รอการชำระเงิน" instead of "เงินสด"');
    console.log('✅ New bookings will be created with payment_method: "other" initially');
    console.log('✅ Payment processing will update to correct method (credit_card, promptpay, etc.)');

  } catch (error) {
    console.error('💥 Error fixing payment methods:', error.message);
  }
}

fixExistingPaymentMethods().catch(console.error);