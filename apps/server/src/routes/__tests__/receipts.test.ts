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
  chain.in = vi.fn().mockReturnValue(chain)
  return chain
}

const mockFrom = vi.fn()
const mockRpc = vi.fn().mockResolvedValue({ data: 'RCP-20260302-0001', error: null })

vi.mock('../../lib/supabase.js', () => ({
  getSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}))

// Mock email service
vi.mock('../../services/emailService.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  receiptEmailTemplate: vi.fn().mockReturnValue('<html>receipt</html>'),
  creditNoteEmailTemplate: vi.fn().mockReturnValue('<html>credit note</html>'),
}))

import receiptsRouter, { sendReceiptEmailForTransaction, sendCreditNoteEmailForRefund } from '../receipts'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/receipts', receiptsRouter)
  return app
}

describe('receipts routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/receipts/:transactionId', () => {
    it('should return 404 when transaction not found', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({ data: null, error: { message: 'Not found' } })
      )

      const app = createApp()
      const res = await request(app).get('/api/receipts/txn-nonexistent')

      expect(res.status).toBe(404)
    })

    it('should return receipt data when transaction exists', async () => {
      const mockTransaction = {
        id: 'txn-1',
        receipt_number: 'RCP-001',
        transaction_number: 'TXN-001',
        amount: 2000,
        currency: 'THB',
        payment_method: 'credit_card',
        card_brand: 'Visa',
        card_last_digits: '4242',
        status: 'successful',
        created_at: '2026-03-01',
        bookings: {
          booking_number: 'BK-001',
          booking_date: '2026-03-10',
          booking_time: '14:00',
          base_price: 2000,
          final_price: 2000,
          status: 'confirmed',
          payment_method: 'credit_card',
          services: { name_th: 'Thai Massage', name_en: 'Thai Massage', base_price: 2000, duration: 60 },
          booking_addons: [],
          customers: { id: 'c1', full_name: 'John', phone: '0812345678', profile_id: 'p1' },
        },
      }

      // Mock for transaction query, settings query, and profile query
      let queryCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === 'transactions') {
          return createChainMock({ data: mockTransaction, error: null })
        }
        if (table === 'settings') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }
        }
        if (table === 'profiles') {
          return createChainMock({ data: { email: 'john@test.com' }, error: null })
        }
        return createChainMock({ data: null, error: null })
      })

      const app = createApp()
      const res = await request(app).get('/api/receipts/txn-1')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('receipt_number')
      expect(res.body.data).toHaveProperty('amount')
    })
  })

  describe('GET /api/receipts/credit-note/:refundTransactionId', () => {
    it('should return 404 when refund transaction not found', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({ data: null, error: { message: 'Not found' } })
      )

      const app = createApp()
      const res = await request(app).get('/api/receipts/credit-note/rfnd-nonexistent')

      expect(res.status).toBe(404)
    })
  })

  describe('sendReceiptEmailForTransaction', () => {
    it('should be a function', () => {
      expect(typeof sendReceiptEmailForTransaction).toBe('function')
    })

    it('should handle transaction not found gracefully', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({ data: null, error: { message: 'Not found' } })
      )

      // Should not throw
      await expect(sendReceiptEmailForTransaction('nonexistent')).resolves.toBeUndefined()
    })
  })

  describe('sendCreditNoteEmailForRefund', () => {
    it('should be a function', () => {
      expect(typeof sendCreditNoteEmailForRefund).toBe('function')
    })

    it('should handle refund transaction not found gracefully', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({ data: null, error: { message: 'Not found' } })
      )

      // Should not throw
      await expect(sendCreditNoteEmailForRefund('nonexistent')).resolves.toBeUndefined()
    })
  })

  describe('module exports', () => {
    it('should export router as default', () => {
      expect(receiptsRouter).toBeDefined()
    })

    it('should export sendReceiptEmailForTransaction', () => {
      expect(typeof sendReceiptEmailForTransaction).toBe('function')
    })

    it('should export sendCreditNoteEmailForRefund', () => {
      expect(typeof sendCreditNoteEmailForRefund).toBe('function')
    })
  })
})
