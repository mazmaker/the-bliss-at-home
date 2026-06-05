import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    // Initialize Supabase client
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch cancellation policy tiers from database
    const { data: tiers, error } = await supabase
      .from('cancellation_policy_tiers')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      throw error;
    }

    // Format response for frontend compatibility
    const policy = {
      success: true,
      data: {
        tiers: tiers || [],
        settings: {
          max_reschedules_per_booking: 2,
          refund_processing_days: 7
        }
      }
    };

    res.status(200).json(policy);
  } catch (error) {
    console.error('Cancellation policy API error:', error);

    // Fallback to default policy if database fails
    const fallbackPolicy = {
      success: true,
      data: {
        tiers: [
          {
            id: 'fallback-1',
            min_hours_before: 72,
            max_hours_before: null,
            can_cancel: true,
            can_reschedule: true,
            refund_percentage: 100,
            reschedule_fee: 0,
            label_th: 'ก่อนเวลานัด 3 วัน (100% คืนเงิน)',
            sort_order: 1,
            is_active: true
          },
          {
            id: 'fallback-2',
            min_hours_before: 24,
            max_hours_before: 72,
            can_cancel: true,
            can_reschedule: true,
            refund_percentage: 75,
            reschedule_fee: 0,
            label_th: 'ก่อนเวลานัด 1-3 วัน (75% คืนเงิน)',
            sort_order: 2,
            is_active: true
          },
          {
            id: 'fallback-3',
            min_hours_before: 3,
            max_hours_before: 24,
            can_cancel: true,
            can_reschedule: true,
            refund_percentage: 50,
            reschedule_fee: 0,
            label_th: 'ก่อนเวลานัด 3-24 ชั่วโมง (50% คืนเงิน)',
            sort_order: 3,
            is_active: true
          },
          {
            id: 'fallback-4',
            min_hours_before: 0,
            max_hours_before: 3,
            can_cancel: false,
            can_reschedule: false,
            refund_percentage: 0,
            reschedule_fee: 0,
            label_th: 'น้อยกว่า 3 ชั่วโมงก่อนเวลานัด (ไม่มีการคืนเงิน)',
            sort_order: 4,
            is_active: true
          }
        ],
        settings: {
          max_reschedules_per_booking: 2,
          refund_processing_days: 7
        }
      }
    };

    res.status(200).json(fallbackPolicy);
  }
}