import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../useSupabaseQuery', () => ({
  useSupabaseQuery: vi.fn((options: any) => ({
    data: undefined,
    isLoading: true,
    error: null,
    _queryKey: options.queryKey,
    _enabled: options.enabled,
  })),
}))

vi.mock('../../services', () => ({
  transactionService: {
    getCustomerTransactions: vi.fn(),
    getTransactionsByStatus: vi.fn(),
    getTransactionSummary: vi.fn(),
    getTransactionById: vi.fn(),
    getTransactionByNumber: vi.fn(),
  },
}))

import {
  useCustomerTransactions,
  useTransactionsByStatus,
  useTransactionSummary,
  useTransactionById,
  useTransactionByNumber,
} from '../useTransactions'
import { useSupabaseQuery } from '../useSupabaseQuery'
import { transactionService } from '../../services'

describe('useTransactions hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // useCustomerTransactions
  // ============================================
  describe('useCustomerTransactions', () => {
    it('should be a function', () => {
      expect(typeof useCustomerTransactions).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useCustomerTransactions('cust-1')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['transactions', 'customer', 'cust-1'],
          enabled: true,
        })
      )
    })

    it('should disable query when customerId is undefined', () => {
      useCustomerTransactions(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should pass queryFn that calls transactionService.getCustomerTransactions', () => {
      useCustomerTransactions('cust-1')
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(transactionService.getCustomerTransactions).toHaveBeenCalledWith(mockClient, 'cust-1')
    })
  })

  // ============================================
  // useTransactionsByStatus
  // ============================================
  describe('useTransactionsByStatus', () => {
    it('should be a function', () => {
      expect(typeof useTransactionsByStatus).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useTransactionsByStatus('cust-1', 'completed')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['transactions', 'customer', 'cust-1', 'status', 'completed'],
          enabled: true,
        })
      )
    })

    it('should disable query when customerId is undefined', () => {
      useTransactionsByStatus(undefined, 'completed')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should disable query when status is undefined', () => {
      useTransactionsByStatus('cust-1', undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should pass queryFn that calls transactionService.getTransactionsByStatus', () => {
      useTransactionsByStatus('cust-1', 'pending')
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(transactionService.getTransactionsByStatus).toHaveBeenCalledWith(mockClient, 'cust-1', 'pending')
    })
  })

  // ============================================
  // useTransactionSummary
  // ============================================
  describe('useTransactionSummary', () => {
    it('should be a function', () => {
      expect(typeof useTransactionSummary).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useTransactionSummary('cust-1')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['transactions', 'summary', 'cust-1'],
          enabled: true,
        })
      )
    })

    it('should disable query when customerId is undefined', () => {
      useTransactionSummary(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should pass queryFn that calls transactionService.getTransactionSummary', () => {
      useTransactionSummary('cust-2')
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(transactionService.getTransactionSummary).toHaveBeenCalledWith(mockClient, 'cust-2')
    })
  })

  // ============================================
  // useTransactionById
  // ============================================
  describe('useTransactionById', () => {
    it('should be a function', () => {
      expect(typeof useTransactionById).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useTransactionById('txn-1')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['transactions', 'detail', 'txn-1'],
          enabled: true,
        })
      )
    })

    it('should disable query when transactionId is undefined', () => {
      useTransactionById(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should pass queryFn that calls transactionService.getTransactionById', () => {
      useTransactionById('txn-2')
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(transactionService.getTransactionById).toHaveBeenCalledWith(mockClient, 'txn-2')
    })
  })

  // ============================================
  // useTransactionByNumber
  // ============================================
  describe('useTransactionByNumber', () => {
    it('should be a function', () => {
      expect(typeof useTransactionByNumber).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useTransactionByNumber('TXN-001')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['transactions', 'number', 'TXN-001'],
          enabled: true,
        })
      )
    })

    it('should disable query when transactionNumber is undefined', () => {
      useTransactionByNumber(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should pass queryFn that calls transactionService.getTransactionByNumber', () => {
      useTransactionByNumber('TXN-002')
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(transactionService.getTransactionByNumber).toHaveBeenCalledWith(mockClient, 'TXN-002')
    })
  })
})
