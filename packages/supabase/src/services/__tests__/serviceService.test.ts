import { describe, it, expect, vi } from 'vitest'
import {
  getServices,
  getServicesByCategory,
  getServiceById,
  getServiceBySlug,
} from '../serviceService'

function createMockClient(resolveValue: any = { data: null, error: null }) {
  const builder: any = {}
  const methods = ['select', 'eq', 'neq', 'in', 'gte', 'order', 'limit', 'single', 'insert', 'update', 'delete']
  methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
  builder.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve)
  return { from: vi.fn().mockReturnValue(builder), _builder: builder } as any
}

describe('serviceService', () => {
  describe('getServices', () => {
    it('should return all active services', async () => {
      const mockServices = [
        { id: 's1', name_th: 'นวดไทย', is_active: true, sort_order: 1 },
        { id: 's2', name_th: 'นวดน้ำมัน', is_active: true, sort_order: 2 },
      ]
      const client = createMockClient({ data: mockServices, error: null })

      const result = await getServices(client)
      expect(result).toEqual(mockServices)
      expect(result).toHaveLength(2)
      expect(client.from).toHaveBeenCalledWith('services')
    })

    it('should throw on error', async () => {
      const client = createMockClient({ data: null, error: { message: 'DB error' } })
      await expect(getServices(client)).rejects.toBeDefined()
    })
  })

  describe('getServicesByCategory', () => {
    it('should return services filtered by category', async () => {
      const mockServices = [
        { id: 's1', name_th: 'นวดไทย', category: 'massage' },
      ]
      const client = createMockClient({ data: mockServices, error: null })

      const result = await getServicesByCategory(client, 'massage' as any)
      expect(result).toEqual(mockServices)
    })
  })

  describe('getServiceById', () => {
    it('should return service with addons', async () => {
      const mockService = { id: 's1', name_th: 'นวดไทย' }
      const mockAddons = [
        { id: 'addon1', name_th: 'อโรมา', is_active: true },
      ]

      const client: any = {
        from: vi.fn().mockImplementation((table: string) => {
          const builder: any = {}
          const methods = ['select', 'eq', 'neq', 'in', 'gte', 'order', 'limit', 'single', 'insert', 'update', 'delete']
          methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })

          if (table === 'services') {
            builder.then = (resolve: any) => Promise.resolve({ data: mockService, error: null }).then(resolve)
          } else {
            builder.then = (resolve: any) => Promise.resolve({ data: mockAddons, error: null }).then(resolve)
          }
          return builder
        }),
      }

      const result = await getServiceById(client, 's1')
      expect(result).toBeDefined()
      expect(result!.id).toBe('s1')
      expect(result!.addons).toEqual(mockAddons)
    })

    it('should return null when service not found', async () => {
      const client: any = {
        from: vi.fn().mockImplementation(() => {
          const builder: any = {}
          const methods = ['select', 'eq', 'neq', 'in', 'gte', 'order', 'limit', 'single', 'insert', 'update', 'delete']
          methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
          builder.then = (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve)
          return builder
        }),
      }

      const result = await getServiceById(client, 'bad-id')
      expect(result).toBeNull()
    })

    it('should return empty addons array when none exist', async () => {
      const client: any = {
        from: vi.fn().mockImplementation((table: string) => {
          const builder: any = {}
          const methods = ['select', 'eq', 'neq', 'in', 'gte', 'order', 'limit', 'single', 'insert', 'update', 'delete']
          methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })

          if (table === 'services') {
            builder.then = (resolve: any) => Promise.resolve({ data: { id: 's1' }, error: null }).then(resolve)
          } else {
            builder.then = (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve)
          }
          return builder
        }),
      }

      const result = await getServiceById(client, 's1')
      expect(result!.addons).toEqual([])
    })
  })

  describe('getServiceBySlug', () => {
    it('should return service by slug with addons', async () => {
      const mockService = { id: 's1', slug: 'thai-massage', name_th: 'นวดไทย' }

      const client: any = {
        from: vi.fn().mockImplementation((table: string) => {
          const builder: any = {}
          const methods = ['select', 'eq', 'neq', 'in', 'gte', 'order', 'limit', 'single', 'insert', 'update', 'delete']
          methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })

          if (table === 'services') {
            builder.then = (resolve: any) => Promise.resolve({ data: mockService, error: null }).then(resolve)
          } else {
            builder.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve)
          }
          return builder
        }),
      }

      const result = await getServiceBySlug(client, 'thai-massage')
      expect(result).toBeDefined()
      expect(result!.slug).toBe('thai-massage')
    })

    it('should return null when slug not found (PGRST116)', async () => {
      const client = createMockClient({ data: null, error: { code: 'PGRST116', message: 'not found' } })
      const result = await getServiceBySlug(client, 'non-existent')
      expect(result).toBeNull()
    })

    it('should throw on other errors', async () => {
      const client = createMockClient({ data: null, error: { code: '500', message: 'error' } })
      await expect(getServiceBySlug(client, 'test')).rejects.toBeDefined()
    })
  })
})
