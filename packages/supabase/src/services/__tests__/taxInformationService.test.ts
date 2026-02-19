import { describe, it, expect, vi } from 'vitest'
import {
  getTaxInformation,
  upsertTaxInformation,
  deleteTaxInformation,
} from '../taxInformationService'

function createMockClient(resolveValue: any = { data: null, error: null }) {
  const builder: any = {}
  const methods = ['select', 'eq', 'neq', 'in', 'gte', 'order', 'limit', 'single', 'insert', 'update', 'delete', 'upsert']
  methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
  builder.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve)
  return { from: vi.fn().mockReturnValue(builder), _builder: builder } as any
}

describe('taxInformationService', () => {
  describe('getTaxInformation', () => {
    it('should return tax information for a customer', async () => {
      const mockTax = {
        id: 'tax-1',
        customer_id: 'c1',
        tax_id: '1234567890123',
        company_name: 'Test Company',
        address: '123 Main St',
      }
      const client = createMockClient({ data: mockTax, error: null })

      const result = await getTaxInformation(client, 'c1')
      expect(result).toEqual(mockTax)
      expect(client.from).toHaveBeenCalledWith('tax_information')
    })

    it('should return null when not found (PGRST116)', async () => {
      const client = createMockClient({ data: null, error: { code: 'PGRST116', message: 'not found' } })
      const result = await getTaxInformation(client, 'c1')
      expect(result).toBeNull()
    })

    it('should throw on other errors', async () => {
      const client = createMockClient({ data: null, error: { code: '500', message: 'error' } })
      await expect(getTaxInformation(client, 'c1')).rejects.toBeDefined()
    })
  })

  describe('upsertTaxInformation', () => {
    it('should create new tax information', async () => {
      const mockTax = {
        id: 'tax-new',
        customer_id: 'c1',
        tax_id: '1234567890123',
        company_name: 'New Company',
      }
      const client = createMockClient({ data: mockTax, error: null })

      const result = await upsertTaxInformation(client, {
        customer_id: 'c1',
        tax_id: '1234567890123',
        company_name: 'New Company',
      } as any)

      expect(result).toEqual(mockTax)
    })

    it('should update existing tax information', async () => {
      const mockTax = {
        id: 'tax-1',
        customer_id: 'c1',
        company_name: 'Updated Company',
      }
      const client = createMockClient({ data: mockTax, error: null })

      const result = await upsertTaxInformation(client, {
        customer_id: 'c1',
        company_name: 'Updated Company',
      } as any)

      expect(result.company_name).toBe('Updated Company')
    })

    it('should throw on error', async () => {
      const client = createMockClient({ data: null, error: { message: 'Upsert failed' } })
      await expect(upsertTaxInformation(client, {} as any)).rejects.toBeDefined()
    })
  })

  describe('deleteTaxInformation', () => {
    it('should delete tax information for a customer', async () => {
      const client = createMockClient({ data: null, error: null })
      await expect(deleteTaxInformation(client, 'c1')).resolves.toBeUndefined()
      expect(client.from).toHaveBeenCalledWith('tax_information')
    })

    it('should throw on error', async () => {
      const client = createMockClient({ data: null, error: { message: 'Delete failed' } })
      await expect(deleteTaxInformation(client, 'c1')).rejects.toBeDefined()
    })
  })
})
