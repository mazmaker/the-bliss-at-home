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

  // Fetch completed jobs
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('staff_earnings, tip_amount, duration_minutes, scheduled_date, status')
    .eq('staff_id', staffId)
    .eq('status', 'completed')
    .gte('scheduled_date', monthStartStr)

  if (error) {
    console.error('Error fetching earnings:', error)
    throw error
  }

  // Calculate summaries
  let todayEarnings = 0, todayJobs = 0, todayTips = 0, todayHours = 0
  let weekEarnings = 0, weekJobs = 0, weekTips = 0, weekHours = 0
  let monthEarnings = 0, monthJobs = 0, monthTips = 0, monthHours = 0

  jobs?.forEach((job) => {
    const jobDate = job.scheduled_date
    const earnings = job.staff_earnings || 0
    const tips = job.tip_amount || 0
    const hours = (job.duration_minutes || 0) / 60

    // Month totals
    monthEarnings += earnings
    monthJobs += 1
    monthTips += tips
    monthHours += hours

    // Week totals
    if (jobDate >= weekStartStr) {
      weekEarnings += earnings
      weekJobs += 1
      weekTips += tips
      weekHours += hours
    }

    // Today totals
    if (jobDate === todayStr) {
      todayEarnings += earnings
      todayJobs += 1
      todayTips += tips
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
    today_tips: todayTips,
    today_hours: todayHours,
    week_earnings: weekEarnings,
    week_jobs: weekJobs,
    week_tips: weekTips,
    week_hours: weekHours,
    month_earnings: monthEarnings,
    month_jobs: monthJobs,
    month_tips: monthTips,
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
    .select('staff_earnings, tip_amount, duration_minutes, scheduled_date')
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
      tips: 0,
      jobs: 0,
      hours: 0,
    })
  }

  // Fill in actual earnings
  jobs?.forEach((job) => {
    const existing = dailyMap.get(job.scheduled_date)
    if (existing) {
      existing.earnings += job.staff_earnings || 0
      existing.tips += job.tip_amount || 0
      existing.jobs += 1
      existing.hours += (job.duration_minutes || 0) / 60
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
    .select('service_name, service_name_en, staff_earnings')
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
    const earnings = job.staff_earnings || 0
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
