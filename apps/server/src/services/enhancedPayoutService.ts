/**
 * Enhanced Payout Service — Support for 7/15/30 Day Cycles
 *
 * Supports multiple payout schedules:
 * - weekly (7 days)
 * - bi_weekly (15 days)
 * - monthly (30 days)
 * - bi_monthly (existing - mid-month + end-month)
 * - custom_days (1-90 days)
 */

import { getSupabaseClient } from '../lib/supabase'

// ============================================================
// Types
// ============================================================

export type PayoutSchedule = 'weekly' | 'bi_weekly' | 'monthly' | 'bi_monthly' | 'custom_days'

export interface PayoutSettings {
  // Existing bi-monthly settings
  mid_month_payout_day: number
  end_month_payout_day: number
  mid_month_cutoff_day: number
  end_month_cutoff_day: number
  minimum_payout_amount: number
  carry_forward_enabled: boolean
}

export interface StaffPayoutInfo {
  id: string
  profile_id: string
  name_th: string
  payout_schedule: PayoutSchedule
  custom_payout_interval?: number
  next_payout_date?: string
  last_payout_processed_at?: string
  payout_start_date?: string
  is_active: boolean
}

export interface PayoutCalculationResult {
  totalEarnings: number
  totalJobs: number
  jobIds: string[]
  periodStart: string
  periodEnd: string
}

export interface PayoutRecord {
  id: string
  staff_id: string
  period_start: string
  period_end: string
  gross_earnings: number
  net_amount: number
  total_jobs: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  payout_round: string | null
  is_carry_forward: boolean
  carry_forward_amount: number
  transfer_reference: string | null
  created_at: string
}

// ============================================================
// Helper Functions
// ============================================================

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Calculate next payout date based on schedule type
 */
function calculateNextPayoutDate(
  schedule: PayoutSchedule,
  customInterval: number = 30,
  lastPayout?: Date,
  startDate?: Date
): Date {
  const base = lastPayout || startDate || new Date()

  switch (schedule) {
    case 'weekly':
      return addDays(base, 7)

    case 'bi_weekly':
      return addDays(base, 15)

    case 'monthly':
      return addDays(base, 30)

    case 'bi_monthly':
      // For bi-monthly, calculate next 15th or 1st
      const day = base.getDate()
      if (day < 15) {
        return new Date(base.getFullYear(), base.getMonth(), 15)
      } else {
        return new Date(base.getFullYear(), base.getMonth() + 1, 1)
      }

    case 'custom_days':
      const days = Math.max(1, Math.min(90, customInterval || 30))
      return addDays(base, days)

    default:
      return addDays(base, 30)
  }
}

/**
 * Calculate period start date for a given schedule
 */
function calculatePeriodStart(
  schedule: PayoutSchedule,
  customInterval: number = 30,
  payoutDate: Date,
  lastPayoutDate?: Date
): Date {
  switch (schedule) {
    case 'weekly':
      return addDays(payoutDate, -7)

    case 'bi_weekly':
      return addDays(payoutDate, -15)

    case 'monthly':
      return addDays(payoutDate, -30)

    case 'bi_monthly':
      // Calculate based on bi-monthly logic
      const day = payoutDate.getDate()
      if (day === 15) {
        // Mid-month payout: period starts from 1st
        return new Date(payoutDate.getFullYear(), payoutDate.getMonth(), 1)
      } else {
        // End-month payout: period starts from 16th of previous month
        return new Date(payoutDate.getFullYear(), payoutDate.getMonth() - 1, 16)
      }

    case 'custom_days':
      const days = Math.max(1, Math.min(90, customInterval || 30))
      return addDays(payoutDate, -days)

    default:
      return addDays(payoutDate, -30)
  }
}

// ============================================================
// Core Functions
// ============================================================

/**
 * Get all staff with their payout information
 */
export async function getAllStaffPayoutInfo(): Promise<StaffPayoutInfo[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('staff')
    .select(`
      id,
      profile_id,
      name_th,
      payout_schedule,
      custom_payout_interval,
      next_payout_date,
      last_payout_processed_at,
      payout_start_date,
      is_active
    `)
    .eq('is_active', true)

  if (error) {
    console.error('[Enhanced Payout] Error fetching staff info:', error)
    return []
  }

  return data || []
}

/**
 * Get staff due for payout
 */
