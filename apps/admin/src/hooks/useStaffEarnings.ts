import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface Payout {
  id: string
  staff_id: string
  period_start: string
  period_end: string
  gross_earnings: number
  platform_fee: number
  net_amount: number
  total_jobs: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  transfer_reference?: string
  transfer_slip_url?: string
  transferred_at?: string
  created_at: string
  updated_at: string
}

export interface PayoutJob {
  id: string
  payout_id: string
  job_id: string
  amount: number
  job?: {
    id: string
    service_name: string
    scheduled_date: string
    status: string
  }
}

export interface EarningsSummary {
  total_earnings: number
  pending_payout: number
  paid_this_month: number
  total_paid: number
}

// Get staff earnings summary (from jobs + payouts)
export function useStaffEarningsSummary(staffId: string) {
  return useQuery({
    queryKey: ['staff', staffId, 'earnings', 'summary'],
    queryFn: async (): Promise<EarningsSummary> => {
      // Get staff profile_id from staff table
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('profile_id')
        .eq('id', staffId)
        .single()

      if (staffError) throw staffError
      if (!staffData?.profile_id) {
        return {
          total_earnings: 0,
          pending_payout: 0,
          paid_this_month: 0,
          total_paid: 0,
        }
      }

      const profileId = staffData.profile_id

      // Get total earnings from completed jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('staff_earnings')
        .eq('staff_id', profileId)
        .eq('status', 'completed')

      const totalEarningsFromJobs = (jobs || [])
        .reduce((sum, j) => sum + (parseFloat(j.staff_earnings) || 0), 0)

      // Get payouts data
      const { data: payouts } = await supabase
        .from('payouts')
        .select('*')
        .eq('staff_id', profileId)
        .order('period_start', { ascending: false })

      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      const totalPaid = (payouts || [])
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + parseFloat(p.net_amount || 0), 0)

      const paidThisMonth = (payouts || [])
        .filter(p => {
          if (p.status !== 'completed' || !p.transferred_at) return false
          const transferDate = new Date(p.transferred_at)
          return transferDate.getMonth() === currentMonth && transferDate.getFullYear() === currentYear
        })
        .reduce((sum, p) => sum + parseFloat(p.net_amount || 0), 0)

      // Pending = total earnings from jobs - total already paid out
      const pendingPayout = totalEarningsFromJobs - totalPaid

      return {
        total_earnings: totalEarningsFromJobs,
        pending_payout: Math.max(0, pendingPayout),
        paid_this_month: paidThisMonth,
        total_paid: totalPaid,
      }
    },
    enabled: !!staffId,
    staleTime: 1000 * 60, // 1 minute
  })
}

// Get staff payout history
export function useStaffPayouts(staffId: string) {
  return useQuery({
    queryKey: ['staff', staffId, 'payouts'],
    queryFn: async (): Promise<Payout[]> => {
      // Get staff profile_id from staff table
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('profile_id')
        .eq('id', staffId)
        .single()

      if (staffError) throw staffError
      if (!staffData?.profile_id) return []

      const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('staff_id', staffData.profile_id)
        .order('period_start', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!staffId,
    staleTime: 1000 * 60, // 1 minute
  })
}

// Get jobs for a specific payout
export function usePayoutJobs(payoutId: string) {
  return useQuery({
    queryKey: ['payout', payoutId, 'jobs'],
    queryFn: async (): Promise<PayoutJob[]> => {
      const { data, error } = await supabase
        .from('payout_jobs')
        .select(`
          *,
          job:jobs(
            id,
            service_name,
            scheduled_date,
            status
          )
        `)
        .eq('payout_id', payoutId)

      if (error) throw error
      return data || []
    },
    enabled: !!payoutId,
    staleTime: 1000 * 60, // 1 minute
  })
}
