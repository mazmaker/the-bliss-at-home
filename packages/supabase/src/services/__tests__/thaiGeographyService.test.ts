import { describe, it, expect, vi } from 'vitest'
import {
  getProvinces,
  getDistricts,
  getSubdistricts,
} from '../thaiGeographyService'

function createMockClient(resolveValue: any = { data: null, error: null }) {
  const builder: any = {}
  const methods = ['select', 'eq', 'neq', 'in', 'gte', 'order', 'limit', 'single', 'insert', 'update', 'delete']
  methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
  builder.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve)
  return { from: vi.fn().mockReturnValue(builder), _builder: builder } as any
}

describe('thaiGeographyService', () => {
  describe('getProvinces', () => {
    it('should return all provinces', async () => {
      const mockProvinces = [
        { id: 1, name_th: 'กรุงเทพมหานคร', name_en: 'Bangkok', province_code: 10 },
        { id: 2, name_th: 'เชียงใหม่', name_en: 'Chiang Mai', province_code: 50 },
      ]
      const client = createMockClient({ data: mockProvinces, error: null })

      const result = await getProvinces(client)
      expect(result).toEqual(mockProvinces)
      expect(result).toHaveLength(2)
      expect(client.from).toHaveBeenCalledWith('thai_provinces')
    })

    it('should return empty array when no data', async () => {
      const client = createMockClient({ data: null, error: null })
      const result = await getProvinces(client)
      expect(result).toEqual([])
    })

    it('should throw on error', async () => {
      const client = createMockClient({ data: null, error: { message: 'DB error' } })
      await expect(getProvinces(client)).rejects.toBeDefined()
    })
  })

  describe('getDistricts', () => {
    it('should return districts for a province', async () => {
      const mockDistricts = [
        { id: 1, province_id: 1, name_th: 'พระนคร', name_en: 'Phra Nakhon', district_code: 1001 },
        { id: 2, province_id: 1, name_th: 'ดุสิต', name_en: 'Dusit', district_code: 1002 },
      ]
      const client = createMockClient({ data: mockDistricts, error: null })

      const result = await getDistricts(client, 1)
      expect(result).toEqual(mockDistricts)
      expect(client.from).toHaveBeenCalledWith('thai_districts')
    })

    it('should return empty array when no data', async () => {
      const client = createMockClient({ data: null, error: null })
      const result = await getDistricts(client, 1)
      expect(result).toEqual([])
    })

    it('should throw on error', async () => {
      const client = createMockClient({ data: null, error: { message: 'error' } })
      await expect(getDistricts(client, 1)).rejects.toBeDefined()
    })
  })

  describe('getSubdistricts', () => {
    it('should return subdistricts for a district', async () => {
      const mockSubdistricts = [
        { id: 1, district_id: 1, name_th: 'พระบรมมหาราชวัง', name_en: 'Phra Borom Maha Ratchawang', zipcode: '10200' },
      ]
      const client = createMockClient({ data: mockSubdistricts, error: null })

      const result = await getSubdistricts(client, 1)
      expect(result).toEqual(mockSubdistricts)
      expect(client.from).toHaveBeenCalledWith('thai_subdistricts')
    })

    it('should return empty array when no data', async () => {
      const client = createMockClient({ data: null, error: null })
      const result = await getSubdistricts(client, 1)
      expect(result).toEqual([])
    })

    it('should throw on error', async () => {
      const client = createMockClient({ data: null, error: { message: 'error' } })
      await expect(getSubdistricts(client, 1)).rejects.toBeDefined()
    })
  })
})
