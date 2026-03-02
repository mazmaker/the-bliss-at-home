import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'

// Use vi.hoisted to avoid "Cannot access before initialization" error
const {
  mockFrom,
  mockProcessBookingConfirmed,
  mockProcessJobCancelled,
  mockProcessBookingCancelled,
  mockSendPayoutNotification,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockProcessBookingConfirmed: vi.fn().mockResolvedValue({
    success: true,
    jobIds: ['job-1'],
    staffNotified: true,
    adminsNotified: true,
  }),
  mockProcessJobCancelled: vi.fn().mockResolvedValue({
    success: true,
    newJobId: 'job-new-1',
    staffNotified: true,
    adminsNotified: true,
  }),
  mockProcessBookingCancelled: vi.fn().mockResolvedValue({
    success: true,
    jobsCancelled: 1,
    staffNotified: true,
  }),
  mockSendPayoutNotification: vi.fn().mockResolvedValue({
    success: true,
    lineNotified: true,
    inAppNotified: true,
  }),
}))

// Chainable mock helper
function createChainMock(resolvedValue: any) {
  const chain: any = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  chain.update = vi.fn().mockReturnValue(chain)
  return chain
}

vi.mock('../../lib/supabase.js', () => ({
  getSupabaseClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

vi.mock('../../services/notificationService.js', () => ({
  processBookingConfirmed: mockProcessBookingConfirmed,
  processJobCancelled: mockProcessJobCancelled,
  processBookingCancelled: mockProcessBookingCancelled,
  sendPayoutCompletedNotification: mockSendPayoutNotification,
}))

import notificationRouter from '../notification'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/notifications', notificationRouter)
  return app
}

describe('notification routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/notifications/booking-confirmed', () => {
    it('should return 400 when booking_id is missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/notifications/booking-confirmed')
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('booking_id')
    })

    it('should return 404 when booking not found', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({ data: null, error: { message: 'Not found' } })
      )

      const app = createApp()
      const res = await request(app)
        .post('/api/notifications/booking-confirmed')
        .send({ booking_id: 'nonexistent' })

      expect(res.status).toBe(404)
    })

    it('should return 400 when booking is not confirmed', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({
          data: { id: 'b1', status: 'pending', payment_status: 'paid' },
          error: null,
        })
      )

      const app = createApp()
      const res = await request(app)
        .post('/api/notifications/booking-confirmed')
        .send({ booking_id: 'b1' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('pending')
    })

    it('should process confirmed booking successfully', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({
          data: { id: 'b1', status: 'confirmed', payment_status: 'paid' },
          error: null,
        })
      )

      const app = createApp()
      const res = await request(app)
        .post('/api/notifications/booking-confirmed')
        .send({ booking_id: 'b1' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.job_ids).toEqual(['job-1'])
      expect(mockProcessBookingConfirmed).toHaveBeenCalledWith('b1')
    })
  })

  describe('POST /api/notifications/job-cancelled', () => {
    it('should return 400 when required fields are missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/notifications/job-cancelled')
        .send({ job_id: 'j1' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('reason')
    })

    it('should process job cancellation successfully', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/notifications/job-cancelled')
        .send({ job_id: 'j1', reason: 'Staff unavailable', notes: 'test' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.new_job_id).toBe('job-new-1')
    })
  })

  describe('POST /api/notifications/booking-cancelled', () => {
    it('should return 400 when required fields are missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/notifications/booking-cancelled')
        .send({ booking_id: 'b1' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('reason')
    })

    it('should return 404 when booking not found', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({ data: null, error: { message: 'Not found' } })
      )

      const app = createApp()
      const res = await request(app)
        .post('/api/notifications/booking-cancelled')
        .send({ booking_id: 'nonexistent', reason: 'test' })

      expect(res.status).toBe(404)
    })

    it('should process booking cancellation successfully', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({
          data: { id: 'b1', status: 'confirmed' },
          error: null,
        })
      )

      const app = createApp()
      const res = await request(app)
        .post('/api/notifications/booking-cancelled')
        .send({ booking_id: 'b1', reason: 'Admin cancelled' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.jobs_cancelled).toBe(1)
    })
  })

  describe('POST /api/notifications/payout-completed', () => {
    it('should return 400 when payout_id is missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/notifications/payout-completed')
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('payout_id')
    })

    it('should return 404 when payout not found', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({ data: null, error: { message: 'Not found' } })
      )

      const app = createApp()
      const res = await request(app)
        .post('/api/notifications/payout-completed')
        .send({ payout_id: 'nonexistent' })

      expect(res.status).toBe(404)
    })

    it('should return 400 when payout is not completed', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({
          data: { id: 'p1', status: 'pending' },
          error: null,
        })
      )

      const app = createApp()
      const res = await request(app)
        .post('/api/notifications/payout-completed')
        .send({ payout_id: 'p1' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('pending')
    })
  })

  describe('GET /api/notifications/reminder-settings', () => {
    it('should return 400 when profile_id is missing', async () => {
      const app = createApp()
      const res = await request(app)
        .get('/api/notifications/reminder-settings')

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('profile_id')
    })

    it('should return default settings when staff not found', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({ data: null, error: { message: 'Not found' } })
      )

      const app = createApp()
      const res = await request(app)
        .get('/api/notifications/reminder-settings?profile_id=p1')

      expect(res.status).toBe(200)
      expect(res.body.enabled).toBe(true)
      expect(res.body.minutes).toEqual([60, 120])
    })
  })

  describe('POST /api/notifications/reminder-settings', () => {
    it('should return 400 when profile_id is missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/notifications/reminder-settings')
        .send({ enabled: true })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('profile_id')
    })

    it('should return 400 for invalid minutes values', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/notifications/reminder-settings')
        .send({ profile_id: 'p1', minutes: [999] })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Invalid minutes')
    })
  })

  describe('module exports', () => {
    it('should export a router', () => {
      expect(notificationRouter).toBeDefined()
    })
  })
})
