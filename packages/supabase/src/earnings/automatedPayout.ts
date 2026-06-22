/**
 * Automated Payout Generation System
 * Runs daily to check for due payouts and generate them automatically
 */

import { createClient } from '@supabase/supabase-js'

// Create server-specific Supabase client (no browser dependencies)
const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

const supabase = createServerSupabaseClient()
import type { PayoutSchedule } from './types'

interface StaffPayoutInfo {
  id: string
  profile_id: string
  name_th: string
  payout_schedule?: PayoutSchedule
  next_payout_date?: string
  payout_start_date?: string
  custom_payout_interval?: number
  last_payout_processed_at?: string
}

interface PayoutPeriod {
  periodStart: string
  periodEnd: string
  nextPayoutDate: string
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function getDefaultIntervalDays(schedule: PayoutSchedule | undefined, customInterval?: number): number {
  switch (schedule) {
    case 'weekly': return 7
    case 'bi_monthly': return 15
    case 'monthly': return 30
    case 'custom_days': return customInterval || 30
    default: return 30
  }
}

// Calculate the next payout date from a given date based on schedule
function getNextPayoutDate(schedule: PayoutSchedule | undefined, customInterval: number | undefined, fromDate: Date): Date {
  switch (schedule) {
    case 'weekly':
      return addDays(fromDate, 7)
    case 'bi_monthly': {
      const day = fromDate.getDate()
      if (day < 16) return new Date(fromDate.getFullYear(), fromDate.getMonth(), 16)
      return new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 1)
    }
    case 'monthly':
      return new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 1)
    case 'custom_days':
      return addDays(fromDate, customInterval || 30)
    default:
      return addDays(fromDate, 30)
  }
}

/**
 * Calculate payout period using standard payroll approach:
 * period_start = day after last payout processed (or payout_start_date for first payout)
 * period_end   = today (the day the payout runs)
 * next_payout  = today + schedule interval
 *
 * This ensures no earnings are missed regardless of schedule type,
 * and handles overdue payouts correctly (period extends back to last paid date).
 */
function calculatePayoutPeriod(staff: StaffPayoutInfo, currentDate: Date = new Date()): PayoutPeriod {
  // Period start: day after last payout, or payout_start_date for first-ever payout
  let periodStart: Date
  if (staff.last_payout_processed_at) {
    const lastDate = new Date(staff.last_payout_processed_at.split('T')[0])
    periodStart = addDays(lastDate, 1)
  } else if (staff.payout_start_date) {
    periodStart = new Date(staff.payout_start_date)
  } else {
    // No history and no start date — use one full interval ago
    const days = getDefaultIntervalDays(staff.payout_schedule, staff.custom_payout_interval)
    periodStart = addDays(currentDate, -days)
  }

  // Period end: today
  const periodEnd = new Date(currentDate.toISOString().split('T')[0])

  // Next payout date: schedule-based from today
  const nextPayoutDate = getNextPayoutDate(staff.payout_schedule, staff.custom_payout_interval, currentDate)

  return {
    periodStart: formatDate(periodStart),
    periodEnd: formatDate(periodEnd),
    nextPayoutDate: formatDate(nextPayoutDate)
  }
}

/**
 * Get completed jobs for a staff member in the given period, excluding already-paid jobs
 */
async function getCompletedJobs(profileId: string, periodStart: string, periodEnd: string) {
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, service_name, scheduled_date, staff_earnings, total_staff_earnings, duration_minutes, total_duration_minutes')
    .eq('staff_id', profileId)
    .eq('status', 'completed')
    .gte('scheduled_date', periodStart)
    .lte('scheduled_date', periodEnd)
    .order('scheduled_date', { ascending: false })

  if (error) {
    console.error('Error fetching completed jobs:', error)
    throw error
  }

  if (!jobs || jobs.length === 0) return []

  // Exclude jobs already linked to a payout
  const jobIds = jobs.map(j => j.id)
  const { data: paidJobs } = await supabase
    .from('payout_jobs')
    .select('job_id')
    .in('job_id', jobIds)

  const paidSet = new Set((paidJobs || []).map(pj => pj.job_id))
  return jobs.filter(j => !paidSet.has(j.id))
}

/**
 * Generate automated payout for a staff member
 */
