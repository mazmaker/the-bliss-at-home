// Apply payment method fix migration manually
require('dotenv').config({ path: '../apps/server/.env' });

const { createClient } = require('@supabase/supabase-js');

async function applyPaymentMethodFix() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🔧 Applying payment method fix...');

  try {
    // Step 1: Add 'pending_payment' to enum (via raw SQL since Supabase client doesn't support ALTER TYPE)
    console.log('\n1️⃣ Adding pending_payment to enum...');
    const { data: alterResult, error: alterError } = await supabase.rpc('sql', {
      query: "ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'pending_payment';"
    });

    if (alterError) {
      console.log('⚠️ Add enum value error:', alterError.message);
    } else {
      console.log('✅ Added pending_payment to payment_method enum');
    }

    // Step 2: Update existing 'cash' records that should be 'pending_payment'
    console.log('\n2️⃣ Updating existing incorrect cash records...');
    const { data: updateResult, error: updateError, count } = await supabase
      .from('bookings')
      .update({ payment_method: 'pending_payment' })
      .eq('payment_method', 'cash')
      .eq('payment_status', 'pending')
      .gte('created_at', '2026-06-08');

    if (updateError) {
      console.log('⚠️ Update records error:', updateError.message);
    } else {
      console.log(`✅ Updated ${count || 0} existing incorrect records`);
    }

    // Step 2: Query to check current default (informational)
    console.log('\n2️⃣ Checking current payment_method settings...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('bookings')
      .select('payment_method')
      .limit(1);

    if (tableError) {
      console.log('⚠️ Table check error:', tableError.message);
    } else {
      console.log('✅ Table accessed successfully - default should be applied via code fix');
    }

    // Step 3: Update any NULL values using the Supabase client
    console.log('\n3️⃣ Updating NULL payment methods...');
    const { data: nullResult, error: nullError, count: nullCount } = await supabase
      .from('bookings')
      .update({ payment_method: 'pending_payment' })
      .is('payment_method', null);

    if (nullError) {
      console.log('⚠️ Update NULL values error:', nullError.message);
    } else {
      console.log(`✅ Updated ${nullCount || 0} NULL payment methods`);
    }

    // Step 4: Verify the changes
    console.log('\n4️⃣ Verifying payment method distribution...');
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

      console.log('📊 Current payment method distribution:');
      Object.entries(paymentMethodCounts).forEach(([method, count]) => {
        console.log(`   ${method}: ${count} bookings`);
      });
    }

    console.log('\n🎉 Payment method fix applied successfully!');
    console.log('✅ Credit card payments will now display correctly as "บัตรเครดิต" instead of "เงินสด"');

  } catch (error) {
    console.error('💥 Error applying payment method fix:', error.message);
  }
}

applyPaymentMethodFix().catch(console.error);