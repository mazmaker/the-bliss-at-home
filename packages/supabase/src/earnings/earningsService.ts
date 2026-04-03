/**
 * Earnings & Payout Service
 * Handles earnings calculations and payout management
 */

import { supabase } from '../auth/supabaseClient'
import type {
  Payout,
  BankAccount,
  EarningsSummary,
  DailyEarning,
  ServiceEarning,
  PayoutSchedule,
  PayoutSettings,
  NextPayoutInfo,
  PayoutRound,
} from './types'

/**
 * Get earnings summary for a staff member
 */
export async function getEarningsSummary(staffId: string): Promise<EarningsSummary> {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Calculate week start (Sunday)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekStartStr = weekStart.toISOString().split('T')[0]

  // Calculate month start
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthStartStr = monthStart.toISOString().split('T')[0]

  // Fetch completed jobs with total earnings and duration (including extensions)
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('staff_earnings, duration_minutes, total_staff_earnings, total_duration_minutes, scheduled_date, status')
    .eq('staff_id', staffId)
    .eq('status', 'completed')
    .gte('scheduled_date', monthStartStr)

  if (error) {
    console.error('Error fetching earnings:', error)
    throw error
  }

  // Calculate summaries
  let todayEarnings = 0, todayJobs = 0, todayHours = 0
  let weekEarnings = 0, weekJobs = 0, weekHours = 0
  let monthEarnings = 0, monthJobs = 0, monthHours = 0

  jobs?.forEach((job) => {
    const jobDate = job.scheduled_date
    // Use total earnings/duration if available, fallback to base values
    const earnings = job.total_staff_earnings || job.staff_earnings || 0
    const hours = (job.total_duration_minutes || job.duration_minutes || 0) / 60

    // Month totals
    monthEarnings += earnings
    monthJobs += 1
    monthHours += hours

    // Week totals
    if (jobDate >= weekStartStr) {
      weekEarnings += earnings
      weekJobs += 1
      weekHours += hours
    }

    // Today totals
    if (jobDate === todayStr) {
      todayEarnings += earnings
      todayJobs += 1
      todayHours += hours
    }
  })

  // Get pending payout amount
  const { data: pendingPayouts } = await supabase
    .from('payouts')
    .select('net_amount')
    .eq('staff_id', staffId)
    .eq('status', 'pending')

  const pendingPayout = pendingPayouts?.reduce((sum, p) => sum + (p.net_amount || 0), 0) || 0

  // Get average rating
  const { data: ratings } = await supabase
    .from('job_ratings')
    .select('rating')
    .eq('staff_id', staffId)

  const avgRating = ratings?.length
    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
    : 0

  return {
    today_earnings: todayEarnings,
    today_jobs: todayJobs,
    today_hours: todayHours,
    week_earnings: weekEarnings,
    week_jobs: weekJobs,
    week_hours: weekHours,
    month_earnings: monthEarnings,
    month_jobs: monthJobs,
    month_hours: monthHours,
    pending_payout: pendingPayout,
    average_per_job: monthJobs > 0 ? monthEarnings / monthJobs : 0,
    average_rating: avgRating,
  }
}

/**
 * Get daily earnings for a date range
 */
export async function getDailyEarnings(
  staffId: string,
  startDate: string,
  endDate: string
): Promise<DailyEarning[]> {
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('staff_earnings, duration_minutes, total_staff_earnings, total_duration_minutes, scheduled_date')
    .eq('staff_id', staffId)
    .eq('status', 'completed')
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date', { ascending: false })

  if (error) {
    console.error('Error fetching daily earnings:', error)
    throw error
  }

  // Group by date
  const dailyMap = new Map<string, DailyEarning>()

  // Initialize all dates in range
  const start = new Date(startDate)
  const end = new Date(endDate)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    dailyMap.set(dateStr, {
      date: dateStr,
      earnings: 0,
      jobs: 0,
      hours: 0,
    })
  }

  // Fill in actual earnings (including extensions)
  jobs?.forEach((job) => {
    const existing = dailyMap.get(job.scheduled_date)
    if (existing) {
      existing.earnings += job.total_staff_earnings || job.staff_earnings || 0
      existing.jobs += 1
      existing.hours += (job.total_duration_minutes || job.duration_minutes || 0) / 60
    }
  })

  return Array.from(dailyMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}

/**
 * Get earnings breakdown by service type
 */
