// Clean up jobs for unpaid bookings
require('dotenv').config({ path: '../apps/server/.env' });

const { createClient } = require('@supabase/supabase-js');

async function cleanupUnpaidJobs() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🧹 Cleaning up jobs for unpaid bookings...');

  // 1. First, identify the problematic jobs
  const { data: problematicJobs, error: queryError } = await supabase
    .from('jobs')
    .select(`
      id,
      booking_id,
      bookings!inner(
        booking_number,
        payment_status,
        status,
        is_hotel_booking,
        created_at
      )
    `)
    .eq('bookings.payment_status', 'pending')
    .eq('bookings.is_hotel_booking', false)
    .gte('bookings.created_at', '2026-06-08');

  if (queryError) {
    console.error('❌ Query error:', queryError.message);
    return;
  }

  console.log(`📋 Found ${problematicJobs?.length || 0} jobs for unpaid bookings:`);

  if (problematicJobs && problematicJobs.length > 0) {
    problematicJobs.forEach(job => {
      console.log(`  - Job ${job.id} → Booking ${job.bookings.booking_number} (${job.bookings.payment_status})`);
    });

    // 2. Delete the problematic jobs
    const jobIds = problematicJobs.map(j => j.id);
    const { error: deleteError } = await supabase
      .from('jobs')
      .delete()
      .in('id', jobIds);

    if (deleteError) {
      console.error('❌ Delete error:', deleteError.message);
      return;
    }

    console.log(`✅ Deleted ${jobIds.length} jobs for unpaid bookings`);
  } else {
    console.log('✅ No problematic jobs found');
  }

  // 3. Specifically handle booking BK20260608-0354
  console.log('\n🎯 Handling specific booking BK20260608-0354...');

  const { error: specificDeleteError } = await supabase
    .from('jobs')
    .delete()
    .eq('booking_id', '08aa568c-d96a-4e98-a4f6-23c4d7b5ff15');

  if (specificDeleteError) {
    console.error('❌ Error deleting job for BK20260608-0354:', specificDeleteError.message);
  } else {
    console.log('✅ Deleted job for BK20260608-0354');
  }

  console.log('\n🎉 Cleanup completed!');
  console.log('👉 Now jobs exist only for confirmed/paid bookings');
}

cleanupUnpaidJobs().catch(console.error);