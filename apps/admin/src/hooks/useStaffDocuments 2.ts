import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  staffDocumentService,
  StaffDocument,
  CreateDocumentData,
  UpdateDocumentData,
} from '../services/staffDocumentService'
import { toast } from 'react-hot-toast'

// Get all documents for a staff member
export function useStaffDocuments(staffId: string) {
  return useQuery({
    queryKey: ['staff-documents', staffId],
    queryFn: () => staffDocumentService.getStaffDocuments(staffId),
    enabled: !!staffId,
    staleTime: 1000 * 60, // 1 minute
  })
}

// Get a single document
export function useDocument(documentId: string) {
  return useQuery({
    queryKey: ['document', documentId],
    queryFn: () => staffDocumentService.getDocumentById(documentId),
    enabled: !!documentId,
  })
}

// Get document statistics
export function useDocumentStats(staffId: string) {
  return useQuery({
    queryKey: ['document-stats', staffId],
    queryFn: () => staffDocumentService.getDocumentStats(staffId),
    enabled: !!staffId,
    staleTime: 1000 * 60, // 1 minute
  })
}

// Get pending documents (for admin)
export function usePendingDocuments() {
  return useQuery({
    queryKey: ['pending-documents'],
    queryFn: () => staffDocumentService.getPendingDocuments(),
    staleTime: 1000 * 30, // 30 seconds
  })
}

// Upload document mutation
export function useUploadDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateDocumentData) => staffDocumentService.uploadDocument(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff-documents', data.staff_id] })
      queryClient.invalidateQueries({ queryKey: ['document-stats', data.staff_id] })
      queryClient.invalidateQueries({ queryKey: ['pending-documents'] })
      toast.success('อัปโหลดเอกสารสำเร็จ')
    },
    onError: (error: any) => {
      toast.error(error.message || 'เกิดข้อผิดพลาดในการอัปโหลดเอกสาร')
    },
  })
}

// Update document status mutation
export function useUpdateDocumentStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      documentId,
      updates,
      adminId,
    }: {
      documentId: string
      updates: UpdateDocumentData
      adminId?: string
    }) => staffDocumentService.updateDocumentStatus(documentId, updates, adminId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff-documents', data.staff_id] })
      queryClient.invalidateQueries({ queryKey: ['document', data.id] })
      queryClient.invalidateQueries({ queryKey: ['document-stats', data.staff_id] })
      queryClient.invalidateQueries({ queryKey: ['pending-documents'] })

      // Show success message based on status
      if (data.verification_status === 'verified') {
        toast.success('อนุมัติเอกสารสำเร็จ')
      } else if (data.verification_status === 'rejected') {
        toast.success('ปฏิเสธเอกสารสำเร็จ')
      } else {
        toast.success('อัปเดตสถานะเอกสารสำเร็จ')
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ')
    },
  })
}

// Delete document mutation
export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      documentId,
      staffId,
    }: {
      documentId: string
      staffId: string
    }) => staffDocumentService.deleteDocument(documentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff-documents', variables.staffId] })
      queryClient.invalidateQueries({ queryKey: ['document-stats', variables.staffId] })
      queryClient.invalidateQueries({ queryKey: ['pending-documents'] })
      toast.success('ลบเอกสารสำเร็จ')
    },
    onError: (error: any) => {
      toast.error(error.message || 'เกิดข้อผิดพลาดในการลบเอกสาร')
    },
  })
}

// Download document
export function useDownloadDocument() {
  return useMutation({
    mutationFn: async ({
      documentId,
      fileName,
    }: {
      documentId: string
      fileName: string
    }) => {
      const blob = await staffDocumentService.downloadDocument(documentId)

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    onSuccess: () => {
      toast.success('ดาวน์โหลดเอกสารสำเร็จ')
    },
    onError: (error: any) => {
      toast.error(error.message || 'เกิดข้อผิดพลาดในการดาวน์โหลด')
    },
  })
}
