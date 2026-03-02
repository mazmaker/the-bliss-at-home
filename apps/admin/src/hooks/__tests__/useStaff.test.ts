import { describe, it, expect, vi } from 'vitest'

// Mock dependencies
vi.mock('../../services/staffService', () => ({
  staffService: {
    getAllStaff: vi.fn(),
    getStaffById: vi.fn(),
    getStaffStats: vi.fn(),
    createStaff: vi.fn(),
    updateStaffStatus: vi.fn(),
    updateStaff: vi.fn(),
    generateLineInvite: vi.fn(),
  },
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
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
  keepPreviousData: Symbol('keepPreviousData'),
}))

import {
  useStaff,
  useStaffById,
  useStaffDetail,
  useStaffStats,
  useCreateStaff,
  useUpdateStaffStatus,
  useUpdateStaff,
  useGenerateLineInvite,
} from '../useStaff'

describe('useStaff hooks', () => {
  it('exports useStaff as a function', () => {
    expect(typeof useStaff).toBe('function')
  })

  it('exports useStaffById as a function', () => {
    expect(typeof useStaffById).toBe('function')
  })

  it('exports useStaffDetail as a function', () => {
    expect(typeof useStaffDetail).toBe('function')
  })

  it('exports useStaffStats as a function', () => {
    expect(typeof useStaffStats).toBe('function')
  })

  it('exports useCreateStaff as a function', () => {
    expect(typeof useCreateStaff).toBe('function')
  })

  it('exports useUpdateStaffStatus as a function', () => {
    expect(typeof useUpdateStaffStatus).toBe('function')
  })

  it('exports useUpdateStaff as a function', () => {
    expect(typeof useUpdateStaff).toBe('function')
  })

  it('exports useGenerateLineInvite as a function', () => {
    expect(typeof useGenerateLineInvite).toBe('function')
  })
})
