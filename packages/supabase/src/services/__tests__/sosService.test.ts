import { describe, it, expect, vi } from 'vitest'
import {
  createSOSAlert,
  getCustomerSOSAlerts,
  cancelSOSAlert,
} from '../sosService'

function createMockClient(resolveValue: any = { data: null, error: null }) {
  const builder: any = {}
  const methods = ['select', 'eq', 'neq', 'in', 'gte', 'order', 'limit', 'single', 'insert', 'update', 'delete']
  methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
  builder.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve)
  return { from: vi.fn().mockReturnValue(builder), _builder: builder } as any
}

describe('sosService', () => {
  describe('createSOSAlert', () => {
    it('should create an SOS alert with all fields', async () => {
      const mockAlert = {
        id: 'sos-1',
        customer_id: 'c1',
        latitude: 13.7563,
        longitude: 100.5018,
        status: 'pending',
        priority: 'high',
      }
      const client = createMockClient({ data: mockAlert, error: null })

      const result = await createSOSAlert(client, {
        customer_id: 'c1',
        latitude: 13.7563,
        longitude: 100.5018,
        message: 'Need help!',
        priority: 'high',
      })

      expect(result).toEqual(mockAlert)
      expect(client.from).toHaveBeenCalledWith('sos_alerts')
    })

    it('should create alert with minimal input', async () => {
      const mockAlert = { id: 'sos-2', status: 'pending', priority: 'high' }
      const client = createMockClient({ data: mockAlert, error: null })

      const result = await createSOSAlert(client, {})
      expect(result.status).toBe('pending')
      expect(result.priority).toBe('high')
    })

    it('should default priority to high', async () => {
      const mockAlert = { id: 'sos-3', priority: 'high' }
      const client = createMockClient({ data: mockAlert, error: null })

      const result = await createSOSAlert(client, { customer_id: 'c1' })
      expect(result.priority).toBe('high')
    })

    it('should allow custom priority', async () => {
      const mockAlert = { id: 'sos-4', priority: 'critical' }
      const client = createMockClient({ data: mockAlert, error: null })

      await createSOSAlert(client, { priority: 'critical' })
      expect(client.from).toHaveBeenCalledWith('sos_alerts')
    })

    it('should throw on error', async () => {
      const client = createMockClient({ data: null, error: { message: 'Insert failed' } })
      await expect(createSOSAlert(client, {})).rejects.toBeDefined()
    })
  })

  describe('getCustomerSOSAlerts', () => {
    it('should return SOS alerts for customer', async () => {
      const mockAlerts = [
        { id: 'sos-1', status: 'pending' },
        { id: 'sos-2', status: 'resolved' },
      ]
      const client = createMockClient({ data: mockAlerts, error: null })

      const result = await getCustomerSOSAlerts(client, 'c1')
      expect(result).toEqual(mockAlerts)
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no alerts', async () => {
      const client = createMockClient({ data: null, error: null })
      const result = await getCustomerSOSAlerts(client, 'c1')
      expect(result).toEqual([])
    })

    it('should throw on error', async () => {
      const client = createMockClient({ data: null, error: { message: 'error' } })
      await expect(getCustomerSOSAlerts(client, 'c1')).rejects.toBeDefined()
    })
  })

  describe('cancelSOSAlert', () => {
    it('should cancel an SOS alert', async () => {
      const mockCancelled = { id: 'sos-1', status: 'cancelled' }
      const client = createMockClient({ data: mockCancelled, error: null })

      const result = await cancelSOSAlert(client, 'sos-1')
      expect(result.status).toBe('cancelled')
    })

    it('should throw on error', async () => {
      const client = createMockClient({ data: null, error: { message: 'error' } })
      await expect(cancelSOSAlert(client, 'sos-1')).rejects.toBeDefined()
    })
  })
})
