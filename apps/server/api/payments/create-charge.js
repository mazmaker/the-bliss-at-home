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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { booking_id, customer_id, amount, token, omise_card_id, payment_method, card_info } = req.body;

    // Validate required fields
    if (!booking_id || !customer_id || !amount || (!token && !omise_card_id)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: booking_id, customer_id, amount, and either token or omise_card_id',
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
      .select('*, service:services(*)')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
    }

    // Initialize Omise (dynamic import for ES modules)
    const { default: Omise } = await import('omise');
    const omise = Omise({
      publicKey: process.env.OMISE_PUBLIC_KEY,
      secretKey: process.env.OMISE_SECRET_KEY,
    });

    // Create Omise charge
    const chargeParams = {
      amount: Math.round(amount * 100), // Convert to satangs
      currency: 'THB',
      description: `Payment for ${booking.service?.name_en || booking.service?.name_th} - Booking ${booking.booking_number}`,
      metadata: {
        booking_id,
        customer_id,
        service_id: booking.service_id,
        booking_number: booking.booking_number
      }
    };

    // Add payment source (token or card)
    if (token) {
      chargeParams.card = token;
    } else if (omise_card_id) {
      chargeParams.card = omise_card_id;
    }

    console.log('Creating Omise charge:', chargeParams);

    // Create charge with Omise
    const charge = await omise.charges.create(chargeParams);

    console.log('Omise charge created:', charge.id, charge.status);

    // Update booking status to confirmed
    if (charge.status === 'successful') {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking_id);

      if (updateError) {
        console.error('Error updating booking status:', updateError);
      }
    }

    // Return successful response
    res.status(200).json({
      success: true,
      charge_id: charge.id,
      amount: charge.amount / 100, // Convert back to baht
      currency: charge.currency,
      status: charge.status,
      message: 'Payment processed successfully',
      booking_id: booking_id,
      customer_id: customer_id,
    });

  } catch (error) {
    console.error('Payment API error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}