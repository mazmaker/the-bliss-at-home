/**
 * Payout Service — Cron logic for automated payout cutoff processing
 *
 * Runs daily at 08:00 ICT (01:00 UTC) and checks:
 * - 1 day before cutoff → notify Staff + Admin
 * - 1 day before payout → notify Admin
 * - On cutoff day → create payout records
 */

import { getSupabaseClient } from '../lib/supabase'

// ============================================================
// Types
// ============================================================

interface PayoutSettings {
  mid_month_payout_day: number
  end_month_payout_day: number
  mid_month_cutoff_day: number
  end_month_cutoff_day: number
  minimum_payout_amount: number
  carry_forward_enabled: boolean
}

interface StaffForPayout {
  id: string          // staff.id
  profile_id: string  // staff.profile_id
  name_th: string
  payout_schedule: 'bi-monthly' | 'monthly'
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

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

async function getPayoutSettings(): Promise<PayoutSettings> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('payout_settings')
    .select('setting_key, setting_value')

  if (error) {
    console.error('[Payout] Error fetching settings:', error)
    // Return defaults
    return {
      mid_month_payout_day: 16,
      end_month_payout_day: 1,
      mid_month_cutoff_day: 10,
      end_month_cutoff_day: 25,
      minimum_payout_amount: 100,
      carry_forward_enabled: true,
    }
  }

  const settings: Record<string, string> = {}
  data?.forEach((row: { setting_key: string; setting_value: string }) => {
    settings[row.setting_key] = row.setting_value
  })

  return {
    mid_month_payout_day: parseInt(settings.mid_month_payout_day || '16'),
    end_month_payout_day: parseInt(settings.end_month_payout_day || '1'),
    mid_month_cutoff_day: parseInt(settings.mid_month_cutoff_day || '10'),
    end_month_cutoff_day: parseInt(settings.end_month_cutoff_day || '25'),
    minimum_payout_amount: parseInt(settings.minimum_payout_amount || '100'),
    carry_forward_enabled: settings.carry_forward_enabled !== 'false',
  }
}

// ============================================================
// Core: Calculate Staff Earnings for a Period
// ============================================================

async function calculateStaffEarnings(
  staffId: string,
  periodStart: string,
  periodEnd: string
): Promise<{ totalEarnings: number; totalJobs: number; jobIds: string[] }> {
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
    console.error(`[Payout] Error fetching jobs for staff ${staffId}:`, error)
    return { totalEarnings: 0, totalJobs: 0, jobIds: [] }
  }

  if (!jobs || jobs.length === 0) {
    return { totalEarnings: 0, totalJobs: 0, jobIds: [] }
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
  }
}

// ============================================================
// Core: Create Payout Record + Link Jobs
// ============================================================

async function createPayoutRecord(
  staffId: string,
  profileId: string,
  grossEarnings: number,
  totalJobs: number,
  jobIds: string[],
  periodStart: string,
  periodEnd: string,
  round: 'mid-month' | 'end-month',
  carryForwardAmount: number = 0
): Promise<string | null> {
  const supabase = getSupabaseClient()

  const netAmount = grossEarnings + carryForwardAmount // No platform fee deduction for now
  const payoutDate = round === 'mid-month'
    ? (() => {
        const d = new Date(periodEnd)
        const settings_sync = { mid_month_payout_day: 16 }
        return formatDate(new Date(d.getFullYear(), d.getMonth(), settings_sync.mid_month_payout_day))
      })()
    : (() => {
        const d = new Date(periodEnd)
        return formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 1))
      })()

  // Create payout record
  const { data: payout, error: payoutError } = await supabase
    .from('payouts')
    .insert({
      staff_id: profileId,
      period_start: periodStart,
      period_end: periodEnd,
      gross_earnings: grossEarnings + carryForwardAmount,
      platform_fee: 0,
      net_amount: netAmount,
      total_jobs: totalJobs,
      status: 'pending',
      payout_round: round,
      is_carry_forward: carryForwardAmount > 0,
      carry_forward_amount: carryForwardAmount,
      notes: `Auto-generated: ${round} cutoff ${periodEnd}, payout ${payoutDate}`,
    })
    .select('id')
    .single()

  if (payoutError) {
    console.error(`[Payout] Error creating payout for ${profileId}:`, payoutError)
    return null
  }

  // Link jobs to payout
  if (jobIds.length > 0 && payout) {
    const payoutJobRows = jobIds.map(jobId => ({
      payout_id: payout.id,
      job_id: jobId,
      amount: 0,
    }))

    const { error: linkError } = await supabase
      .from('payout_jobs')
      .insert(payoutJobRows)

    if (linkError) {
      console.error(`[Payout] Error linking jobs to payout ${payout.id}:`, linkError)
    }
  }

  // Check if staff has bank account — notify if missing
  const { data: bankAccounts } = await supabase
    .from('bank_accounts')
    .select('id')
    .eq('staff_id', profileId)
    .limit(1)

  if (!bankAccounts || bankAccounts.length === 0) {
    await supabase.from('notifications').insert({
      user_id: profileId,
      title: 'กรุณาเพิ่มบัญชีธนาคาร',
      message: 'คุณมียอดรอจ่ายแต่ยังไม่มีบัญชีธนาคาร กรุณาเพิ่มที่หน้าโปรไฟล์',
      type: 'payout',
      is_read: false,
    })
    console.log(`[Payout] Staff ${profileId} has no bank account — notification sent`)
  }

  console.log(`[Payout] Created payout ${payout?.id} for staff ${profileId}: ฿${netAmount} (${totalJobs} jobs, round=${round})`)
  return payout?.id || null
}

