import { describe, it, expect, vi } from 'vitest'
import {
  getPaymentMethods,
  getDefaultPaymentMethod,
  addPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
} from '../paymentMethodService'

function createMockClient(resolveValue: any = { data: null, error: null }) {
  const builder: any = {}
  const methods = ['select', 'eq', 'neq', 'in', 'gte', 'order', 'limit', 'single', 'insert', 'update', 'delete']
  methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
  builder.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve)
  return { from: vi.fn().mockReturnValue(builder), _builder: builder } as any
}

function createMultiCallClient(responses: any[]) {
  let callIndex = 0
  return {
    from: vi.fn().mockImplementation(() => {
      const builder: any = {}
      const methods = ['select', 'eq', 'neq', 'in', 'gte', 'order', 'limit', 'single', 'insert', 'update', 'delete']
      methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
      const response = responses[callIndex] || { data: null, error: null }
      callIndex++
      builder.then = (resolve: any) => Promise.resolve(response).then(resolve)
      return builder
    }),
  } as any
}

describe('paymentMethodService', () => {
  describe('getPaymentMethods', () => {
    it('should return active payment methods', async () => {
      const mockMethods = [
        { id: 'pm1', card_brand: 'Visa', last_digits: '4242', is_default: true },
        { id: 'pm2', card_brand: 'Mastercard', last_digits: '5555', is_default: false },
      ]
      const client = createMockClient({ data: mockMethods, error: null })

      const result = await getPaymentMethods(client, 'customer-1')
      expect(result).toEqual(mockMethods)
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no methods', async () => {
      const client = createMockClient({ data: null, error: null })
      const result = await getPaymentMethods(client, 'customer-1')
      expect(result).toEqual([])
    })

    it('should throw on error', async () => {
      const client = createMockClient({ data: null, error: { message: 'DB error' } })
      await expect(getPaymentMethods(client, 'c1')).rejects.toBeDefined()
    })
  })

  describe('getDefaultPaymentMethod', () => {
    it('should return default method', async () => {
      const mockMethod = { id: 'pm1', is_default: true, card_brand: 'Visa' }
      const client = createMockClient({ data: mockMethod, error: null })

      const result = await getDefaultPaymentMethod(client, 'c1')
      expect(result).toEqual(mockMethod)
    })

    it('should return null when no default (PGRST116)', async () => {
      const client = createMockClient({ data: null, error: { code: 'PGRST116' } })
      const result = await getDefaultPaymentMethod(client, 'c1')
      expect(result).toBeNull()
    })

    it('should throw on other errors', async () => {
      const client = createMockClient({ data: null, error: { code: '500', message: 'error' } })
      await expect(getDefaultPaymentMethod(client, 'c1')).rejects.toBeDefined()
    })
  })

  describe('addPaymentMethod', () => {
    it('should add a new payment method', async () => {
      const mockAdded = { id: 'pm-new', card_brand: 'Visa', is_default: false }
      const client = createMockClient({ data: mockAdded, error: null })

      const result = await addPaymentMethod(client, {
        customer_id: 'c1',
        card_brand: 'Visa',
        last_digits: '4242',
        is_default: false,
      } as any)

      expect(result).toEqual(mockAdded)
    })

    it('should unset other defaults when adding default method', async () => {
      const client = createMultiCallClient([
        { data: null, error: null }, // unset defaults
        { data: { id: 'pm-new', is_default: true }, error: null }, // insert
      ])

      await addPaymentMethod(client, {
        customer_id: 'c1',
        is_default: true,
      } as any)

      expect(client.from).toHaveBeenCalledWith('payment_methods')
    })

    it('should throw on error', async () => {
      const client = createMockClient({ data: null, error: { message: 'Insert failed' } })
      await expect(addPaymentMethod(client, {} as any)).rejects.toBeDefined()
    })
  })

  describe('deletePaymentMethod', () => {
    it('should soft-delete a payment method (set is_active=false)', async () => {
      const client = createMockClient({ data: null, error: null })
      await expect(deletePaymentMethod(client, 'pm1')).resolves.toBeUndefined()
      expect(client.from).toHaveBeenCalledWith('payment_methods')
    })

    it('should throw on error', async () => {
      const client = createMockClient({ data: null, error: { message: 'Delete failed' } })
      await expect(deletePaymentMethod(client, 'pm1')).rejects.toBeDefined()
    })
  })

  describe('setDefaultPaymentMethod', () => {
    it('should set method as default', async () => {
      const mockResult = { id: 'pm1', is_default: true }
      const client = createMultiCallClient([
        { data: null, error: null }, // unset others
        { data: mockResult, error: null }, // set this one
      ])

      const result = await setDefaultPaymentMethod(client, 'pm1', 'c1')
      expect(result).toEqual(mockResult)
    })
  })
})
