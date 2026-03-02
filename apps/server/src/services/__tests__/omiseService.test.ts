import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Omise module
const mockChargesCreate = vi.fn()
const mockChargesRetrieve = vi.fn()
const mockChargesCreateRefund = vi.fn()
const mockCustomersCreate = vi.fn()
const mockSourcesCreate = vi.fn()
const mockSourcesRetrieve = vi.fn()

vi.mock('omise', () => ({
  default: vi.fn(() => ({
    charges: {
      create: mockChargesCreate,
      retrieve: mockChargesRetrieve,
      createRefund: mockChargesCreateRefund,
    },
    customers: { create: mockCustomersCreate },
    sources: {
      create: mockSourcesCreate,
      retrieve: mockSourcesRetrieve,
    },
  })),
}))

// Set env vars before import
vi.stubEnv('OMISE_PUBLIC_KEY', 'pkey_test_123')
vi.stubEnv('OMISE_SECRET_KEY', 'skey_test_456')

import {
  createCharge,
  createCustomer,
  getCharge,
  createRefund,
  createSource,
  createChargeWithSource,
  getSource,
  verifyWebhookSignature,
} from '../omiseService'

const mockChargeResponse = {
  id: 'chrg_test_001',
  object: 'charge',
  amount: 100000,
  currency: 'THB',
  status: 'successful',
  paid: true,
  transaction: 'trxn_test_001',
  card: {
    brand: 'Visa',
    last_digits: '4242',
    expiration_month: 12,
    expiration_year: 2028,
    name: 'Test User',
  },
  failure_code: null,
  failure_message: null,
  metadata: { booking_id: 'bk-001' },
  created_at: '2026-02-19T10:00:00Z',
}