// ============================================================
// Core: Handle Carry Forward (below minimum)
// ============================================================

async function handleCarryForward(
  staffId: string,
  profileId: string,
  amount: number,
  round: 'mid-month' | 'end-month',
  periodMonth: string
): Promise<void> {
  const supabase = getSupabaseClient()

  // Create in-app notification for staff
  await supabase.from('notifications').insert({
    user_id: profileId,
    title: 'ยกยอดไปรอบถัดไป',
    message: `ยอดรายได้ ฿${amount.toLocaleString('th-TH')} ต่ำกว่าขั้นต่ำ จะยกยอดไปรอบถัดไป`,
    type: 'payout',
    is_read: false,
  })

  // Record in payout_notifications to prevent duplicates
  await supabase.from('payout_notifications').upsert({
    staff_id: profileId,
    notification_type: 'payout_carry_forward',
    payout_round: round,
    period_month: periodMonth,
  }, { onConflict: 'staff_id,notification_type,payout_round,period_month' })

  console.log(`[Payout] Carry forward ฿${amount} for staff ${profileId} (${round} ${periodMonth})`)
}

// ============================================================
// Notifications: Pre-cutoff & Pre-payout reminders
// ============================================================

async function isDuplicateNotification(
  profileId: string,
  notificationType: string,
  round: string,
  periodMonth: string
): Promise<boolean> {
  const supabase = getSupabaseClient()
  const { data } = await supabase
    .from('payout_notifications')
    .select('id')
    .eq('staff_id', profileId)
    .eq('notification_type', notificationType)
    .eq('payout_round', round)
    .eq('period_month', periodMonth)
    .limit(1)
  return (data?.length || 0) > 0
}

async function recordNotification(
  profileId: string,
  notificationType: string,
  round: string,
  periodMonth: string
): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.from('payout_notifications').upsert({
    staff_id: profileId,
    notification_type: notificationType,
    payout_round: round,
    period_month: periodMonth,
  }, { onConflict: 'staff_id,notification_type,payout_round,period_month' })
}

async function sendInAppNotification(
  userId: string,
  title: string,
  message: string,
  type: string = 'payout'
): Promise<void> {
  const supabase = getSupabaseClient()
  await supabase.from('notifications').insert({
    user_id: userId,
    title,
    message,
    type,
    is_read: false,
  })
}

async function getAdminIds(): Promise<string[]> {
  const supabase = getSupabaseClient()
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'ADMIN')
  return data?.map(a => a.id) || []
}

/**
 * Notify staff + admin 1 day before cutoff
 */
async function notifyUpcomingCutoff(
  round: 'mid-month' | 'end-month',
  periodMonth: string,
  settings: PayoutSettings
): Promise<number> {
  const supabase = getSupabaseClient()
  let sent = 0

  const cutoffDay = round === 'mid-month' ? settings.mid_month_cutoff_day : settings.end_month_cutoff_day
  const roundLabel = round === 'mid-month' ? 'งวดแรก' : 'งวดหลัง'

  // Get relevant staff
  const scheduleFilter = round === 'mid-month' ? 'bi-monthly' : undefined
  let query = supabase
    .from('staff')
    .select('id, profile_id, name_th, payout_schedule')
    .eq('is_active', true)
    .not('profile_id', 'is', null)

  if (scheduleFilter) {
    query = query.eq('payout_schedule', scheduleFilter)
  }

  const { data: staffList } = await query

  // Notify each staff
  for (const staff of staffList || []) {
    const isDup = await isDuplicateNotification(staff.profile_id, 'payout_upcoming', round, periodMonth)
    if (isDup) continue

    await sendInAppNotification(
      staff.profile_id,
      `พรุ่งนี้ตัดรอบจ่ายเงิน${roundLabel}`,
      `วันที่ ${cutoffDay} จะเป็นวันตัดรอบ${roundLabel} ยอดรายได้จะถูกสรุปเพื่อจ่ายเงิน`
    )
    await recordNotification(staff.profile_id, 'payout_upcoming', round, periodMonth)
    sent++
  }

  // Notify admins
  const adminIds = await getAdminIds()
  const staffCount = staffList?.length || 0
  for (const adminId of adminIds) {
    const isDup = await isDuplicateNotification(adminId, 'payout_upcoming', round, periodMonth)
    if (isDup) continue

    await sendInAppNotification(
      adminId,
      `พรุ่งนี้ตัดรอบจ่ายเงิน${roundLabel}`,
      `วันที่ ${cutoffDay} ตัดรอบ${roundLabel} มี Staff ${staffCount} คน`
    )
    await recordNotification(adminId, 'payout_upcoming', round, periodMonth)
    sent++
  }

  return sent
}

