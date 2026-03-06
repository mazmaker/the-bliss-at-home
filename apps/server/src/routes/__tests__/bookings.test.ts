import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'

// Chainable mock helper
function createChainMock(resolvedValue: any) {
  const chain: any = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.not = vi.fn().mockReturnValue(chain)
  chain.is = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  return chain
}

const mockFrom = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  getSupabaseClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

vi.mock('../../services/refundService.js', () => ({
  refundService: {
    calculateRefund: vi.fn().mockResolvedValue({ refundAmount: 1000 }),
    processRefund: vi.fn().mockResolvedValue({ success: true, refundAmount: 1000 }),
    CANCELLATION_POLICY: { tiers: [] },
  },
}))

vi.mock('../../services/cancellationNotificationService.js', () => ({
  sendCancellationNotifications: vi.fn().mockResolvedValue({
    customer: true,
    staff: true,
    hotel: false,
    admin: true,
  }),
}))

vi.mock('../../services/rescheduleNotificationService.js', () => ({
  sendRescheduleNotifications: vi.fn().mockResolvedValue({
    staff_line: true,
    staff_in_app: true,
  }),
}))

vi.mock('../../services/cancellationPolicyService.js', () => ({
  checkCancellationEligibility: vi.fn().mockResolvedValue({
    canCancel: true,
    canReschedule: true,
    refundPercentage: 100,
    rescheduleFee: 0,
    hoursUntilBooking: 72,
    tier: null,
  }),
}))

vi.mock('../../services/lineService.js', () => ({
  lineService: {
    sendBookingCancelledToStaff: vi.fn().mockResolvedValue(true),
  },
}))

vi.mock('../receipts.js', () => ({
  sendCreditNoteEmailForRefund: vi.fn().mockResolvedValue(undefined),
}))

import bookingsRouter from '../bookings'

// Create test app
function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/bookings', bookingsRouter)
  return app
}

describe('bookings routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/bookings', () => {
    it('should return list of bookings', async () => {
      const mockBookings = [
        { id: 'b1', booking_number: 'BK-001', status: 'confirmed' },
        { id: 'b2', booking_number: 'BK-002', status: 'pending' },
      ]

      mockFrom.mockImplementation(() =>
        createChainMock({ data: mockBookings, error: null })
      )

      // Need to handle the chain that ends with .limit()
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
          }),
        }),
      }))

      const app = createApp()
      const res = await request(app).get('/api/bookings')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toEqual(mockBookings)
    })

    it('should return 500 when database error occurs', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } }),
          }),
        }),
      }))

      const app = createApp()
      const res = await request(app).get('/api/bookings')

      expect(res.status).toBe(500)
      expect(res.body.success).toBe(false)
    })
  })

  describe('GET /api/bookings/:id', () => {
    it('should return booking details', async () => {
      const mockBooking = { id: 'b1', booking_number: 'BK-001', status: 'confirmed' }

      mockFrom.mockImplementation(() =>
        createChainMock({ data: mockBooking, error: null })
      )

      const app = createApp()
      const res = await request(app).get('/api/bookings/b1')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toEqual(mockBooking)
    })

    it('should return 404 when booking not found', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({ data: null, error: { message: 'Not found' } })
      )

      const app = createApp()
      const res = await request(app).get('/api/bookings/nonexistent')

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })
  })

  describe('POST /api/bookings/:id/cancel', () => {
    it('should return 400 when reason is missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/bookings/b1/cancel')
        .send({ refund_option: 'none' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('reason')
    })

    it('should return 400 when refund_option is missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/bookings/b1/cancel')
        .send({ reason: 'Changed plans' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Refund option')
    })

    it('should return 400 when partial refund has invalid percentage', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/bookings/b1/cancel')
        .send({ reason: 'Changed plans', refund_option: 'partial', refund_percentage: 0 })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('percentage')
    })
  })

  describe('POST /api/bookings/:id/reschedule', () => {
    it('should return 400 when new_date is missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/bookings/b1/reschedule')
        .send({ new_time: '16:00' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('new_date')
    })

    it('should return 400 when new_time is missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/bookings/b1/reschedule')
        .send({ new_date: '2026-03-15' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('new_time')
    })
  })

  describe('POST /api/bookings/:id/assign-staff', () => {
    it('should return 400 when staff_id is missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/bookings/b1/assign-staff')
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('staff_id')
    })

    it('should assign staff successfully', async () => {
      const mockBooking = { id: 'b1', booking_number: 'BK-001', staff_id: 'staff-1', status: 'confirmed' }

      mockFrom.mockImplementation(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockBooking, error: null }),
            }),
          }),
        }),
      }))

      const app = createApp()
      const res = await request(app)
        .post('/api/bookings/b1/assign-staff')
        .send({ staff_id: 'staff-1' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  describe('module exports', () => {
    it('should export a router', () => {
      expect(bookingsRouter).toBeDefined()
    })
  })
})
