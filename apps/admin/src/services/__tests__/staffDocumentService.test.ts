import { describe, it, expect, vi, beforeEach } from 'vitest'

// Setup mocks with vi.hoisted
const {
  mockFrom,
  mockSelect,
  mockEq,
  mockOrder,
  mockSingle,
  mockUpdate,
  mockInsert,
  mockDelete,
  mockStorageFrom,
  mockUpload,
  mockGetPublicUrl,
  mockRemove,
} = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockEq = vi.fn()
  const mockOrder = vi.fn()
  const mockSelect = vi.fn()
  const mockUpdate = vi.fn()
  const mockInsert = vi.fn()
  const mockDelete = vi.fn()

  const chain = () => ({
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    single: mockSingle,
    update: mockUpdate,
    insert: mockInsert,
    delete: mockDelete,
  })

  mockSelect.mockImplementation(() => chain())
  mockEq.mockImplementation(() => chain())
  mockOrder.mockImplementation(() => chain())
  mockSingle.mockImplementation(() => chain())
  mockUpdate.mockImplementation(() => chain())
  mockInsert.mockImplementation(() => chain())
  mockDelete.mockImplementation(() => chain())

  const mockFrom = vi.fn(() => chain())

  // Storage mocks
  const mockUpload = vi.fn()
  const mockGetPublicUrl = vi.fn()
  const mockRemove = vi.fn()
  const mockStorageFrom = vi.fn(() => ({
    upload: mockUpload,
    getPublicUrl: mockGetPublicUrl,
    remove: mockRemove,
  }))

  return {
    mockFrom, mockSelect, mockEq, mockOrder, mockSingle,
    mockUpdate, mockInsert, mockDelete,
    mockStorageFrom, mockUpload, mockGetPublicUrl, mockRemove,
  }
})

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    storage: {
      from: mockStorageFrom,
    },
  },
}))

vi.mock('@bliss/supabase/notifications/lineMessagingService', () => ({
  lineMessagingService: {
    notifyAdminNewDocument: vi.fn().mockResolvedValue(undefined),
    notifyStaffDocumentVerified: vi.fn().mockResolvedValue(undefined),
    notifyStaffDocumentRejected: vi.fn().mockResolvedValue(undefined),
  },
}))

import { staffDocumentService } from '../staffDocumentService'
import type { DocumentType, DocumentStatus } from '../staffDocumentService'

