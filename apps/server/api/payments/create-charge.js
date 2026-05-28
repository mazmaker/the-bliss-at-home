export default function handler(req, res) {
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
    console.log('Payment API called with:', req.body);

    // Temporary mock response for testing
    const mockResponse = {
      success: true,
      charge_id: 'chrg_test_' + Date.now(),
      amount: req.body.amount || 0,
      currency: 'THB',
      status: 'successful',
      message: 'Payment processed successfully (mock)',
      booking_id: req.body.booking_id,
      customer_id: req.body.customer_id
    };

    console.log('Sending mock response:', mockResponse);

    res.status(200).json(mockResponse);
  } catch (error) {
    console.error('Payment API error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}