export async function getServiceEarnings(
  staffId: string,
  startDate: string,
  endDate: string
): Promise<ServiceEarning[]> {
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('service_name, service_name_en, staff_earnings, total_staff_earnings')
    .eq('staff_id', staffId)
    .eq('status', 'completed')
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)

  if (error) {
    console.error('Error fetching service earnings:', error)
    throw error
  }

  // Group by service
  const serviceMap = new Map<string, ServiceEarning>()
  let totalEarnings = 0

  jobs?.forEach((job) => {
    const key = job.service_name
    const existing = serviceMap.get(key)
    const earnings = job.total_staff_earnings || job.staff_earnings || 0
    totalEarnings += earnings

    if (existing) {
      existing.total_earnings += earnings
      existing.total_jobs += 1
    } else {
      serviceMap.set(key, {
        service_name: job.service_name,
        service_name_en: job.service_name_en,
        total_earnings: earnings,
        total_jobs: 1,
        percentage: 0,
      })
    }
  })

  // Calculate percentages
  const services = Array.from(serviceMap.values()).map((s) => ({
    ...s,
    percentage: totalEarnings > 0 ? Math.round((s.total_earnings / totalEarnings) * 100) : 0,
  }))

  return services.sort((a, b) => b.total_earnings - a.total_earnings)
}

/**
 * Get payout history for a staff member
 */
export async function getPayoutHistory(
  staffId: string,
  limit = 20
): Promise<Payout[]> {
  const { data, error } = await supabase
    .from('payouts')
    .select('*')
    .eq('staff_id', staffId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching payout history:', error)
    throw error
  }

  return data || []
}

/**
 * Get bank accounts for a staff member
 */
export async function getBankAccounts(staffId: string): Promise<BankAccount[]> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('staff_id', staffId)
    .order('is_primary', { ascending: false })

  if (error) {
    console.error('Error fetching bank accounts:', error)
    throw error
  }

  return data || []
}

/**
 * Add a new bank account
 */
export async function addBankAccount(
  staffId: string,
  bankCode: string,
  bankName: string,
  accountNumber: string,
  accountName: string,
  isPrimary = false
): Promise<BankAccount> {
  // If setting as primary, unset other primary accounts
  if (isPrimary) {
    await supabase
      .from('bank_accounts')
      .update({ is_primary: false })
      .eq('staff_id', staffId)
  }

  const { data, error } = await supabase
    .from('bank_accounts')
    .insert({
      staff_id: staffId,
      bank_code: bankCode,
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName,
      is_primary: isPrimary,
      is_verified: false,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding bank account:', error)
    throw error
  }

  return data
}

/**
 * Update bank account
 */
export async function updateBankAccount(
  accountId: string,
  updates: Partial<BankAccount>
): Promise<BankAccount> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .update(updates)
    .eq('id', accountId)
    .select()
    .single()

  if (error) {
    console.error('Error updating bank account:', error)
    throw error
  }

  return data
}

/**
 * Set bank account as primary
 */
export async function setPrimaryBankAccount(
  staffId: string,
  accountId: string
): Promise<void> {
  // Unset all primary
  await supabase
    .from('bank_accounts')
    .update({ is_primary: false })
    .eq('staff_id', staffId)

  // Set new primary
  const { error } = await supabase
    .from('bank_accounts')
    .update({ is_primary: true })
    .eq('id', accountId)

  if (error) {
    console.error('Error setting primary bank account:', error)
    throw error
  }
}

/**
 * Delete bank account
 */
export async function deleteBankAccount(accountId: string): Promise<void> {
  const { error } = await supabase
    .from('bank_accounts')
    .delete()
    .eq('id', accountId)

  if (error) {
    console.error('Error deleting bank account:', error)
    throw error
  }
}

// ============================================================
// Payout Schedule Functions
// ============================================================

/**
 * Get payout settings from payout_settings table
 */
