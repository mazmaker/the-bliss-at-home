// Check booking, transaction, and job status for BK20260608-0354
require('dotenv').config({ path: '../apps/server/.env' });

const { createClient } = require('@supabase/supabase-js');

async function checkBookingStatus() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const bookingId = '08aa568c-d96a-4e98-a4f6-23c4d7b5ff15';

  console.log('📋 Checking booking status for:', bookingId);
  console.log('='.repeat(50));

  // 1. Check booking details
  const { data: booking } = await supabase
    .from('bookings')
    .select('booking_number, payment_method, payment_status, status, created_at')
    .eq('id', bookingId)
    .single();

  console.log('📄 Booking:', booking);

  // 2. Check transaction records
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('booking_id', bookingId);

  console.log(`💳 Transactions (${transactions?.length || 0}):`, transactions);

  // 3. Check job records
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, status, staff_id, created_at')
    .eq('booking_id', bookingId);

  console.log(`👥 Jobs (${jobs?.length || 0}):`, jobs);

  // 4. Check notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select('type, title, sent_to_role, created_at')
    .eq('booking_id', bookingId);

  console.log(`🔔 Notifications (${notifications?.length || 0}):`, notifications);
}

checkBookingStatus().catch(console.error);