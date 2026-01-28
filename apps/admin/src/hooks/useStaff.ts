import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staffService, Staff, CreateStaffData } from '../services/staffService'
import { toast } from 'react-hot-toast'

// Get all staff with filters
export function useStaff(filters?: {
  status?: string
  skill?: string
  search?: string
}) {
  return useQuery({
    queryKey: ['staff', filters],
    queryFn: () => staffService.getAllStaff(filters),
    staleTime: 1000 * 60, // 1 minute
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