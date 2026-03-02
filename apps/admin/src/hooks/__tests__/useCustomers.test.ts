import { describe, it, expect, vi } from 'vitest'

// Mock dependencies
vi.mock('../../lib/customerQueries', () => ({
  getAllCustomers: vi.fn().mockResolvedValue([]),
  getCustomerById: vi.fn().mockResolvedValue(null),
  getCustomerWithStats: vi.fn().mockResolvedValue(null),
  getCustomerBookings: vi.fn().mockResolvedValue([]),
  getCustomerAddresses: vi.fn().mockResolvedValue([]),
  getCustomerTaxInfo: vi.fn().mockResolvedValue(null),
  updateCustomerStatus: vi.fn().mockResolvedValue(null),
  updateCustomer: vi.fn().mockResolvedValue(null),
  createCustomerAddress: vi.fn().mockResolvedValue(null),
  updateCustomerAddress: vi.fn().mockResolvedValue(null),
  deleteCustomerAddress: vi.fn().mockResolvedValue(undefined),
  setDefaultAddress: vi.fn().mockResolvedValue(null),
  upsertCustomerTaxInfo: vi.fn().mockResolvedValue(null),
  getCustomerStatistics: vi.fn().mockResolvedValue({
    total: 0,
    active: 0,
    suspended: 0,
    banned: 0,
    repeat_customers: 0,
    repeat_rate: 0,
    total_revenue: 0,
    average_lifetime_value: 0,
  }),
}))

import {
  useCustomers,
  useCustomer,
  useCustomerWithStats,
  useCustomerBookings,
  useUpdateCustomerStatus,
  useUpdateCustomer,
  useCustomerAddresses,
  useCustomerTaxInfo,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
  useUpsertTaxInfo,
  useCustomerStatistics,
} from '../useCustomers'

describe('useCustomers hooks', () => {
  it('exports useCustomers as a function', () => {
    expect(typeof useCustomers).toBe('function')
  })

  it('exports useCustomer as a function', () => {
    expect(typeof useCustomer).toBe('function')
  })

  it('exports useCustomerWithStats as a function', () => {
    expect(typeof useCustomerWithStats).toBe('function')
  })

  it('exports useCustomerBookings as a function', () => {
    expect(typeof useCustomerBookings).toBe('function')
  })

  it('exports useUpdateCustomerStatus as a function', () => {
    expect(typeof useUpdateCustomerStatus).toBe('function')
  })

  it('exports useUpdateCustomer as a function', () => {
    expect(typeof useUpdateCustomer).toBe('function')
  })

  it('exports useCustomerAddresses as a function', () => {
    expect(typeof useCustomerAddresses).toBe('function')
  })

  it('exports useCustomerTaxInfo as a function', () => {
    expect(typeof useCustomerTaxInfo).toBe('function')
  })

  it('exports useCreateAddress as a function', () => {
    expect(typeof useCreateAddress).toBe('function')
  })

  it('exports useUpdateAddress as a function', () => {
    expect(typeof useUpdateAddress).toBe('function')
  })

  it('exports useDeleteAddress as a function', () => {
    expect(typeof useDeleteAddress).toBe('function')
  })

  it('exports useSetDefaultAddress as a function', () => {
    expect(typeof useSetDefaultAddress).toBe('function')
  })

  it('exports useUpsertTaxInfo as a function', () => {
    expect(typeof useUpsertTaxInfo).toBe('function')
  })

  it('exports useCustomerStatistics as a function', () => {
    expect(typeof useCustomerStatistics).toBe('function')
  })
})
