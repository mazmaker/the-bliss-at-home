import { describe, it, expect, vi } from 'vitest'

// Mock dependencies
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      order: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    })),
  },
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: true, error: null })),
}))

import {
  useStaffJobs,
  useStaffJobsStats,
} from '../useStaffJobs'

import type {
  Job,
  JobsStats,
} from '../useStaffJobs'

describe('useStaffJobs hooks', () => {
  it('exports useStaffJobs as a function', () => {
    expect(typeof useStaffJobs).toBe('function')
  })

  it('exports useStaffJobsStats as a function', () => {
    expect(typeof useStaffJobsStats).toBe('function')
  })
})

describe('Job type', () => {
  it('can create a valid Job object', () => {
    const job: Job = {
      id: 'job-1',
      customer_id: 'cust-1',
      customer_name: 'Test Customer',
      address: '123 Test St',
      service_name: 'Thai Massage',
      scheduled_date: '2026-03-01',
      scheduled_time: '10:00',
      status: 'pending',
      amount: 1500,
      staff_earnings: 1000,
      staff_id: 'staff-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    expect(job.status).toBe('pending')
    expect(job.amount).toBe(1500)
  })

  it('supports all job statuses', () => {
    const statuses: Job['status'][] = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']
    statuses.forEach(status => {
      const job: Job = {
        id: '1',
        customer_id: '1',
        customer_name: 'Test',
        address: 'Test',
        service_name: 'Test',
        scheduled_date: '2026-01-01',
        scheduled_time: '10:00',
        status,
        amount: 0,
        staff_earnings: 0,
        staff_id: '1',
        created_at: '',
        updated_at: '',
      }
      expect(job.status).toBe(status)
    })
  })
})

describe('JobsStats type', () => {
  it('can create a valid JobsStats object', () => {
    const stats: JobsStats = {
      total: 100,
      pending: 10,
      confirmed: 20,
      in_progress: 5,
      completed: 60,
      cancelled: 5,
    }
    expect(stats.total).toBe(100)
    expect(stats.pending + stats.confirmed + stats.in_progress + stats.completed + stats.cancelled).toBe(100)
  })
})
