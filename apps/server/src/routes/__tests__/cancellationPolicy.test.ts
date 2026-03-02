import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'

// Use vi.hoisted to avoid "Cannot access before initialization" error
const { mockFrom, mockService } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockService: {
    getCancellationPolicy: vi.fn().mockResolvedValue({ settings: null, tiers: [] }),
    getFullCancellationPolicy: vi.fn().mockResolvedValue({ settings: null, tiers: [] }),
    checkCancellationEligibility: vi.fn().mockResolvedValue({
      canCancel: true,
      canReschedule: true,
      refundPercentage: 100,
      rescheduleFee: 0,
      hoursUntilBooking: 72,
      tier: null,
    }),
    calculateDynamicRefund: vi.fn().mockResolvedValue({
      eligible: true,
      originalAmount: 2000,
      refundAmount: 2000,
      refundPercentage: 100,
    }),
    updatePolicySettings: vi.fn().mockResolvedValue({ id: 's1' }),
    updatePolicyTier: vi.fn().mockResolvedValue({ id: 't1' }),
    createPolicyTier: vi.fn().mockResolvedValue({ id: 't-new' }),
    deletePolicyTier: vi.fn().mockResolvedValue(true),
  },
}))

// Mock supabase - needed by requireAdmin middleware
vi.mock('../../lib/supabase.js', () => ({
  getSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      }),
    },
  })),
}))

// Mock cancellation policy service
vi.mock('../../services/cancellationPolicyService.js', () => ({
  cancellationPolicyService: mockService,
  CancellationPolicyTier: {},
  CancellationPolicySettings: {},
}))

import cancellationPolicyRouter from '../cancellationPolicy'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/cancellation-policy', cancellationPolicyRouter)
  return app
}

describe('cancellationPolicy routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/cancellation-policy', () => {
    it('should return active policy', async () => {
      const app = createApp()
      const res = await request(app).get('/api/cancellation-policy')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('settings')
      expect(res.body.data).toHaveProperty('tiers')
      expect(mockService.getCancellationPolicy).toHaveBeenCalled()
    })

    it('should return 500 on service error', async () => {
      mockService.getCancellationPolicy.mockRejectedValueOnce(new Error('Service error'))

      const app = createApp()
      const res = await request(app).get('/api/cancellation-policy')

      expect(res.status).toBe(500)
      expect(res.body.success).toBe(false)
    })
  })

  describe('GET /api/cancellation-policy/check/:bookingId', () => {
    it('should check cancellation eligibility', async () => {
      const app = createApp()
      const res = await request(app).get('/api/cancellation-policy/check/booking-1')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('canCancel')
      expect(res.body.data).toHaveProperty('canReschedule')
      expect(mockService.checkCancellationEligibility).toHaveBeenCalledWith('booking-1')
    })

    it('should return 500 on service error', async () => {
      mockService.checkCancellationEligibility.mockRejectedValueOnce(new Error('Error'))

      const app = createApp()
      const res = await request(app).get('/api/cancellation-policy/check/booking-1')

      expect(res.status).toBe(500)
      expect(res.body.success).toBe(false)
    })
  })

  describe('GET /api/cancellation-policy/refund-preview/:bookingId', () => {
    it('should return refund preview', async () => {
      const app = createApp()
      const res = await request(app).get('/api/cancellation-policy/refund-preview/booking-1')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('eligible')
      expect(res.body.data).toHaveProperty('refundAmount')
      expect(mockService.calculateDynamicRefund).toHaveBeenCalledWith('booking-1')
    })
  })

  describe('Admin routes (require auth)', () => {
    it('GET /admin should return 401 without auth', async () => {
      const app = createApp()
      const res = await request(app).get('/api/cancellation-policy/admin')

      expect(res.status).toBe(401)
    })

    it('PUT /admin/settings should return 401 without auth', async () => {
      const app = createApp()
      const res = await request(app)
        .put('/api/cancellation-policy/admin/settings')
        .send({ max_reschedules_per_booking: 3 })

      expect(res.status).toBe(401)
    })

    it('POST /admin/tiers should return 401 without auth', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/cancellation-policy/admin/tiers')
        .send({ min_hours_before: 12 })

      expect(res.status).toBe(401)
    })

    it('DELETE /admin/tiers/:tierId should return 401 without auth', async () => {
      const app = createApp()
      const res = await request(app).delete('/api/cancellation-policy/admin/tiers/t1')

      expect(res.status).toBe(401)
    })
  })

  describe('module exports', () => {
    it('should export a router', () => {
      expect(cancellationPolicyRouter).toBeDefined()
    })
  })
})
