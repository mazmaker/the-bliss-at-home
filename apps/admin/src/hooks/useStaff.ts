import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { staffService, Staff, CreateStaffData } from '../services/staffService'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'

// Get all staff with filters
export function useStaff(filters?: {
  status?: string
  skill?: string
  search?: string
}) {
  return useQuery({
    queryKey: ['staff', filters?.status, filters?.skill, filters?.search],
    queryFn: () => staffService.getAllStaff(filters),
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: false, // Prevent refetch on window focus to avoid input focus loss
    refetchOnMount: false, // Prevent refetch on mount since we have staleTime
    placeholderData: keepPreviousData, // Keep previous data while fetching new data to prevent unmounting components
  })
}

// Get staff by ID
export function useStaffById(id: string) {
  return useQuery({
    queryKey: ['staff', id],
    queryFn: () => staffService.getStaffById(id),
    enabled: !!id,
  })
}

// Get staff detail (comprehensive data with real job stats)
export function useStaffDetail(id: string) {
  return useQuery({
    queryKey: ['staff', 'detail', id],
    queryFn: async () => {
      const staff = await staffService.getStaffById(id)

      // Fetch real job stats using profile_id
      let totalJobs = staff.total_jobs || 0
      let completedJobs = 0
      let totalEarnings = staff.total_earnings || 0

      if (staff.profile_id) {
        const { data: jobs } = await supabase
          .from('jobs')
          .select('status, staff_earnings')
          .eq('staff_id', staff.profile_id)

        if (jobs && jobs.length > 0) {
          totalJobs = jobs.length
          completedJobs = jobs.filter(j => j.status === 'completed').length
          totalEarnings = jobs
            .filter(j => j.status === 'completed')
            .reduce((sum, j) => sum + (parseFloat(j.staff_earnings) || 0), 0)
        }
      }

      return {
        ...staff,
        total_jobs: totalJobs,
        completed_jobs: completedJobs,
        total_earnings: totalEarnings,
      }
    },
    enabled: !!id,
    staleTime: 1000 * 60, // 1 minute
  })
}

// Get staff statistics
export function useStaffStats() {
  return useQuery({
    queryKey: ['staff', 'stats'],
    queryFn: () => staffService.getStaffStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Create staff mutation
export function useCreateStaff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (staffData: CreateStaffData) => staffService.createStaff(staffData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success('เพิ่มพนักงานสำเร็จ')
    },
    onError: (error: any) => {
      toast.error(error.message || 'เกิดข้อผิดพลาดในการเพิ่มพนักงาน')
    },
  })
}

// Update staff status
export function useUpdateStaffStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Staff['status'] }) =>
      staffService.updateStaffStatus(id, status),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })

      const statusText = {
        active: 'อนุมัติ',
        pending: 'รออนุมัติ',
        inactive: 'ปิดการใช้งาน',
        suspended: 'ระงับการใช้งาน'
      }[variables.status]

      toast.success(`${statusText}พนักงานสำเร็จ`)
    },
    onError: (error: any) => {
      toast.error(error.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ')
    },
  })
}

// Update staff profile
export function useUpdateStaff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateStaffData> }) =>
      staffService.updateStaff(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success('อัปเดตข้อมูลพนักงานสำเร็จ')
    },
    onError: (error: any) => {
      toast.error(error.message || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล')
    },
  })
}

// Generate LINE invitation
export function useGenerateLineInvite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (staffData: CreateStaffData) => staffService.generateLineInvite(staffData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success('สร้าง LINE Invitation สำเร็จ')
    },
    onError: (error: any) => {
      toast.error(error.message || 'เกิดข้อผิดพลาดในการสร้าง LINE Invitation')
    },
  })
}