export async function getStaffDueForPayout(): Promise<StaffPayoutInfo[]> {
  const supabase = getSupabaseClient()
  const today = formatDate(new Date())

  const { data, error } = await supabase
    .from('staff')
    .select(`
      id,
      profile_id,
      name_th,
      payout_schedule,
      custom_payout_interval,
      next_payout_date,
      last_payout_processed_at,
      payout_start_date,
      is_active
    `)
    .eq('is_active', true)
    .lte('next_payout_date', today)

  if (error) {
    console.error('[Enhanced Payout] Error fetching staff due for payout:', error)
    return []
  }

  return data || []
}

/**
 * Calculate staff earnings for a period
 */
export async function calculateStaffEarnings(
  staffId: string,
  periodStart: string,
  periodEnd: string
): Promise<PayoutCalculationResult> {
  const supabase = getSupabaseClient()

  // Get completed jobs in the period that are NOT yet in any payout
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, staff_earnings, total_staff_earnings')
    .eq('staff_id', staffId)
    .eq('status', 'completed')
    .gte('scheduled_date', periodStart)
    .lte('scheduled_date', periodEnd)

  if (error) {
    console.error(`[Enhanced Payout] Error fetching jobs for staff ${staffId}:`, error)
    return { totalEarnings: 0, totalJobs: 0, jobIds: [], periodStart, periodEnd }
  }

  if (!jobs || jobs.length === 0) {
    return { totalEarnings: 0, totalJobs: 0, jobIds: [], periodStart, periodEnd }
  }

  // Filter out jobs already assigned to a payout
  const jobIds = jobs.map(j => j.id)
  const { data: existingPayoutJobs } = await supabase
    .from('payout_jobs')
    .select('job_id')
    .in('job_id', jobIds)

  const paidJobIds = new Set(existingPayoutJobs?.map(pj => pj.job_id) || [])

  let totalEarnings = 0
  const unpaidJobIds: string[] = []

  for (const job of jobs) {
    if (!paidJobIds.has(job.id)) {
      totalEarnings += job.total_staff_earnings || job.staff_earnings || 0
      unpaidJobIds.push(job.id)
    }
  }

  return {
    totalEarnings,
    totalJobs: unpaidJobIds.length,
    jobIds: unpaidJobIds,
    periodStart,
    periodEnd
  }
}

/**
 * Create payout record for a staff member
 */
export async function createPayoutRecord(
  staff: StaffPayoutInfo,
  earnings: PayoutCalculationResult,
  carryForwardAmount: number = 0
): Promise<PayoutRecord | null> {
  const supabase = getSupabaseClient()

  const netAmount = earnings.totalEarnings + carryForwardAmount

  // Create payout record
  const payoutData = {
    staff_id: staff.id,
    period_start: earnings.periodStart,
    period_end: earnings.periodEnd,
    gross_earnings: earnings.totalEarnings,
    net_amount: netAmount,
    total_jobs: earnings.totalJobs,
    status: 'pending' as const,
    payout_round: `${staff.payout_schedule}_${formatDate(new Date())}`,
    is_carry_forward: carryForwardAmount > 0,
    carry_forward_amount: carryForwardAmount
  }

  const { data: payoutRecord, error: payoutError } = await supabase
    .from('payouts')
    .insert(payoutData)
    .select()
    .single()

  if (payoutError) {
    console.error(`[Enhanced Payout] Error creating payout record:`, payoutError)
    return null
  }

  // Link jobs to payout
  if (earnings.jobIds.length > 0) {
    const payoutJobs = earnings.jobIds.map(jobId => ({
      payout_id: payoutRecord.id,
      job_id: jobId,
      amount: 0 // Will be calculated by trigger or updated separately
    }))

    const { error: jobsError } = await supabase
      .from('payout_jobs')
      .insert(payoutJobs)

    if (jobsError) {
      console.error(`[Enhanced Payout] Error linking jobs to payout:`, jobsError)
    }
  }

  console.log(`✅ [Enhanced Payout] Created payout record for ${staff.name_th}: ฿${netAmount}`)

  return payoutRecord
}

/**
 * Update staff next payout date
 */
export async function updateStaffNextPayoutDate(
  staffId: string,
  schedule: PayoutSchedule,
  customInterval?: number
): Promise<void> {
  const supabase = getSupabaseClient()

  const nextPayoutDate = calculateNextPayoutDate(
    schedule,
    customInterval,
    new Date(), // Use current date as base for next calculation
    new Date()
  )

  const { error } = await supabase
    .from('staff')
    .update({
      next_payout_date: formatDate(nextPayoutDate),
      last_payout_processed_at: new Date().toISOString()
    })
    .eq('id', staffId)

  if (error) {
    console.error(`[Enhanced Payout] Error updating next payout date for staff ${staffId}:`, error)
  } else {
    console.log(`✅ [Enhanced Payout] Updated next payout date for staff ${staffId}: ${formatDate(nextPayoutDate)}`)
  }
}

