export default function handler(req, res) {
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
    // Return cancellation policy data
    const policy = {
      success: true,
      policy: {
        free_cancellation_hours: 24,
        partial_refund_hours: 12,
        no_refund_hours: 2,
        terms: {
          th: [
            "ยกเลิกฟรี: ก่อน 24 ชั่วโมง",
            "คืนเงิน 50%: ก่อน 12 ชั่วโมง",
            "ไม่คืนเงิน: น้อยกว่า 2 ชั่วโมง"
          ],
          en: [
            "Free cancellation: 24+ hours before",
            "50% refund: 12+ hours before",
            "No refund: Less than 2 hours before"
          ]
        }
      }
    };

    res.status(200).json(policy);
  } catch (error) {
    console.error('Cancellation policy API error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}