/**
 * Notify admin 1 day before payout day
 */
async function notifyUpcomingPayout(
  round: 'mid-month' | 'end-month',
  periodMonth: string,
  settings: PayoutSettings
): Promise<number> {
  const supabase = getSupabaseClient()
  let sent = 0

  const roundLabel = round === 'mid-month' ? 'งวดแรก' : 'งวดหลัง'
  const payoutDay = round === 'mid-month' ? settings.mid_month_payout_day : settings.end_month_payout_day

  // Count pending payouts for this round
  const { data: pendingPayouts } = await supabase
    .from('payouts')
    .select('id, net_amount')
    .eq('status', 'pending')
    .eq('payout_round', round)

  const staffCount = pendingPayouts?.length || 0
  const totalAmount = pendingPayouts?.reduce((sum, p) => sum + (Number(p.net_amount) || 0), 0) || 0

  if (staffCount === 0) return 0

  const adminIds = await getAdminIds()
  for (const adminId of adminIds) {
    const isDup = await isDuplicateNotification(adminId, 'payout_due_reminder', round, periodMonth)
    if (isDup) continue

    await sendInAppNotification(
      adminId,
      `พรุ่งนี้ถึงกำหนดจ่ายเงิน${roundLabel}`,
      `วันที่ ${payoutDay} ถึงกำหนดจ่ายเงิน${roundLabel} Staff ${staffCount} คน ยอดรวม ฿${totalAmount.toLocaleString('th-TH')}`
    )
    await recordNotification(adminId, 'payout_due_reminder', round, periodMonth)
    sent++
  }

  return sent
}

// ============================================================
// Main: Process Payout Cutoff (runs daily)
// ============================================================

