import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'

// Use vi.hoisted to avoid "Cannot access before initialization" error
const { mockFrom, mockOmiseService } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockOmiseService: {
    createCharge: vi.fn().mockResolvedValue({
      id: 'chrg_test',
      paid: true,
      status: 'successful',
      amount: 200000,
      card: { brand: 'Visa', lastDigits: '4242' },
    }),
    getCharge: vi.fn().mockResolvedValue({
      id: 'chrg_test',
      paid: true,
      status: 'successful',
      amount: 200000,
    }),
    createRefund: vi.fn().mockResolvedValue({ id: 'rfnd_test', amount: 200000 }),
    createSource: vi.fn().mockResolvedValue({ id: 'src_test', scannable_code: null }),
    createChargeWithSource: vi.fn().mockResolvedValue({
      id: 'chrg_src_test',
      paid: false,
      status: 'pending',
    }),
    getSource: vi.fn().mockResolvedValue({ id: 'src_test', scannable_code: null }),
    createCustomer: vi.fn().mockResolvedValue({
      id: 'cust_test',
      cards: [{ id: 'card_test', brand: 'Visa', last_digits: '4242', expiration_month: 12, expiration_year: 2028, name: 'John' }],
    }),
  },
}))

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
  return chain
}

vi.mock('../../lib/supabase.js', () => ({
  getSupabaseClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

vi.mock('../../services/omiseService.js', () => ({
  omiseService: mockOmiseService,
}))

vi.mock('../../services/notificationService.js', () => ({
  processBookingConfirmed: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('../receipts.js', () => ({
  sendReceiptEmailForTransaction: vi.fn().mockResolvedValue(undefined),
}))

import paymentRouter from '../payment'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/payments', paymentRouter)
  return app
}

describe('payment routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/payments/create-charge', () => {
    it('should return 400 when required fields are missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/payments/create-charge')
        .send({ booking_id: 'b1' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Missing required fields')
    })

    it('should return 404 when booking not found', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({ data: null, error: { message: 'Not found' } })
      )

      const app = createApp()
      const res = await request(app)
        .post('/api/payments/create-charge')
        .send({
          booking_id: 'nonexistent',
          customer_id: 'c1',
          amount: 2000,
          token: 'tokn_test',
        })

      expect(res.status).toBe(404)
    })

    it('should create charge and return result', async () => {
      const mockBooking = {
        id: 'b1',
        booking_number: 'BK-001',
        service: { name_en: 'Massage', name_th: 'นวด' },
      }
      const mockTransaction = { id: 'txn-1' }

      let callCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === 'bookings') {
          callCount++
          if (callCount <= 1) {
            // First call: get booking
            return createChainMock({ data: mockBooking, error: null })
          }
          // Subsequent: update
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'transactions') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockTransaction, error: null }),
              }),
            }),
          }
        }
        return createChainMock({ data: null, error: null })
      })

      const app = createApp()
      const res = await request(app)
        .post('/api/payments/create-charge')
        .send({
          booking_id: 'b1',
          customer_id: 'c1',
          amount: 2000,
          token: 'tokn_test',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.charge_id).toBe('chrg_test')
      expect(res.body.paid).toBe(true)
    })
  })

  describe('GET /api/payments/charge/:id', () => {
    it('should return charge details', async () => {
      const app = createApp()
      const res = await request(app).get('/api/payments/charge/chrg_test')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.charge).toBeDefined()
      expect(mockOmiseService.getCharge).toHaveBeenCalledWith('chrg_test')
    })

    it('should return 500 when service fails', async () => {
      mockOmiseService.getCharge.mockRejectedValueOnce(new Error('Omise error'))

      const app = createApp()
      const res = await request(app).get('/api/payments/charge/invalid')

      expect(res.status).toBe(500)
    })
  })

  describe('POST /api/payments/refund', () => {
    it('should return 400 when charge_id is missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/payments/refund')
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('charge_id')
    })

    it('should create refund successfully', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'transactions') {
          return createChainMock({ data: { id: 'txn-1', booking_id: 'b1' }, error: null })
        }
        if (table === 'bookings') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        return createChainMock({ data: null, error: null })
      })

      const app = createApp()
      const res = await request(app)
        .post('/api/payments/refund')
        .send({ charge_id: 'chrg_test', amount: 2000 })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.refund).toBeDefined()
    })
  })

  describe('POST /api/payments/create-source', () => {
    it('should return 400 when required fields missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/payments/create-source')
        .send({ booking_id: 'b1' })

      expect(res.status).toBe(400)
    })

    it('should return 404 when booking not found', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({ data: null, error: { message: 'Not found' } })
      )

      const app = createApp()
      const res = await request(app)
        .post('/api/payments/create-source')
        .send({
          booking_id: 'b1',
          customer_id: 'c1',
          amount: 2000,
          source_type: 'promptpay',
        })

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/payments/add-payment-method', () => {
    it('should return 400 when required fields missing', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/payments/add-payment-method')
        .send({ customer_id: 'c1' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Missing required fields')
    })
  })

  describe('POST /api/payments/webhooks/omise', () => {
    it('should acknowledge webhook with received true', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({ data: null, error: null })
      )

      const app = createApp()
      const res = await request(app)
        .post('/api/payments/webhooks/omise')
        .send({ key: 'unknown.event', data: {} })

      expect(res.status).toBe(200)
      expect(res.body.received).toBe(true)
    })
  })

  describe('module exports', () => {
    it('should export a router', () => {
      expect(paymentRouter).toBeDefined()
    })
  })
})
