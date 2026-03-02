import { describe, it, expect, vi } from 'vitest'

// Mock dependencies
vi.mock('../../services/bookingService', () => ({
  bookingService: {
    getAllBookings: vi.fn(),
    getBookingById: vi.fn(),
    getBookingStats: vi.fn(),
    updateBookingStatus: vi.fn(),
    updateBookingPaymentStatus: vi.fn(),
    assignStaff: vi.fn(),
    searchBookings: vi.fn(),
  },
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: true, error: null })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isLoading: false })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
  })),
  keepPreviousData: Symbol('keepPreviousData'),
}))

import {
  useBookings,
  useBooking,
  useBookingStats,
  useUpdateBookingStatus,
  useUpdatePaymentStatus,
  useAssignStaff,
  useSearchBookings,
} from '../useBookings'

describe('useBookings', () => {
  it('exports useBookings as a function', () => {
    expect(typeof useBookings).toBe('function')
  })

  it('exports useBooking as a function', () => {
    expect(typeof useBooking).toBe('function')
  })

  it('exports useBookingStats as a function', () => {
    expect(typeof useBookingStats).toBe('function')
  })

  it('exports useUpdateBookingStatus as a function', () => {
    expect(typeof useUpdateBookingStatus).toBe('function')
  })

  it('exports useUpdatePaymentStatus as a function', () => {
    expect(typeof useUpdatePaymentStatus).toBe('function')
  })

  it('exports useAssignStaff as a function', () => {
    expect(typeof useAssignStaff).toBe('function')
  })

  it('exports useSearchBookings as a function', () => {
    expect(typeof useSearchBookings).toBe('function')
  })
})