describe('staffDocumentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('exports', () => {
    it('should export staffDocumentService instance', () => {
      expect(staffDocumentService).toBeDefined()
      expect(typeof staffDocumentService.getStaffDocuments).toBe('function')
      expect(typeof staffDocumentService.getDocumentById).toBe('function')
      expect(typeof staffDocumentService.uploadDocument).toBe('function')
      expect(typeof staffDocumentService.updateDocumentStatus).toBe('function')
      expect(typeof staffDocumentService.deleteDocument).toBe('function')
      expect(typeof staffDocumentService.getDocumentStats).toBe('function')
      expect(typeof staffDocumentService.getPendingDocuments).toBe('function')
      expect(typeof staffDocumentService.downloadDocument).toBe('function')
      expect(typeof staffDocumentService.getDocumentTypeLabel).toBe('function')
      expect(typeof staffDocumentService.getStatusLabel).toBe('function')
    })
  })

  describe('getDocumentTypeLabel', () => {
    it('should return correct labels for id_card', () => {
      const label = staffDocumentService.getDocumentTypeLabel('id_card')
      expect(label.th).toBe('สำเนาบัตรประชาชน')
      expect(label.en).toBe('ID Card')
    })

    it('should return correct labels for license', () => {
      const label = staffDocumentService.getDocumentTypeLabel('license')
      expect(label.th).toBe('ใบประกอบวิชาชีพ')
      expect(label.en).toBe('Professional License')
    })

    it('should return correct labels for certificate', () => {
      const label = staffDocumentService.getDocumentTypeLabel('certificate')
      expect(label.th).toBe('ใบรับรองการอบรม')
      expect(label.en).toBe('Training Certificate')
    })

    it('should return correct labels for bank_statement', () => {
      const label = staffDocumentService.getDocumentTypeLabel('bank_statement')
      expect(label.th).toBe('สำเนาบัญชีธนาคาร')
      expect(label.en).toBe('Bank Statement')
    })

    it('should return correct labels for other', () => {
      const label = staffDocumentService.getDocumentTypeLabel('other')
      expect(label.th).toBe('เอกสารอื่นๆ')
      expect(label.en).toBe('Other Documents')
    })
  })

  describe('getStatusLabel', () => {
    it('should return correct labels for pending', () => {
      const label = staffDocumentService.getStatusLabel('pending')
      expect(label.th).toBe('รอตรวจสอบ')
      expect(label.en).toBe('Pending')
    })

    it('should return correct labels for reviewing', () => {
      const label = staffDocumentService.getStatusLabel('reviewing')
      expect(label.th).toBe('กำลังตรวจสอบ')
      expect(label.en).toBe('Reviewing')
    })

    it('should return correct labels for verified', () => {
      const label = staffDocumentService.getStatusLabel('verified')
      expect(label.th).toBe('ยืนยันแล้ว')
      expect(label.en).toBe('Verified')
    })

    it('should return correct labels for rejected', () => {
      const label = staffDocumentService.getStatusLabel('rejected')
      expect(label.th).toBe('ถูกปฏิเสธ')
      expect(label.en).toBe('Rejected')
    })
  })

  describe('getStaffDocuments', () => {
    it('should fetch documents for a staff member', async () => {
      const mockDocs = [
        { id: 'doc-1', staff_id: 'staff-1', document_type: 'id_card', verification_status: 'pending' },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockDocs, error: null })

      const result = await staffDocumentService.getStaffDocuments('staff-1')

      expect(mockFrom).toHaveBeenCalledWith('staff_documents')
      expect(mockEq).toHaveBeenCalledWith('staff_id', 'staff-1')
      expect(result).toHaveLength(1)
    })

    it('should return empty array when no data', async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: null })

      const result = await staffDocumentService.getStaffDocuments('staff-no-docs')
      expect(result).toEqual([])
    })

    it('should throw on error', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      await expect(staffDocumentService.getStaffDocuments('bad')).rejects.toThrow()
    })
  })

  describe('getDocumentById', () => {
    it('should fetch a single document', async () => {
      const mockDoc = { id: 'doc-1', document_type: 'license' }

      mockSingle.mockResolvedValueOnce({ data: mockDoc, error: null })

      const result = await staffDocumentService.getDocumentById('doc-1')

      expect(mockFrom).toHaveBeenCalledWith('staff_documents')
      expect(mockEq).toHaveBeenCalledWith('id', 'doc-1')
      expect(result?.id).toBe('doc-1')
    })

    it('should throw on error', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      })

      await expect(staffDocumentService.getDocumentById('bad')).rejects.toThrow()
    })
  })

  describe('getPendingDocuments', () => {
    it('should fetch documents with pending status', async () => {
      const mockDocs = [
        { id: 'doc-1', verification_status: 'pending' },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockDocs, error: null })

      const result = await staffDocumentService.getPendingDocuments()

      expect(mockEq).toHaveBeenCalledWith('verification_status', 'pending')
      expect(result).toHaveLength(1)
    })
  })

  describe('getDocumentStats', () => {
    it('should calculate stats from documents', async () => {
      const mockDocs = [
        { id: '1', verification_status: 'pending' },
        { id: '2', verification_status: 'verified' },
        { id: '3', verification_status: 'rejected' },
        { id: '4', verification_status: 'reviewing' },
        { id: '5', verification_status: 'pending' },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockDocs, error: null })

      const stats = await staffDocumentService.getDocumentStats('staff-1')

      expect(stats.total).toBe(5)
      expect(stats.pending).toBe(2)
      expect(stats.verified).toBe(1)
      expect(stats.rejected).toBe(1)
      expect(stats.reviewing).toBe(1)
    })
  })

  describe('uploadDocument', () => {
    it('should reject files over 10MB', async () => {
      const largeFile = new File([''], 'large.pdf', { type: 'application/pdf' })
      Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 })

      await expect(
        staffDocumentService.uploadDocument({
          staff_id: 'staff-1',
          document_type: 'id_card',
          file: largeFile,
        })
      ).rejects.toThrow('File size exceeds maximum limit of 10MB')
    })
  })

  describe('type validation', () => {
    it('should validate DocumentType values', () => {
      const types: DocumentType[] = ['id_card', 'license', 'certificate', 'bank_statement', 'other']
      expect(types).toHaveLength(5)
    })

    it('should validate DocumentStatus values', () => {
      const statuses: DocumentStatus[] = ['pending', 'reviewing', 'verified', 'rejected']
      expect(statuses).toHaveLength(4)
    })
  })
})
