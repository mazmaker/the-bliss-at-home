/**
 * Cancellation Policy Service
 * Handles fetching and updating cancellation policy configuration from database
 */

import { getSupabaseClient } from '../lib/supabase.js'

// ============================================
// Types
// ============================================

export interface CancellationPolicyTier {
  id: string
  min_hours_before: number
  max_hours_before: number | null
  can_cancel: boolean
  can_reschedule: boolean
  refund_percentage: number
  reschedule_fee: number
  label_th: string | null
  label_en: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CancellationPolicySettings {
  id: string
  policy_title_th: string | null
  policy_title_en: string | null
  policy_description_th: string | null
  policy_description_en: string | null
  max_reschedules_per_booking: number
  refund_processing_days: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CancellationPolicy {
  settings: CancellationPolicySettings | null
  tiers: CancellationPolicyTier[]
}

export interface BookingCancellationEligibility {
  canCancel: boolean
  canReschedule: boolean
  refundPercentage: number
  rescheduleFee: number
  hoursUntilBooking: number
  tier: CancellationPolicyTier | null
  reason?: string
}

// ============================================
// Fetch Policy
// ============================================

/**
 * Get active cancellation policy (settings + tiers)
 */
export async function getCancellationPolicy(): Promise<CancellationPolicy> {
  const supabase = getSupabaseClient()

  // Fetch settings
  const { data: settings, error: settingsError } = await supabase
    .from('cancellation_policy_settings')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (settingsError && settingsError.code !== 'PGRST116') {
    console.error('Error fetching cancellation policy settings:', settingsError)
  }

  // Fetch tiers (sorted by sort_order)
  const { data: tiers, error: tiersError } = await supabase
    .from('cancellation_policy_tiers')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (tiersError) {
    console.error('Error fetching cancellation policy tiers:', tiersError)
  }

  return {
    settings: settings || null,
    tiers: tiers || [],
  }
}

/**
 * Get full policy including inactive items (for admin)
 */
export async function getFullCancellationPolicy(): Promise<CancellationPolicy> {
  const supabase = getSupabaseClient()

  // Fetch all settings
  const { data: settings, error: settingsError } = await supabase
    .from('cancellation_policy_settings')
    .select('*')
    .limit(1)
    .single()

  if (settingsError && settingsError.code !== 'PGRST116') {
    console.error('Error fetching cancellation policy settings:', settingsError)
  }

  // Fetch all tiers (sorted by sort_order)
  const { data: tiers, error: tiersError } = await supabase
    .from('cancellation_policy_tiers')
    .select('*')
    .order('sort_order', { ascending: true })

  if (tiersError) {
    console.error('Error fetching cancellation policy tiers:', tiersError)
  }

  return {
    settings: settings || null,
    tiers: tiers || [],
  }
}

// ============================================
// Check Eligibility
// ============================================

/**
 * Check if a booking can be cancelled/rescheduled based on policy
 */
export async function checkCancellationEligibility(
  bookingId: string
): Promise<BookingCancellationEligibility> {
  const supabase = getSupabaseClient()

  console.log('🔍 checkCancellationEligibility: bookingId =', bookingId)

  // Get booking details (reschedule_count may not exist in old schemas)
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, booking_date, booking_time, status, reschedule_count')
    .eq('id', bookingId)
    .single()

  console.log('📋 Booking query result:', { booking, error: bookingError })

  if (bookingError || !booking) {
    console.log('❌ Booking not found - error:', bookingError?.message, 'code:', bookingError?.code)
    return {
      canCancel: false,
      canReschedule: false,
      refundPercentage: 0,
      rescheduleFee: 0,
      hoursUntilBooking: 0,
      tier: null,
      reason: 'ไม่พบข้อมูลการจอง',
    }
  }

  // Check if already cancelled or completed
  if (booking.status === 'cancelled') {
    return {
      canCancel: false,
      canReschedule: false,
      refundPercentage: 0,
      rescheduleFee: 0,
      hoursUntilBooking: 0,
      tier: null,
      reason: 'การจองนี้ถูกยกเลิกแล้ว',
    }
  }

  if (booking.status === 'completed') {
    return {
      canCancel: false,
      canReschedule: false,
      refundPercentage: 0,
      rescheduleFee: 0,
      hoursUntilBooking: 0,
      tier: null,
      reason: 'การจองนี้เสร็จสิ้นแล้ว',
    }
  }

  // Calculate hours until booking.
  // +07:00: booking_date+booking_time is Bangkok wall-clock. The SERVER runs on Vercel in UTC, so a
  // device-local parse read "14:00" as 14:00 UTC = 7h later than reality → hoursUntilBooking inflated
  // by 7h → wrong cancellation/refund TIER (more-generous than it should be) and a broken past-time
  // guard. Pin to +07:00 (TH = fixed UTC+7). Matches the server's notificationService.
  const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}+07:00`)
  const now = new Date()
  const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

  // Booking time has passed
  if (hoursUntilBooking <= 0) {
    return {
      canCancel: false,
      canReschedule: false,
      refundPercentage: 0,
      rescheduleFee: 0,
      hoursUntilBooking: 0,
      tier: null,
      reason: 'เลยเวลานัดหมายแล้ว',
    }
  }

  // Get policy
  const policy = await getCancellationPolicy()

  // Check max reschedules (default to 0 if column doesn't exist)
  const currentRescheduleCount = (booking as any).reschedule_count || 0
  const maxReschedules = policy.settings?.max_reschedules_per_booking || 2
  const rescheduleExceeded = currentRescheduleCount >= maxReschedules

  // Find applicable tier
  const applicableTier = policy.tiers.find((tier) => {
    const minHoursMatch = hoursUntilBooking >= tier.min_hours_before
    const maxHoursMatch = tier.max_hours_before === null || hoursUntilBooking < tier.max_hours_before
    return minHoursMatch && maxHoursMatch
  })

  if (!applicableTier) {
    // No tier found - use most restrictive defaults
    return {
      canCancel: false,
      canReschedule: false,
      refundPercentage: 0,
      rescheduleFee: 0,
      hoursUntilBooking: Math.round(hoursUntilBooking * 10) / 10,
      tier: null,
      reason: 'ไม่พบเงื่อนไขนโยบายที่ตรงกับช่วงเวลานี้',
    }
  }

  return {
    canCancel: applicableTier.can_cancel,
    canReschedule: applicableTier.can_reschedule && !rescheduleExceeded,
    refundPercentage: applicableTier.refund_percentage,
    rescheduleFee: Number(applicableTier.reschedule_fee) || 0,
    hoursUntilBooking: Math.round(hoursUntilBooking * 10) / 10,
    tier: applicableTier,
    reason: rescheduleExceeded
      ? `เลื่อนนัดครบจำนวนสูงสุดแล้ว (${maxReschedules} ครั้ง)`
      : undefined,
  }
}

/**
 * Calculate refund amount based on dynamic policy
 */
export async function calculateDynamicRefund(bookingId: string): Promise<{
  eligible: boolean
  originalAmount: number
  refundAmount: number
  refundPercentage: number
  reason?: string
  hoursUntilBooking?: number
  tier?: CancellationPolicyTier
}> {
  const supabase = getSupabaseClient()

  // Get booking with payment info
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, booking_date, booking_time, final_price, payment_status, status')
    .eq('id', bookingId)
    .single()

  if (bookingError || !booking) {
    return {
      eligible: false,
      originalAmount: 0,
      refundAmount: 0,
      refundPercentage: 0,
      reason: 'ไม่พบข้อมูลการจอง',
    }
  }

  // Check if already cancelled
  if (booking.status === 'cancelled') {
    return {
      eligible: false,
      originalAmount: Number(booking.final_price),
      refundAmount: 0,
      refundPercentage: 0,
      reason: 'การจองนี้ถูกยกเลิกแล้ว',
    }
  }

  // Check if payment was made
  if (booking.payment_status !== 'paid') {
    return {
      eligible: false,
      originalAmount: Number(booking.final_price),
      refundAmount: 0,
      refundPercentage: 0,
      reason: `ไม่มียอดชำระเงินที่จะคืน (สถานะ: ${booking.payment_status})`,
    }
  }

  // Check eligibility
  const eligibility = await checkCancellationEligibility(bookingId)

  if (!eligibility.canCancel) {
    return {
      eligible: false,
      originalAmount: Number(booking.final_price),
      refundAmount: 0,
      refundPercentage: 0,
      reason: eligibility.reason || 'ไม่สามารถยกเลิกการจองได้ในขณะนี้',
      hoursUntilBooking: eligibility.hoursUntilBooking,
    }
  }

  const originalAmount = Number(booking.final_price)
  const refundPercentage = eligibility.refundPercentage
  const refundAmount = Math.round((originalAmount * refundPercentage) / 100 * 100) / 100

  return {
    eligible: refundPercentage > 0,
    originalAmount,
    refundAmount,
    refundPercentage,
    reason: eligibility.tier?.label_th || eligibility.tier?.label_en || undefined,
    hoursUntilBooking: eligibility.hoursUntilBooking,
    tier: eligibility.tier || undefined,
  }
}

// ============================================
// Admin: Update Policy
// ============================================

/**
 * Update cancellation policy settings
 */
export async function updatePolicySettings(
  settings: Partial<CancellationPolicySettings>
): Promise<CancellationPolicySettings | null> {
  const supabase = getSupabaseClient()

  // Get existing settings ID
  const { data: existing } = await supabase
    .from('cancellation_policy_settings')
    .select('id')
    .limit(1)
    .single()

  if (!existing) {
    // Create new settings
    const { data, error } = await supabase
      .from('cancellation_policy_settings')
      .insert(settings)
      .select()
      .single()

    if (error) {
      console.error('Error creating cancellation policy settings:', error)
      throw error
    }

    return data
  }

  // Update existing
  const { data, error } = await supabase
    .from('cancellation_policy_settings')
    .update(settings)
    .eq('id', existing.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating cancellation policy settings:', error)
    throw error
  }

  return data
}

/**
 * Update a cancellation policy tier
 */
export async function updatePolicyTier(
  tierId: string,
  tierData: Partial<CancellationPolicyTier>
): Promise<CancellationPolicyTier | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('cancellation_policy_tiers')
    .update(tierData)
    .eq('id', tierId)
    .select()
    .single()

  if (error) {
    console.error('Error updating cancellation policy tier:', error)
    throw error
  }

  return data
}

/**
 * Create a new cancellation policy tier
 */
export async function createPolicyTier(
  tierData: Omit<CancellationPolicyTier, 'id' | 'created_at' | 'updated_at'>
): Promise<CancellationPolicyTier | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('cancellation_policy_tiers')
    .insert(tierData)
    .select()
    .single()

  if (error) {
    console.error('Error creating cancellation policy tier:', error)
    throw error
  }

  return data
}

/**
 * Delete a cancellation policy tier
 */
export async function deletePolicyTier(tierId: string): Promise<boolean> {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('cancellation_policy_tiers')
    .delete()
    .eq('id', tierId)

  if (error) {
    console.error('Error deleting cancellation policy tier:', error)
    throw error
  }

  return true
}

// ============================================
// Export Service
// ============================================

export const cancellationPolicyService = {
  getCancellationPolicy,
  getFullCancellationPolicy,
  checkCancellationEligibility,
  calculateDynamicRefund,
  updatePolicySettings,
  updatePolicyTier,
  createPolicyTier,
  deletePolicyTier,
}
