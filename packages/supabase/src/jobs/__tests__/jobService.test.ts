import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFromFn, mockChannelObj, mockRemoveChannel, mockChannelFn } = vi.hoisted(() => ({
  mockFromFn: vi.fn(),
  mockChannelObj: { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() },
  mockRemoveChannel: vi.fn(),
  mockChannelFn: vi.fn(),
}))

vi.mock('../../auth/supabaseClient', () => ({
  supabase: {
    from: mockFromFn,
    channel: mockChannelFn.mockReturnValue(mockChannelObj),
    removeChannel: mockRemoveChannel,
  },
}))

function createBuilder(resolveValue: any = { data: null, error: null }) {
  const b: any = {}
  const m = ['select', 'eq', 'neq', 'in', 'gte', 'lte', 'order', 'limit', 'single', 'insert', 'update', 'delete', 'is']
  m.forEach(k => { b[k] = vi.fn().mockReturnValue(b) })
  b.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve)
  return b
}

import {
  getStaffJobs,
  getPendingJobs,
  getJob,
  acceptJob,
  declineJob,
  updateJobStatus,
  cancelJob,
  getStaffStats,
  subscribeToJobs,
  reportSOS,
} from '../jobService'

describe('jobService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getStaffJobs', () => {
    it('should fetch jobs for staff', async () => {
      const jobs = [{ id: 'j1', status: 'confirmed' }]
      mockFromFn.mockReturnValueOnce(createBuilder({ data: jobs, error: null }))
      const result = await getStaffJobs('s1')
      expect(result).toEqual(jobs)
    })

    it('should return empty on null data', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: null }))
      expect(await getStaffJobs('s1')).toEqual([])
    })

    it('should throw on error', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: { message: 'Err' } }))
      await expect(getStaffJobs('s1')).rejects.toBeTruthy()
    })

    it('should apply array status filter', async () => {
      const b = createBuilder({ data: [], error: null })
      mockFromFn.mockReturnValueOnce(b)
      await getStaffJobs('s1', { status: ['confirmed', 'in_progress'] as any })
      expect(b.in).toHaveBeenCalledWith('status', ['confirmed', 'in_progress'])
    })

    it('should apply single status filter', async () => {
      const b = createBuilder({ data: [], error: null })
      mockFromFn.mockReturnValueOnce(b)
      await getStaffJobs('s1', { status: 'confirmed' as any })
      expect(b.eq).toHaveBeenCalledWith('status', 'confirmed')
    })

    it('should apply date filters', async () => {
      const b = createBuilder({ data: [], error: null })
      mockFromFn.mockReturnValueOnce(b)
      await getStaffJobs('s1', { date: '2026-01-15', date_from: '2026-01-01', date_to: '2026-01-31' } as any)
      expect(b.eq).toHaveBeenCalledWith('scheduled_date', '2026-01-15')
      expect(b.gte).toHaveBeenCalledWith('scheduled_date', '2026-01-01')
      expect(b.lte).toHaveBeenCalledWith('scheduled_date', '2026-01-31')
    })
  })

  describe('getPendingJobs', () => {
    it('should fetch unassigned pending jobs', async () => {
      const b = createBuilder({ data: [{ id: 'j2' }], error: null })
      mockFromFn.mockReturnValueOnce(b)
      const result = await getPendingJobs()
      expect(result).toHaveLength(1)
      expect(b.eq).toHaveBeenCalledWith('status', 'pending')
      expect(b.is).toHaveBeenCalledWith('staff_id', null)
    })
  })

  describe('getJob', () => {
    it('should return job', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: { id: 'j1' }, error: null }))
      expect(await getJob('j1')).toEqual({ id: 'j1' })
    })

    it('should return null on PGRST116', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: { code: 'PGRST116', message: 'Not found' } }))
      expect(await getJob('x')).toBeNull()
    })

    it('should throw on other errors', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: { code: '42P01', message: 'Err' } }))
      await expect(getJob('x')).rejects.toBeTruthy()
    })
  })

  describe('acceptJob', () => {
    it('should update to confirmed', async () => {
      // First call: check current job status - must be pending with null staff_id
      const checkBuilder = createBuilder({ data: { id: 'j1', status: 'pending', staff_id: null, booking_id: null, total_jobs: 1 }, error: null })
      mockFromFn.mockReturnValueOnce(checkBuilder)
      // Second call: update the job
      const updateBuilder = createBuilder({ data: { id: 'j1', status: 'confirmed', booking_id: null }, error: null })
      mockFromFn.mockReturnValueOnce(updateBuilder)

      const result = await acceptJob('j1', 's1')
      expect(result.status).toBe('confirmed')
      expect(updateBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ staff_id: 's1', status: 'confirmed' }))
    })
  })

  describe('declineJob', () => {
    it('should reset to pending', async () => {
      const b = createBuilder({ error: null })
      mockFromFn.mockReturnValueOnce(b)
      await declineJob('j1', 's1')
      expect(b.update).toHaveBeenCalledWith(expect.objectContaining({ staff_id: null, status: 'pending' }))
    })

    it('should throw on error', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ error: { message: 'Err' } }))
      await expect(declineJob('j1', 's1')).rejects.toBeTruthy()
    })
  })

  describe('updateJobStatus', () => {
    it('should set started_at for in_progress', async () => {
      const b = createBuilder({ data: { id: 'j1' }, error: null })
      mockFromFn.mockReturnValueOnce(b)
      await updateJobStatus('j1', 'in_progress' as any)
      expect(b.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'in_progress', started_at: expect.any(String) }))
    })

    it('should set completed_at for completed', async () => {
      const b = createBuilder({ data: { id: 'j1' }, error: null })
      mockFromFn.mockReturnValueOnce(b)
      await updateJobStatus('j1', 'completed' as any)
      expect(b.update).toHaveBeenCalledWith(expect.objectContaining({ completed_at: expect.any(String) }))
    })

    it('should set cancelled_at for cancelled', async () => {
      const b = createBuilder({ data: { id: 'j1' }, error: null })
      mockFromFn.mockReturnValueOnce(b)
      await updateJobStatus('j1', 'cancelled' as any)
      expect(b.update).toHaveBeenCalledWith(expect.objectContaining({ cancelled_at: expect.any(String) }))
    })
  })

  describe('cancelJob', () => {
    it('should cancel with reason', async () => {
      const b = createBuilder({ data: { id: 'j1', status: 'cancelled' }, error: null })
      mockFromFn.mockReturnValueOnce(b)
      const result = await cancelJob('j1', 's1', 'No show', 'notes')
      expect(result.status).toBe('cancelled')
      expect(b.update).toHaveBeenCalledWith(expect.objectContaining({
        cancellation_reason: 'No show',
        staff_notes: 'notes',
        cancelled_by: 'STAFF',
      }))
    })
  })

  describe('getStaffStats', () => {
    it('should return stats', async () => {
      mockFromFn
        .mockReturnValueOnce(createBuilder({ data: [{ amount: 1000, staff_earnings: 500, status: 'completed' }], error: null }))
        .mockReturnValueOnce(createBuilder({ data: [{ amount: 1000, staff_earnings: 500, status: 'completed' }], error: null }))
        .mockReturnValueOnce(createBuilder({ data: [{ rating: 5 }], error: null }))

      const result = await getStaffStats('s1')
      expect(result.today_jobs_count).toBe(1)
      expect(result.today_earnings).toBe(500)
      expect(result.average_rating).toBe(5)
    })

    it('should handle empty data', async () => {
      mockFromFn
        .mockReturnValueOnce(createBuilder({ data: null, error: null }))
        .mockReturnValueOnce(createBuilder({ data: null, error: null }))
        .mockReturnValueOnce(createBuilder({ data: null, error: null }))

      const result = await getStaffStats('s1')
      expect(result.today_jobs_count).toBe(0)
      expect(result.average_rating).toBe(0)
    })
  })

  describe('subscribeToJobs', () => {
    it('should create three channels', () => {
      const unsub = subscribeToJobs('s1', vi.fn())
      expect(mockChannelFn).toHaveBeenCalledTimes(3)
      expect(typeof unsub).toBe('function')
    })

    it('should remove all three channels on unsubscribe', () => {
      const unsub = subscribeToJobs('s1', vi.fn())
      unsub()
      expect(mockRemoveChannel).toHaveBeenCalledTimes(3)
    })
  })

  describe('reportSOS', () => {
    it('should create SOS report', async () => {
      const b = createBuilder({ error: null })
      mockFromFn.mockReturnValueOnce(b)
      await reportSOS('s1', 'j1', { latitude: 13.75, longitude: 100.50 }, 'Help!')
      expect(b.insert).toHaveBeenCalledWith(expect.objectContaining({
        staff_id: 's1',
        message: 'Help!',
        status: 'active',
      }))
    })

    it('should handle null location', async () => {
      const b = createBuilder({ error: null })
      mockFromFn.mockReturnValueOnce(b)
      await reportSOS('s1', null, null)
      expect(b.insert).toHaveBeenCalledWith(expect.objectContaining({
        latitude: null,
        longitude: null,
        message: 'SOS Emergency',
      }))
    })

    it('should throw on error', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ error: { message: 'Err' } }))
      await expect(reportSOS('s1', null, null)).rejects.toBeTruthy()
    })
  })
})
