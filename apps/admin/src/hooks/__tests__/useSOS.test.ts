import { describe, it, expect, vi } from 'vitest'

// Mock dependencies
vi.mock('../../lib/sosQueries', () => ({
  getAllSOSAlerts: vi.fn().mockResolvedValue([]),
  getPendingSOSAlerts: vi.fn().mockResolvedValue([]),
  acknowledgeSOSAlert: vi.fn().mockResolvedValue(null),
  resolveSOSAlert: vi.fn().mockResolvedValue(null),
  cancelSOSAlert: vi.fn().mockResolvedValue(null),
  getSOSStatistics: vi.fn().mockResolvedValue({
    total: 0,
    pending: 0,
    acknowledged: 0,
    resolved: 0,
    from_customers: 0,
    from_staff: 0,
    last_24_hours: 0,
  }),
}))

import {
  useSOSAlerts,
  usePendingSOSAlerts,
  useSOSAlertActions,
  useSOSStatistics,
} from '../useSOS'

describe('useSOS hooks', () => {
  it('exports useSOSAlerts as a function', () => {
    expect(typeof useSOSAlerts).toBe('function')
  })

  it('exports usePendingSOSAlerts as a function', () => {
    expect(typeof usePendingSOSAlerts).toBe('function')
  })

  it('exports useSOSAlertActions as a function', () => {
    expect(typeof useSOSAlertActions).toBe('function')
  })

  it('exports useSOSStatistics as a function', () => {
    expect(typeof useSOSStatistics).toBe('function')
  })
})
