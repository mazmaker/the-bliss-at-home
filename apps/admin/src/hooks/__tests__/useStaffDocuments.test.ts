import { describe, it, expect, vi } from 'vitest'

// Mock dependencies
vi.mock('../../services/staffDocumentService', () => ({
  staffDocumentService: {
    getStaffDocuments: vi.fn(),
    getDocumentById: vi.fn(),
    getDocumentStats: vi.fn(),
    getPendingDocuments: vi.fn(),
    uploadDocument: vi.fn(),
    updateDocumentStatus: vi.fn(),
    deleteDocument: vi.fn(),
    downloadDocument: vi.fn(),
  },
}))

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: true, error: null })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isLoading: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}))

import {
  useStaffDocuments,
  useDocument,
  useDocumentStats,
  usePendingDocuments,
  useUploadDocument,
  useUpdateDocumentStatus,
  useDeleteDocument,
  useDownloadDocument,
} from '../useStaffDocuments'

describe('useStaffDocuments hooks', () => {
  it('exports useStaffDocuments as a function', () => {
    expect(typeof useStaffDocuments).toBe('function')
  })

  it('exports useDocument as a function', () => {
    expect(typeof useDocument).toBe('function')
  })

  it('exports useDocumentStats as a function', () => {
    expect(typeof useDocumentStats).toBe('function')
  })

  it('exports usePendingDocuments as a function', () => {
    expect(typeof usePendingDocuments).toBe('function')
  })

  it('exports useUploadDocument as a function', () => {
    expect(typeof useUploadDocument).toBe('function')
  })

  it('exports useUpdateDocumentStatus as a function', () => {
    expect(typeof useUpdateDocumentStatus).toBe('function')
  })

  it('exports useDeleteDocument as a function', () => {
    expect(typeof useDeleteDocument).toBe('function')
  })

  it('exports useDownloadDocument as a function', () => {
    expect(typeof useDownloadDocument).toBe('function')
  })
})