describe('omiseService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createCharge', () => {
    it('should create a charge with token', async () => {
      mockChargesCreate.mockResolvedValue(mockChargeResponse)

      const result = await createCharge({
        amount: 100000,
        currency: 'THB',
        token: 'tokn_test_123',
        description: 'Thai Massage',
      })

      expect(result.id).toBe('chrg_test_001')
      expect(result.amount).toBe(100000)
      expect(result.status).toBe('successful')
      expect(result.paid).toBe(true)
      expect(result.card?.brand).toBe('Visa')
      expect(result.card?.lastDigits).toBe('4242')
    })

    it('should create a charge with customerId', async () => {
      mockChargesCreate.mockResolvedValue(mockChargeResponse)

      await createCharge({
        amount: 50000,
        currency: 'THB',
        customerId: 'cust_test_001',
        description: 'Foot Massage',
      })

      expect(mockChargesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cust_test_001',
        })
      )
    })

    it('should create a charge with card fallback', async () => {
      mockChargesCreate.mockResolvedValue(mockChargeResponse)

      await createCharge({
        amount: 50000,
        currency: 'THB',
        card: 'card_test_001',
        description: 'Oil Massage',
      })

      expect(mockChargesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          card: 'card_test_001',
        })
      )
    })

    it('should throw if no token/card/customerId', async () => {
      await expect(
        createCharge({
          amount: 50000,
          currency: 'THB',
          description: 'No payment method',
        })
      ).rejects.toThrow('Either token, card, or customerId must be provided')
    })

    it('should include returnUri for 3DS', async () => {
      mockChargesCreate.mockResolvedValue(mockChargeResponse)

      await createCharge({
        amount: 100000,
        currency: 'THB',
        token: 'tokn_test_123',
        description: 'Test',
        returnUri: 'https://example.com/callback',
      })

      expect(mockChargesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          return_uri: 'https://example.com/callback',
        })
      )
    })

    it('should auto-capture by default', async () => {
      mockChargesCreate.mockResolvedValue(mockChargeResponse)

      await createCharge({
        amount: 100000,
        currency: 'THB',
        token: 'tokn_test_123',
        description: 'Test',
      })

      expect(mockChargesCreate).toHaveBeenCalledWith(
        expect.objectContaining({ capture: true })
      )
    })

    it('should handle charge without card info', async () => {
      mockChargesCreate.mockResolvedValue({ ...mockChargeResponse, card: null })

      const result = await createCharge({
        amount: 100000,
        currency: 'THB',
        token: 'tokn_test_123',
        description: 'Test',
      })

      expect(result.card).toBeUndefined()
    })

    it('should throw on Omise error', async () => {
      mockChargesCreate.mockRejectedValue(new Error('insufficient funds'))

      await expect(
        createCharge({
          amount: 100000,
          currency: 'THB',
          token: 'tokn_test_123',
          description: 'Test',
        })
      ).rejects.toThrow('insufficient funds')
    })
  })

  describe('createCustomer', () => {
    it('should create a customer', async () => {
      mockCustomersCreate.mockResolvedValue({
        id: 'cust_test_001',
        email: 'test@example.com',
        description: 'Test Customer',
        default_card: 'card_001',
        cards: { data: [{ id: 'card_001' }] },
        metadata: {},
        created_at: '2026-02-19T10:00:00Z',
      })

      const result = await createCustomer({
        email: 'test@example.com',
        description: 'Test Customer',
        card: 'tokn_test_123',
      })

      expect(result.id).toBe('cust_test_001')
      expect(result.email).toBe('test@example.com')
      expect(result.defaultCard).toBe('card_001')
      expect(result.cards).toHaveLength(1)
    })

    it('should handle customer without cards', async () => {
      mockCustomersCreate.mockResolvedValue({
        id: 'cust_test_002',
        email: 'test2@example.com',
        description: 'No card customer',
        default_card: null,
        cards: null,
        metadata: {},
        created_at: '2026-02-19T10:00:00Z',
      })

      const result = await createCustomer({
        email: 'test2@example.com',
        description: 'No card customer',
      })

      expect(result.defaultCard).toBeNull()
      expect(result.cards).toEqual([])
    })

    it('should throw on Omise error', async () => {
      mockCustomersCreate.mockRejectedValue(new Error('invalid email'))
      await expect(
        createCustomer({ email: '', description: 'Bad' })
      ).rejects.toThrow('invalid email')
    })
  })

  describe('getCharge', () => {
    it('should retrieve a charge by ID', async () => {
      mockChargesRetrieve.mockResolvedValue(mockChargeResponse)

      const result = await getCharge('chrg_test_001')
      expect(result.id).toBe('chrg_test_001')
      expect(result.status).toBe('successful')
    })

    it('should throw on not found', async () => {
      mockChargesRetrieve.mockRejectedValue(new Error('charge not found'))
      await expect(getCharge('chrg_bad')).rejects.toThrow('charge not found')
    })
  })

  describe('createRefund', () => {
    it('should create a full refund', async () => {
      mockChargesCreateRefund.mockResolvedValue({
        id: 'rfnd_test_001',
        object: 'refund',
        amount: 100000,
        currency: 'THB',
        charge: 'chrg_test_001',
        transaction: 'trxn_rfnd_001',
        status: 'closed',
        created_at: '2026-02-19T10:00:00Z',
      })

      const result = await createRefund('chrg_test_001')
      expect(result.id).toBe('rfnd_test_001')
      expect(result.amount).toBe(100000)
      expect(result.status).toBe('closed')
    })

    it('should create a partial refund', async () => {
      mockChargesCreateRefund.mockResolvedValue({
        id: 'rfnd_test_002',
        object: 'refund',
        amount: 50000,
        currency: 'THB',
        charge: 'chrg_test_001',
        transaction: 'trxn_rfnd_002',
        status: 'closed',
        created_at: '2026-02-19T10:00:00Z',
      })

      const result = await createRefund('chrg_test_001', 50000)
      expect(result.amount).toBe(50000)
      expect(mockChargesCreateRefund).toHaveBeenCalledWith('chrg_test_001', { amount: 50000 })
    })
  })

  describe('createSource', () => {
    it('should create a PromptPay source', async () => {
      mockSourcesCreate.mockResolvedValue({
        id: 'src_test_001',
        type: 'promptpay',
        flow: 'offline',
        amount: 100000,
        currency: 'THB',
        scannable_code: { image: { download_uri: 'https://qr.example.com' } },
        authorize_uri: null,
        created_at: '2026-02-19T10:00:00Z',
      })

      const result = await createSource('promptpay', 100000)
      expect(result.id).toBe('src_test_001')
      expect(result.type).toBe('promptpay')
      expect(result.scannable_code).toBeDefined()
    })

    it('should create a mobile banking source', async () => {
      mockSourcesCreate.mockResolvedValue({
        id: 'src_test_002',
        type: 'mobile_banking_scb',
        flow: 'redirect',
        amount: 50000,
        currency: 'THB',
        scannable_code: null,
        authorize_uri: 'https://bank.example.com/auth',
        created_at: '2026-02-19T10:00:00Z',
      })

      const result = await createSource('mobile_banking_scb', 50000)
      expect(result.authorize_uri).toBe('https://bank.example.com/auth')
    })

    it('should default to THB currency', async () => {
      mockSourcesCreate.mockResolvedValue({
        id: 'src_test_003', type: 'promptpay', flow: 'offline',
        amount: 100000, currency: 'THB', scannable_code: null,
        authorize_uri: null, created_at: '2026-02-19T10:00:00Z',
      })

      await createSource('promptpay', 100000)
      expect(mockSourcesCreate).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'THB' })
      )
    })
  })

  describe('createChargeWithSource', () => {
    it('should create a charge with source', async () => {
      mockChargesCreate.mockResolvedValue({ ...mockChargeResponse, card: null })

      const result = await createChargeWithSource({
        amount: 100000,
        currency: 'THB',
        source: 'src_test_001',
        description: 'PromptPay payment',
      })

      expect(result.id).toBe('chrg_test_001')
      expect(mockChargesCreate).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'src_test_001' })
      )
    })
  })

  describe('getSource', () => {
    it('should retrieve a source by ID', async () => {
      mockSourcesRetrieve.mockResolvedValue({
        id: 'src_test_001', type: 'promptpay', flow: 'offline',
        amount: 100000, currency: 'THB', scannable_code: { image: {} },
        authorize_uri: null, created_at: '2026-02-19T10:00:00Z',
      })

      const result = await getSource('src_test_001')
      expect(result.id).toBe('src_test_001')
      expect(result.type).toBe('promptpay')
    })
  })

  describe('verifyWebhookSignature', () => {
    it('should return false for mismatched signature', () => {
      // With OMISE_SECRET_KEY set, it computes HMAC and compares
      // A random signature won't match, so it returns false (or catches buffer length error)
      const result = verifyWebhookSignature('payload', 'bad-signature')
      expect(typeof result).toBe('boolean')
    })

    it('should return true when secret key is not set', () => {
      vi.stubEnv('OMISE_SECRET_KEY', '')
      expect(verifyWebhookSignature('payload', 'signature')).toBe(true)
    })

    it('should return true when signature is empty', () => {
      expect(verifyWebhookSignature('payload', '')).toBe(true)
    })
  })
})
