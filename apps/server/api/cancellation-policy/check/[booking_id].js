import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { booking_id } = req.query;

    if (!booking_id) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID is required'
      });
    }

    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Calculate time difference
    const now = new Date();
    const bookingDateTime = new Date(`${booking.booking_date} ${booking.booking_time}`);
    const hoursDifference = (bookingDateTime - now) / (1000 * 60 * 60);

    let canCancel = true;
    let refundAmount = 100; // percentage
    let message = '';

    if (hoursDifference >= 24) {
      refundAmount = 100;
      message = 'ยกเลิกได้ฟรี คืนเงิน 100%';
    } else if (hoursDifference >= 12) {
      refundAmount = 50;
      message = 'คืนเงิน 50%';
    } else if (hoursDifference >= 2) {
      refundAmount = 0;
      message = 'ไม่สามารถคืนเงินได้';
    } else {
      canCancel = false;
      refundAmount = 0;
      message = 'ไม่สามารถยกเลิกได้ เนื่องจากใกล้เวลานัดหมายเกินไป';
    }

    res.status(200).json({
      success: true,
      booking_id: booking_id,
      canCancel: canCancel,
      refundAmount: refundAmount,
      message: message,
      hoursDifference: Math.round(hoursDifference * 10) / 10,
      bookingDateTime: bookingDateTime.toISOString()
    });

  } catch (error) {
    console.error('Cancellation check API error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}