export async function getPayoutSettings(): Promise<PayoutSettings> {
  const { data, error } = await supabase
    .from('payout_settings')
    .select('setting_key, setting_value')

  if (error) {
    console.error('Error fetching payout settings:', error)
    throw error
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

/**
 * Get staff payout schedule (bi-monthly or monthly)
 */
export async function getPayoutSchedule(profileId: string): Promise<PayoutSchedule> {
  const { data, error } = await supabase
    .from('staff')
    .select('payout_schedule')
    .eq('profile_id', profileId)
    .single()

  if (error) {
    console.error('Error fetching payout schedule:', error)
    return 'monthly' // default
  }

  return (data?.payout_schedule as PayoutSchedule) || 'monthly'
}

/**
 * Update staff payout schedule
 */
export async function updatePayoutSchedule(
  profileId: string,
  schedule: PayoutSchedule
): Promise<void> {
  const { error } = await supabase
    .from('staff')
    .update({ payout_schedule: schedule })
    .eq('profile_id', profileId)

  if (error) {
    console.error('Error updating payout schedule:', error)
    throw error
  }
}

/**
 * Calculate next payout info for staff
 */
export async function getNextPayoutInfo(profileId: string): Promise<NextPayoutInfo> {
  const schedule = await getPayoutSchedule(profileId)
  const settings = await getPayoutSettings()

  const now = new Date()
  const currentDay = now.getDate()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  let nextCutoff: Date
  let nextPayout: Date
  let nextRound: PayoutRound

  if (schedule === 'bi-monthly') {
    // Bi-monthly: check which cutoff is next
    if (currentDay <= settings.mid_month_cutoff_day) {
      // Before mid-month cutoff → next is mid-month
      nextCutoff = new Date(currentYear, currentMonth, settings.mid_month_cutoff_day)
      nextPayout = new Date(currentYear, currentMonth, settings.mid_month_payout_day)
      nextRound = 'mid-month'
    } else if (currentDay <= settings.end_month_cutoff_day) {
      // Between mid and end cutoff → next is end-month
      nextCutoff = new Date(currentYear, currentMonth, settings.end_month_cutoff_day)
      nextPayout = new Date(currentYear, currentMonth + 1, settings.end_month_payout_day)
      nextRound = 'end-month'
    } else {
      // Past end cutoff → next month mid-month
      nextCutoff = new Date(currentYear, currentMonth + 1, settings.mid_month_cutoff_day)
      nextPayout = new Date(currentYear, currentMonth + 1, settings.mid_month_payout_day)
      nextRound = 'mid-month'
    }
  } else {
    // Monthly: only end-month
    if (currentDay <= settings.end_month_cutoff_day) {
      nextCutoff = new Date(currentYear, currentMonth, settings.end_month_cutoff_day)
      nextPayout = new Date(currentYear, currentMonth + 1, settings.end_month_payout_day)
      nextRound = 'end-month'
    } else {
      nextCutoff = new Date(currentYear, currentMonth + 1, settings.end_month_cutoff_day)
      nextPayout = new Date(currentYear, currentMonth + 2, settings.end_month_payout_day)
      nextRound = 'end-month'
    }
  }

  // Calculate accumulated earnings (unpaid completed jobs)
  // First get staff_id from profile_id
  const { data: staffData } = await supabase
    .from('staff')
    .select('id')
    .eq('profile_id', profileId)
    .single()

  let accumulated = 0
  if (staffData) {
    // Get all completed jobs not yet in any payout
    const { data: jobs } = await supabase
      .from('jobs')
      .select('staff_earnings, total_staff_earnings')
      .eq('staff_id', staffData.id)
      .eq('status', 'completed')

    if (jobs) {
      // Get job IDs already in payouts
      const { data: paidJobs } = await supabase
        .from('payout_jobs')
        .select('job_id')

      const paidJobIds = new Set(paidJobs?.map((pj: { job_id: string }) => pj.job_id) || [])

      // Note: we can't filter payout_jobs by staff_id easily,
      // so we sum all completed jobs and subtract paid ones
      // Actually, let's just use a simpler approach - sum unpaid earnings
      const { data: allJobs } = await supabase
        .from('jobs')
        .select('id, staff_earnings, total_staff_earnings')
        .eq('staff_id', staffData.id)
        .eq('status', 'completed')

      allJobs?.forEach((job: { id: string; staff_earnings: number; total_staff_earnings: number | null }) => {
        if (!paidJobIds.has(job.id)) {
          accumulated += job.total_staff_earnings || job.staff_earnings || 0
        }
      })
    }
  }

  // Format as YYYY-MM-DD using local time (avoid UTC timezone shift)
  const formatDate = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  return {
    schedule,
    next_cutoff_date: formatDate(nextCutoff),
    next_payout_date: formatDate(nextPayout),
    next_round: nextRound,
    accumulated_earnings: accumulated,
  }
}

/**
 * Subscribe to payout updates
 */
export function subscribeToPayouts(
  staffId: string,
  onPayoutUpdate: (payout: Payout) => void
): () => void {
  const channel = supabase
    .channel(`payouts:${staffId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'payouts',
        filter: `staff_id=eq.${staffId}`,
      },
      (payload) => {
        if (payload.new) {
          onPayoutUpdate(payload.new as Payout)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