/**
 * Process payouts for all eligible staff
 */
export async function processEligiblePayouts(): Promise<{
  processed: number
  errors: string[]
  results: PayoutRecord[]
}> {
  console.log('🔄 [Enhanced Payout] Starting payout processing...')

  const staffDue = await getStaffDueForPayout()
  const results: PayoutRecord[] = []
  const errors: string[] = []
  let processed = 0

  console.log(`📊 [Enhanced Payout] Found ${staffDue.length} staff eligible for payout`)

  for (const staff of staffDue) {
    try {
      // Calculate period dates
      const payoutDate = staff.next_payout_date ? new Date(staff.next_payout_date) : new Date()
      const periodStart = calculatePeriodStart(
        staff.payout_schedule,
        staff.custom_payout_interval,
        payoutDate,
        staff.last_payout_processed_at ? new Date(staff.last_payout_processed_at) : undefined
      )

      // Calculate earnings
      const earnings = await calculateStaffEarnings(
        staff.id,
        formatDate(periodStart),
        formatDate(payoutDate)
      )

      // Check if there are earnings or carry-forward
      if (earnings.totalEarnings > 0) {
        // Create payout record
        const payoutRecord = await createPayoutRecord(staff, earnings)

        if (payoutRecord) {
          results.push(payoutRecord)

          // Update staff next payout date
          await updateStaffNextPayoutDate(
            staff.id,
            staff.payout_schedule,
            staff.custom_payout_interval
          )

          processed++
        }
      } else {
        console.log(`ℹ️ [Enhanced Payout] No earnings for ${staff.name_th}, skipping`)
      }

    } catch (error: any) {
      const errorMessage = `Error processing payout for ${staff.name_th}: ${error.message}`
      console.error(`❌ [Enhanced Payout] ${errorMessage}`)
      errors.push(errorMessage)
    }
  }

  console.log(`✅ [Enhanced Payout] Completed payout processing: ${processed} processed, ${errors.length} errors`)

  return { processed, errors, results }
}

/**
 * Get payout schedule settings
 */
export async function getPayoutScheduleSettings() {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('payout_schedule_settings')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[Enhanced Payout] Error fetching schedule settings:', error)
    return []
  }

  return data || []
}

/**
 * Notify staff about upcoming payouts
 */
export async function notifyUpcomingPayouts(daysBefore: number = 1): Promise<void> {
  const supabase = getSupabaseClient()
  const targetDate = formatDate(addDays(new Date(), daysBefore))

  const { data: staffToNotify } = await supabase
    .from('staff')
    .select(`
      id,
      name_th,
      profile_id,
      payout_schedule,
      next_payout_date,
      profiles!inner(line_user_id)
    `)
    .eq('is_active', true)
    .eq('next_payout_date', targetDate)

  if (!staffToNotify || staffToNotify.length === 0) {
    console.log(`ℹ️ [Enhanced Payout] No staff to notify for date: ${targetDate}`)
    return
  }

  for (const staff of staffToNotify) {
    if (staff.profiles?.line_user_id) {
      // TODO: Integrate with LINE notification service
      console.log(`🔔 [Enhanced Payout] Would notify ${staff.name_th} about upcoming payout`)
    }
  }

  console.log(`✅ [Enhanced Payout] Notified ${staffToNotify.length} staff about upcoming payouts`)
}

// ============================================================
// Cron Entry Point
// ============================================================

/**
 * Main cron function for enhanced payout processing
 */
export async function processEnhancedPayoutCron(): Promise<void> {
  try {
    console.log('🚀 [Enhanced Payout] Starting enhanced payout cron job')

    // 1. Process eligible payouts
    const results = await processEligiblePayouts()

    // 2. Notify staff about upcoming payouts (1 day before)
    await notifyUpcomingPayouts(1)

    // 3. Log summary
    console.log(`📊 [Enhanced Payout] Cron completed:`)
    console.log(`   - Processed: ${results.processed} payouts`)
    console.log(`   - Errors: ${results.errors.length}`)
    if (results.errors.length > 0) {
      console.log(`   - Error details:`, results.errors)
    }

  } catch (error) {
    console.error('💥 [Enhanced Payout] Cron job failed:', error)
  }
}