export async function processPayoutCutoff(overrideDate?: Date): Promise<{
  payoutsCreated: number
  carryForwards: number
  notificationsSent: number
}> {
  const supabase = getSupabaseClient()
  const settings = await getPayoutSettings()

  // Use ICT timezone (UTC+7)
  const now = overrideDate || new Date()
  const ictOffset = 7 * 60 * 60 * 1000
  const ictNow = new Date(now.getTime() + ictOffset)
  const currentDay = ictNow.getUTCDate()
  const currentMonth = ictNow.getUTCMonth()
  const currentYear = ictNow.getUTCFullYear()
  const periodMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`

  let payoutsCreated = 0
  let carryForwards = 0
  let notificationsSent = 0

  console.log(`[Payout] Running cutoff check for day ${currentDay} (${periodMonth})`)

  // ── Notifications: 1 day before cutoff ──
  if (currentDay === settings.mid_month_cutoff_day - 1) {
    // Day 9: notify upcoming mid-month cutoff
    const sent = await notifyUpcomingCutoff('mid-month', periodMonth, settings)
    notificationsSent += sent
    if (sent > 0) console.log(`[Payout] Sent ${sent} pre-cutoff notifications (mid-month)`)
  }
  if (currentDay === settings.end_month_cutoff_day - 1) {
    // Day 24: notify upcoming end-month cutoff
    const sent = await notifyUpcomingCutoff('end-month', periodMonth, settings)
    notificationsSent += sent
    if (sent > 0) console.log(`[Payout] Sent ${sent} pre-cutoff notifications (end-month)`)
  }

  // ── Notifications: 1 day before payout ──
  if (currentDay === settings.mid_month_payout_day - 1) {
    // Day 15: notify upcoming mid-month payout
    const sent = await notifyUpcomingPayout('mid-month', periodMonth, settings)
    notificationsSent += sent
    if (sent > 0) console.log(`[Payout] Sent ${sent} pre-payout notifications (mid-month)`)
  }
  const lastDayOfMonth = getLastDayOfMonth(currentYear, currentMonth)
  if (currentDay === lastDayOfMonth && settings.end_month_payout_day === 1) {
    // Last day of month: notify upcoming end-month payout (pays on 1st of next month)
    const sent = await notifyUpcomingPayout('end-month', periodMonth, settings)
    notificationsSent += sent
    if (sent > 0) console.log(`[Payout] Sent ${sent} pre-payout notifications (end-month)`)
  }

  // NOTE: jobs.staff_id FK references profiles.id, so we use profile_id for job queries

  // ── Mid-month cutoff (day 10) ──
  if (currentDay === settings.mid_month_cutoff_day) {
    console.log('[Payout] Processing MID-MONTH cutoff...')

    // Get bi-monthly staff only (with valid profile_id)
    const { data: staffList } = await supabase
      .from('staff')
      .select('id, profile_id, name_th, payout_schedule')
      .eq('payout_schedule', 'bi-monthly')
      .eq('is_active', true)
      .not('profile_id', 'is', null)

    if (staffList && staffList.length > 0) {
      // Period: 26th of previous month to 10th of current month
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
      const periodStart = formatDate(new Date(prevYear, prevMonth, 26))
      const periodEnd = formatDate(new Date(currentYear, currentMonth, settings.mid_month_cutoff_day))

      for (const staff of staffList) {
        try {
          // Use profile_id for job queries (jobs.staff_id = profiles.id)
          const earnings = await calculateStaffEarnings(staff.profile_id, periodStart, periodEnd)

          if (earnings.totalEarnings >= settings.minimum_payout_amount) {
            await createPayoutRecord(
              staff.id, staff.profile_id, earnings.totalEarnings,
              earnings.totalJobs, earnings.jobIds,
              periodStart, periodEnd, 'mid-month'
            )
            payoutsCreated++
          } else if (earnings.totalEarnings > 0 && settings.carry_forward_enabled) {
            await handleCarryForward(staff.id, staff.profile_id, earnings.totalEarnings, 'mid-month', periodMonth)
            carryForwards++
          }
        } catch (err) {
          console.error(`[Payout] Error processing staff ${staff.name_th}:`, err)
        }
      }
    }

    console.log(`[Payout] Mid-month done: ${payoutsCreated} payouts, ${carryForwards} carry-forwards`)
  }

  // ── End-month cutoff (day 25) ──
  if (currentDay === settings.end_month_cutoff_day) {
    console.log('[Payout] Processing END-MONTH cutoff...')

    // Get all active staff (with valid profile_id)
    const { data: staffList } = await supabase
      .from('staff')
      .select('id, profile_id, name_th, payout_schedule')
      .eq('is_active', true)
      .not('profile_id', 'is', null)

    if (staffList && staffList.length > 0) {
      for (const staff of staffList) {
        try {
          let periodStart: string
          const periodEnd = formatDate(new Date(currentYear, currentMonth, settings.end_month_cutoff_day))

          if (staff.payout_schedule === 'bi-monthly') {
            // Bi-monthly end: 11th to 25th
            periodStart = formatDate(new Date(currentYear, currentMonth, 11))
          } else {
            // Monthly: 26th of prev month to 25th of current month
            const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
            const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
            periodStart = formatDate(new Date(prevYear, prevMonth, 26))
          }

          // Use profile_id for job queries (jobs.staff_id = profiles.id)
          const earnings = await calculateStaffEarnings(staff.profile_id, periodStart, periodEnd)

          // Check for carry-forward from mid-month (bi-monthly staff who had below minimum)
          let carryForwardAmount = 0
          if (staff.payout_schedule === 'bi-monthly') {
            const { data: midMonthCarry } = await supabase
              .from('payout_notifications')
              .select('id')
              .eq('staff_id', staff.profile_id)
              .eq('notification_type', 'payout_carry_forward')
              .eq('payout_round', 'mid-month')
              .eq('period_month', periodMonth)

            if (midMonthCarry && midMonthCarry.length > 0) {
              const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
              const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
              const midStart = formatDate(new Date(prevYear, prevMonth, 26))
              const midEnd = formatDate(new Date(currentYear, currentMonth, settings.mid_month_cutoff_day))
              const midEarnings = await calculateStaffEarnings(staff.profile_id, midStart, midEnd)
              carryForwardAmount = midEarnings.totalEarnings
            }
          }

          const totalAmount = earnings.totalEarnings + carryForwardAmount

          if (totalAmount >= settings.minimum_payout_amount) {
            await createPayoutRecord(
              staff.id, staff.profile_id, earnings.totalEarnings,
              earnings.totalJobs, earnings.jobIds,
              periodStart, periodEnd, 'end-month', carryForwardAmount
            )
            payoutsCreated++
          } else if (totalAmount > 0 && settings.carry_forward_enabled) {
            await handleCarryForward(staff.id, staff.profile_id, totalAmount, 'end-month', periodMonth)
            carryForwards++
          }
        } catch (err) {
          console.error(`[Payout] Error processing staff ${staff.name_th}:`, err)
        }
      }
    }

    console.log(`[Payout] End-month done: ${payoutsCreated} payouts, ${carryForwards} carry-forwards`)
  }

  return { payoutsCreated, carryForwards, notificationsSent }
}
