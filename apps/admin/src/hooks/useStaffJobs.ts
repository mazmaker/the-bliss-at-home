import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface Job {
  id: string
  booking_id?: string
  customer_id: string
  customer_name: string
  address: string
  service_name: string
  scheduled_date: string
  scheduled_time: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  amount: number
  staff_earnings: number
  staff_id: string
  created_at: string
  updated_at: string
  notes?: string
  provider_preference?: string | null
}

export interface JobsStats {
  total: number
  pending: number
  confirmed: number
  in_progress: number
  completed: number
  cancelled: number
}

// Get jobs for a specific staff member
export function useStaffJobs(staffId: string, filters?: {
  status?: string
  dateFrom?: string
  dateTo?: string
}) {
  return useQuery({
    queryKey: ['staff', staffId, 'jobs', filters],
    queryFn: async (): Promise<Job[]> => {
      // Get staff profile_id from staff table
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('profile_id')
        .eq('id', staffId)
        .single()

      if (staffError) throw staffError
      if (!staffData?.profile_id) return []

      // Build query
      let query = supabase
        .from('jobs')
        .select('*')
        .eq('staff_id', staffData.profile_id)
        .order('scheduled_date', { ascending: true })

      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      if (filters?.dateFrom) {
        query = query.gte('scheduled_date', filters.dateFrom)
      }

      if (filters?.dateTo) {
        query = query.lte('scheduled_date', filters.dateTo)
      }

      const { data, error } = await query

      if (error) throw error
      const jobs = data || []

      // Batch-fetch provider_preference from bookings
      const bookingIds = [...new Set(jobs.map((j: any) => j.booking_id).filter(Boolean))]
      if (bookingIds.length > 0) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('id, provider_preference')
          .in('id', bookingIds)
        const prefMap = new Map((bookings || []).map(b => [b.id, b.provider_preference]))
        return jobs.map((j: any) => ({ ...j, provider_preference: prefMap.get(j.booking_id) || null }))
      }

      return jobs
    },
    enabled: !!staffId,
    staleTime: 1000 * 60, // 1 minute
  })
}

// Get jobs statistics for a staff member
export function useStaffJobsStats(staffId: string) {
  return useQuery({
    queryKey: ['staff', staffId, 'jobs', 'stats'],
    queryFn: async (): Promise<JobsStats> => {
      // Get staff profile_id from staff table
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('profile_id')
        .eq('id', staffId)
        .single()

      if (staffError) throw staffError
      if (!staffData?.profile_id) {
        return {
          total: 0,
          pending: 0,
          confirmed: 0,
          in_progress: 0,
          completed: 0,
          cancelled: 0,
        }
      }

      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('status')
        .eq('staff_id', staffData.profile_id)

      if (error) throw error

      const stats: JobsStats = {
        total: jobs?.length || 0,
        pending: jobs?.filter(j => j.status === 'pending').length || 0,
        confirmed: jobs?.filter(j => j.status === 'confirmed').length || 0,
        in_progress: jobs?.filter(j => j.status === 'in_progress').length || 0,
        completed: jobs?.filter(j => j.status === 'completed').length || 0,
        cancelled: jobs?.filter(j => j.status === 'cancelled').length || 0,
      }

      return stats
    },
    enabled: !!staffId,
    staleTime: 1000 * 60, // 1 minute
  })
}