async function generateAutoPayout(staff: StaffPayoutInfo): Promise<void> {
  try {
    console.log(`🤖 Generating auto payout for staff: ${staff.name_th} (${staff.payout_schedule})`)

    // Calculate period
    const period = calculatePayoutPeriod(staff)

    // Skip if payout already exists for this period (prevent duplicates)
    const { data: existing } = await supabase
      .from('payouts')
      .select('id')
      .eq('staff_id', staff.profile_id)
      .eq('period_start', period.periodStart)
      .eq('period_end', period.periodEnd)
      .maybeSingle()

    if (existing) {
      console.log(`⏭️ Payout already exists for ${staff.name_th} (${period.periodStart} – ${period.periodEnd}), skipping`)
      // Still advance next_payout_date so staff doesn't stay permanently overdue
      await updateNextPayoutDate(staff.id, period.nextPayoutDate)
      return
    }

    // Get completed jobs in this period
    const jobs = await getCompletedJobs(staff.profile_id, period.periodStart, period.periodEnd)

    if (jobs.length === 0) {
      console.log(`📭 No completed jobs for ${staff.name_th} in period ${period.periodStart} - ${period.periodEnd}`)

      // Still update next payout date even if no jobs
      await updateNextPayoutDate(staff.id, period.nextPayoutDate)
      return
    }

    // Calculate totals
    const grossEarnings = jobs.reduce((sum, job) => {
      return sum + (job.total_staff_earnings || job.staff_earnings || 0)
    }, 0)

    const totalJobs = jobs.length
    const totalHours = jobs.reduce((sum, job) => {
      return sum + ((job.total_duration_minutes || job.duration_minutes || 0) / 60)
    }, 0)

    // Create payout record
    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .insert({
        staff_id: staff.profile_id,
        period_start: period.periodStart,
        period_end: period.periodEnd,
        gross_earnings: grossEarnings,
        platform_fee: 0, // No platform fee
        net_amount: grossEarnings,
        total_jobs: totalJobs,
        total_hours: totalHours,
        status: 'pending',
        payout_round: null,
        is_automated: true, // Mark as automated
        notes: `Auto-generated ${staff.payout_schedule} payout`
      })
      .select()
      .single()

    if (payoutError) {
      console.error('Error creating payout:', payoutError)
      throw payoutError
    }

    // Create payout_jobs records
    const payoutJobsData = jobs.map(job => ({
      payout_id: payout.id,
      job_id: job.id,
      amount: job.total_staff_earnings || job.staff_earnings || 0
    }))

    const { error: pjError } = await supabase
      .from('payout_jobs')
      .insert(payoutJobsData)

    if (pjError) {
      console.error('Error creating payout jobs:', pjError)
      throw pjError
    }

    // Update next payout date
    await updateNextPayoutDate(staff.id, period.nextPayoutDate)

    // Send notification
    await sendPayoutNotification(staff, payout, jobs.length)

    console.log(`✅ Created auto payout for ${staff.name_th}: ฿${grossEarnings.toLocaleString()} (${totalJobs} jobs)`)

  } catch (error) {
    console.error(`❌ Error generating payout for ${staff.name_th}:`, error)
    throw error
  }
}

/**
 * Update staff next payout date
 */
async function updateNextPayoutDate(staffId: string, nextPayoutDate: string): Promise<void> {
  const { error } = await supabase
    .from('staff')
    .update({
      next_payout_date: nextPayoutDate,
      last_payout_processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', staffId)

  if (error) {
    console.error('Error updating next payout date:', error)
    throw error
  }
}

/**
 * Send notification to staff about new payout
 */
async function sendPayoutNotification(staff: StaffPayoutInfo, payout: any, jobCount: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: staff.profile_id,
        title: '🎉 รอบจ่ายเงินใหม่พร้อมแล้ว',
        message: `ระบบได้สร้างรอบจ่ายเงินอัตโนมัติแล้ว จำนวน ฿${payout.gross_earnings.toLocaleString()} จาก ${jobCount} งาน รอการอนุมัติจาก Admin`,
        type: 'payout',
        data: {
          payout_id: payout.id,
          amount: payout.gross_earnings,
          jobs_count: jobCount,
          period_start: payout.period_start,
          period_end: payout.period_end
        },
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error sending notification:', error)
    }
  } catch (error) {
    console.error('Error in sendPayoutNotification:', error)
  }
}

/**
 * Main function: Check for due payouts and generate them
 */
export async function dailyPayoutCheck(): Promise<{ success: boolean; processed: number; errors: string[] }> {
  console.log('🚀 Starting daily payout check...')

  const today = new Date().toISOString().split('T')[0]
  const errors: string[] = []
  let processed = 0

  try {
    console.log(`📅 Daily payout check for date: ${today}`)

    // Query staff due for payout today
    const { data: staffDue, error: staffError } = await supabase
      .from('staff')
      .select('id, profile_id, name_th, payout_schedule, next_payout_date, payout_start_date, custom_payout_interval, last_payout_processed_at')
      .lte('next_payout_date', today)
      .eq('status', 'active')
      .not('profile_id', 'is', null)
      .not('payout_schedule', 'is', null)

    if (staffError) {
      console.error('Error fetching staff due for payout:', staffError)
      return { success: false, processed: 0, errors: [staffError.message] }
    }

    if (!staffDue || staffDue.length === 0) {
      console.log('📭 No staff due for payout today')
      return { success: true, processed: 0, errors: [] }
    }

    console.log(`👥 Found ${staffDue.length} staff due for payout`)

    // Process each staff member
    for (const staff of staffDue) {
      try {
        await generateAutoPayout(staff as StaffPayoutInfo)
        processed++
      } catch (err) {
        const msg = `Failed for ${staff.name_th}: ${err?.toString()}`
        console.error(msg)
        errors.push(msg)
      }
    }

    console.log(`✅ Completed daily payout check. Processed: ${processed}, Errors: ${errors.length}`)

    return { success: true, processed, errors }

  } catch (error) {
    console.error('❌ Error in daily payout check:', error)
    return {
      success: false,
      processed,
      errors: [error?.toString() || 'Unknown error']
    }
  }
}

/**
 * Manual trigger for testing
 */
export async function triggerPayoutForStaff(staffId: string): Promise<void> {
  const { data: staff, error } = await supabase
    .from('staff')
    .select('id, profile_id, name_th, payout_schedule, next_payout_date, payout_start_date, custom_payout_interval')
    .eq('id', staffId)
    .single()

  if (error || !staff) throw new Error(`Staff not found: ${staffId}`)
  if (!staff.profile_id) throw new Error(`Staff ${staff.name_th} has no profile_id`)
  if (!staff.payout_schedule) throw new Error(`Staff ${staff.name_th} has no payout_schedule`)

  await generateAutoPayout(staff as StaffPayoutInfo)
}