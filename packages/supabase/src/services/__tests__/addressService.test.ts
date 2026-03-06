import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getAddresses,
  getDefaultAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../addressService'

function createMockClient(resolveValue: any = { data: null, error: null }) {
  const builder: any = {}
  const methods = ['select', 'eq', 'neq', 'in', 'gte', 'order', 'limit', 'single', 'insert', 'update', 'delete']
  methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
  builder.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve)

  return { from: vi.fn().mockReturnValue(builder), _builder: builder } as any
}

function createMultiTableClient(responses: Record<string, any>) {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      const builder: any = {}
      const methods = ['select', 'eq', 'neq', 'in', 'gte', 'order', 'limit', 'single', 'insert', 'update', 'delete']
      methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
      const response = responses[table] || { data: null, error: null }
      builder.then = (resolve: any) => Promise.resolve(response).then(resolve)
      return builder
    }),
  } as any
}

describe('addressService', () => {
  describe('getAddresses', () => {
    it('should return addresses for a customer', async () => {
      const mockAddresses = [
        { id: 'a1', label: 'Home', is_default: true },
        { id: 'a2', label: 'Work', is_default: false },
      ]
      const client = createMockClient({ data: mockAddresses, error: null })

      const result = await getAddresses(client, 'customer-1')
      expect(result).toEqual(mockAddresses)
      expect(client.from).toHaveBeenCalledWith('addresses')
    })

    it('should return empty array when no addresses', async () => {
      const client = createMockClient({ data: null, error: null })
      const result = await getAddresses(client, 'customer-1')
      expect(result).toEqual([])
    })

    it('should throw on error', async () => {
      const client = createMockClient({ data: null, error: { message: 'DB error' } })
      await expect(getAddresses(client, 'customer-1')).rejects.toBeDefined()
    })
  })

  describe('getDefaultAddress', () => {
    it('should return default address', async () => {
      const mockAddress = { id: 'a1', label: 'Home', is_default: true }
      const client = createMockClient({ data: mockAddress, error: null })

      const result = await getDefaultAddress(client, 'customer-1')
      expect(result).toEqual(mockAddress)
    })

    it('should return null when no default found (PGRST116)', async () => {
      const client = createMockClient({ data: null, error: { code: 'PGRST116', message: 'not found' } })
      const result = await getDefaultAddress(client, 'customer-1')
      expect(result).toBeNull()
    })

    it('should throw on other errors', async () => {
      const client = createMockClient({ data: null, error: { code: '500', message: 'error' } })
      await expect(getDefaultAddress(client, 'customer-1')).rejects.toBeDefined()
    })
  })

  describe('createAddress', () => {
    it('should create a new address', async () => {
      const mockCreated = { id: 'a-new', label: 'New Address', is_default: false }
      const client = createMockClient({ data: mockCreated, error: null })

      const result = await createAddress(client, {
        customer_id: 'c1',
        label: 'New Address',
        address_line1: '123 Main St',
      } as any)

      expect(result).toEqual(mockCreated)
    })

    it('should unset other defaults when creating default address', async () => {
      const client = createMultiTableClient({
        addresses: { data: { id: 'a-new', is_default: true }, error: null },
      })

      await createAddress(client, {
        customer_id: 'c1',
        label: 'New Default',
        is_default: true,
      } as any)

      // from('addresses') should be called multiple times (unset + insert)
      expect(client.from).toHaveBeenCalledWith('addresses')
    })
  })

  describe('updateAddress', () => {
    it('should update an address', async () => {
      const mockUpdated = { id: 'a1', label: 'Updated Home' }
      const client = createMockClient({ data: mockUpdated, error: null })

      const result = await updateAddress(client, 'a1', { label: 'Updated Home' } as any)
      expect(result).toEqual(mockUpdated)
    })

    it('should handle setting as default during update', async () => {
      const client = createMultiTableClient({
        addresses: { data: { id: 'a1', customer_id: 'c1', is_default: true }, error: null },
      })

      await updateAddress(client, 'a1', { is_default: true } as any)
      expect(client.from).toHaveBeenCalledWith('addresses')
    })
  })

  describe('deleteAddress', () => {
    it('should delete an address', async () => {
      const client = createMockClient({ data: null, error: null })
      await expect(deleteAddress(client, 'a1')).resolves.toBeUndefined()
      expect(client.from).toHaveBeenCalledWith('addresses')
    })

    it('should throw on error', async () => {
      const client = createMockClient({ data: null, error: { message: 'Delete failed' } })
      await expect(deleteAddress(client, 'a1')).rejects.toBeDefined()
    })
  })

  describe('setDefaultAddress', () => {
    it('should set address as default', async () => {
      const mockResult = { id: 'a1', is_default: true }
      const client = createMultiTableClient({
        addresses: { data: mockResult, error: null },
      })

      const result = await setDefaultAddress(client, 'a1', 'c1')
      expect(result).toEqual(mockResult)
    })
  })
})
