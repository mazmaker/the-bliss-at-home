import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFromFn, mockChannelObj, mockRemoveChannel } = vi.hoisted(() => ({
  mockFromFn: vi.fn(),
  mockChannelObj: { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() },
  mockRemoveChannel: vi.fn(),
}))

vi.mock('../../auth/supabaseClient', () => ({
  supabase: {
    from: mockFromFn,
    channel: vi.fn().mockReturnValue(mockChannelObj),
    removeChannel: mockRemoveChannel,
  },
}))

function createBuilder(resolveValue: any = { data: null, error: null }) {
  const b: any = {}
  const m = ['select', 'eq', 'neq', 'in', 'gte', 'lte', 'order', 'limit', 'single', 'insert', 'update', 'delete', 'is']
  m.forEach(k => { b[k] = vi.fn().mockReturnValue(b) })
  b.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve)
  return b
}

import {
  getEarningsSummary,
  getDailyEarnings,
  getServiceEarnings,
  getPayoutHistory,
  getBankAccounts,
  addBankAccount,
  updateBankAccount,
  setPrimaryBankAccount,
  deleteBankAccount,
  subscribeToPayouts,
} from '../earningsService'

describe('earningsService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getEarningsSummary', () => {
    it('should calculate earnings', async () => {
      const today = new Date().toISOString().split('T')[0]
      const jobs = [
        { staff_earnings: 500, duration_minutes: 120, scheduled_date: today, status: 'completed' },
        { staff_earnings: 300, duration_minutes: 60, scheduled_date: today, status: 'completed' },
      ]
      mockFromFn
        .mockReturnValueOnce(createBuilder({ data: jobs, error: null }))   // jobs
        .mockReturnValueOnce(createBuilder({ data: [{ net_amount: 200 }], error: null })) // payouts
        .mockReturnValueOnce(createBuilder({ data: [{ rating: 5 }, { rating: 4 }], error: null })) // ratings

      const result = await getEarningsSummary('s1')
      expect(result.today_earnings).toBe(800)
      expect(result.today_jobs).toBe(2)
      expect(result.pending_payout).toBe(200)
      expect(result.average_rating).toBe(4.5)
    })

    it('should handle no jobs', async () => {
      mockFromFn
        .mockReturnValueOnce(createBuilder({ data: [], error: null }))
        .mockReturnValueOnce(createBuilder({ data: null, error: null }))
        .mockReturnValueOnce(createBuilder({ data: null, error: null }))

      const result = await getEarningsSummary('s1')
      expect(result.today_earnings).toBe(0)
      expect(result.average_rating).toBe(0)
    })

    it('should throw on error', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: { message: 'DB error' } }))
      await expect(getEarningsSummary('s1')).rejects.toBeTruthy()
    })
  })

  describe('getDailyEarnings', () => {
    it('should group jobs by date', async () => {
      const jobs = [
        { staff_earnings: 500, duration_minutes: 120, scheduled_date: '2026-01-15' },
        { staff_earnings: 300, duration_minutes: 60, scheduled_date: '2026-01-15' },
      ]
      mockFromFn.mockReturnValueOnce(createBuilder({ data: jobs, error: null }))

      const result = await getDailyEarnings('s1', '2026-01-15', '2026-01-16')
      const day15 = result.find(d => d.date === '2026-01-15')
      expect(day15?.earnings).toBe(800)
      expect(day15?.jobs).toBe(2)
    })

    it('should throw on error', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: { message: 'Error' } }))
      await expect(getDailyEarnings('s1', '2026-01-01', '2026-01-31')).rejects.toBeTruthy()
    })
  })

  describe('getServiceEarnings', () => {
    it('should group by service with percentages', async () => {
      const jobs = [
        { service_name: 'Thai', service_name_en: 'Thai', staff_earnings: 600 },
        { service_name: 'Thai', service_name_en: 'Thai', staff_earnings: 400 },
        { service_name: 'Oil', service_name_en: 'Oil', staff_earnings: 500 },
      ]
      mockFromFn.mockReturnValueOnce(createBuilder({ data: jobs, error: null }))

      const result = await getServiceEarnings('s1', '2026-01-01', '2026-01-31')
      expect(result[0].service_name).toBe('Thai')
      expect(result[0].total_earnings).toBe(1000)
      expect(result[0].percentage).toBe(67)
    })
  })

  describe('getPayoutHistory', () => {
    it('should fetch payouts', async () => {
      const payouts = [{ id: 'p1', net_amount: 5000 }]
      mockFromFn.mockReturnValueOnce(createBuilder({ data: payouts, error: null }))
      const result = await getPayoutHistory('s1')
      expect(result).toEqual(payouts)
    })

    it('should return empty on null data', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: null }))
      expect(await getPayoutHistory('s1')).toEqual([])
    })
  })

  describe('getBankAccounts', () => {
    it('should fetch accounts', async () => {
      const accounts = [{ id: 'ba1', bank_name: 'KBank', is_primary: true }]
      mockFromFn.mockReturnValueOnce(createBuilder({ data: accounts, error: null }))
      expect(await getBankAccounts('s1')).toEqual(accounts)
    })
  })

  describe('addBankAccount', () => {
    it('should insert account', async () => {
      const acct = { id: 'ba-new', bank_code: 'KBANK' }
      mockFromFn.mockReturnValueOnce(createBuilder({ data: acct, error: null }))
      const result = await addBankAccount('s1', 'KBANK', 'KBank', '123', 'Name')
      expect(result).toEqual(acct)
    })

    it('should unset primary when isPrimary=true', async () => {
      mockFromFn
        .mockReturnValueOnce(createBuilder({ data: null, error: null })) // unset old
        .mockReturnValueOnce(createBuilder({ data: { id: 'ba-new', is_primary: true }, error: null })) // insert
      const result = await addBankAccount('s1', 'KBANK', 'KBank', '123', 'Name', true)
      expect(result.is_primary).toBe(true)
    })
  })

  describe('updateBankAccount', () => {
    it('should update account', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: { id: 'ba1' }, error: null }))
      const result = await updateBankAccount('ba1', {} as any)
      expect(result).toEqual({ id: 'ba1' })
    })
  })

  describe('setPrimaryBankAccount', () => {
    it('should unset then set primary', async () => {
      mockFromFn
        .mockReturnValueOnce(createBuilder({ data: null, error: null }))
        .mockReturnValueOnce(createBuilder({ data: null, error: null }))
      await setPrimaryBankAccount('s1', 'ba2')
      expect(mockFromFn).toHaveBeenCalledTimes(2)
    })
  })

  describe('deleteBankAccount', () => {
    it('should delete', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: null }))
      await deleteBankAccount('ba1')
    })

    it('should throw on error', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: { message: 'Not found' } }))
      await expect(deleteBankAccount('ba1')).rejects.toBeTruthy()
    })
  })

  describe('subscribeToPayouts', () => {
    it('should create subscription', () => {
      const unsub = subscribeToPayouts('s1', vi.fn())
      expect(typeof unsub).toBe('function')
    })

    it('should remove channel on unsubscribe', () => {
      const unsub = subscribeToPayouts('s1', vi.fn())
      unsub()
      expect(mockRemoveChannel).toHaveBeenCalled()
    })
  })
})
