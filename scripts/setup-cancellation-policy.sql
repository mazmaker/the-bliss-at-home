-- Setup Basic Cancellation Policy Data
-- Run this to create default cancellation policy if tables exist

-- Insert default settings
INSERT INTO cancellation_policy_settings (
  id,
  policy_title_th,
  policy_description_th,
  max_reschedules_per_booking,
  refund_processing_days,
  is_active,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'นโยบายการยกเลิกและคืนเงิน',
  'การยกเลิกการจองและการคืนเงินขึ้นอยู่กับช่วงเวลาก่อนการให้บริการ',
  2,
  7,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Insert default tiers
INSERT INTO cancellation_policy_tiers (
  id,
  min_hours_before,
  max_hours_before,
  can_cancel,
  can_reschedule,
  refund_percentage,
  reschedule_fee,
  label_th,
  sort_order,
  is_active,
  created_at,
  updated_at
)
VALUES
  -- 72+ hours before: 100% refund
  (
    gen_random_uuid(),
    72,
    NULL,
    true,
    true,
    100,
    0,
    'ก่อนเวลานัด 3 วัน (100% คืนเงิน)',
    1,
    true,
    NOW(),
    NOW()
  ),
  -- 24-72 hours before: 75% refund
  (
    gen_random_uuid(),
    24,
    72,
    true,
    true,
    75,
    0,
    'ก่อนเวลานัด 1-3 วัน (75% คืนเงิน)',
    2,
    true,
    NOW(),
    NOW()
  ),
  -- 3-24 hours before: 50% refund
  (
    gen_random_uuid(),
    3,
    24,
    true,
    true,
    50,
    0,
    'ก่อนเวลานัด 3-24 ชั่วโมง (50% คืนเงิน)',
    3,
    true,
    NOW(),
    NOW()
  ),
  -- Less than 3 hours: No refund
  (
    gen_random_uuid(),
    0,
    3,
    false,
    false,
    0,
    0,
    'น้อยกว่า 3 ชั่วโมงก่อนเวลานัด (ไม่มีการคืนเงิน)',
    4,
    true,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;