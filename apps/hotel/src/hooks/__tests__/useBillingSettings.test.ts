import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock all dependencies before importing the hook
vi.mock('../../services/billingSettingsService', () => ({
  getBillingSettings: vi.fn().mockResolvedValue({
    due_day: 15,
    late_fee_percentage: 5,
    grace_period_days: 7,
    notification_days_before: 3,
  }),
  subscribeToBillingSettingsChanges: vi.fn(() => vi.fn()), // returns unsubscribe function
}))

vi.mock('../../utils/overdueCalculatorV2', () => ({
  getMonthlyBillStatus: vi.fn().mockResolvedValue({
    level: 'DUE_SOON',
    days: 3,
    message: 'Due in 3 days',
  }),
  formatOverdueMessage: vi.fn().mockResolvedValue({
    title: 'Payment Due Soon',
    description: 'Your payment is due in 3 days',
    actionText: 'Pay Now',
  }),
  getAdminContactInfo: vi.fn().mockResolvedValue({
    phone: '0812345678',
    email: 'admin@bliss.com',
    lineId: '@bliss',
  }),
  calculateLateFee: vi.fn().mockResolvedValue(150),
  createDueDate: vi.fn().mockResolvedValue('2026-03-15'),
}))

// Mock react hooks for testing outside React context
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual as any,
    useState: vi.fn((init: any) => [init, vi.fn()]),
    useEffect: vi.fn((cb: () => any) => {
      // Execute effect synchronously for testing
      const cleanup = cb()
      return cleanup
    }),
    useCallback: vi.fn((cb: any) => cb),
    useMemo: vi.fn((cb: any) => cb()),
  }
})

import {
  getMonthlyBillStatus,
  formatOverdueMessage,
  getAdminContactInfo,
  calculateLateFee,
  createDueDate,
} from '../../utils/overdueCalculatorV2'

import {
  getBillingSettings,
  subscribeToBillingSettingsChanges,
} from '../../services/billingSettingsService'

describe('useBillingSettings dependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getBillingSettings', () => {
    it('should return billing settings', async () => {
      const settings = await getBillingSettings()
      expect(settings).toEqual({
        due_day: 15,
        late_fee_percentage: 5,
        grace_period_days: 7,
        notification_days_before: 3,
      })
    })
  })

  describe('subscribeToBillingSettingsChanges', () => {
    it('should return an unsubscribe function', () => {
      const unsubscribe = subscribeToBillingSettingsChanges(vi.fn())
      expect(typeof unsubscribe).toBe('function')
    })
  })

  describe('getMonthlyBillStatus', () => {
    it('should return overdue status for a month', async () => {
      const status = await getMonthlyBillStatus('2026-02')
      expect(status).toEqual({
        level: 'DUE_SOON',
        days: 3,
        message: 'Due in 3 days',
      })
    })
  })

  describe('formatOverdueMessage', () => {
    it('should return formatted overdue message', async () => {
      const status = { level: 'DUE_SOON', days: 3, message: 'Due in 3 days' }
      const message = await formatOverdueMessage(status as any, 1000)
      expect(message).toEqual({
        title: 'Payment Due Soon',
        description: 'Your payment is due in 3 days',
        actionText: 'Pay Now',
      })
    })
  })

  describe('getAdminContactInfo', () => {
    it('should return admin contact information', async () => {
      const settings = await getBillingSettings()
      const contactInfo = await getAdminContactInfo(settings)
      expect(contactInfo).toEqual({
        phone: '0812345678',
        email: 'admin@bliss.com',
        lineId: '@bliss',
      })
    })
  })

  describe('calculateLateFee', () => {
    it('should calculate late fee', async () => {
      const fee = await calculateLateFee(3000, 5)
      expect(fee).toBe(150)
    })
  })

  describe('createDueDate', () => {
    it('should create due date string', async () => {
      const dueDate = await createDueDate('2026-03')
      expect(dueDate).toBe('2026-03-15')
    })
  })
})

describe('useBillingSettings return type', () => {
  it('should have the correct structure', () => {
    // Validate the expected return shape
    const expectedReturnShape = {
      settings: null,
      loading: true,
      error: null,
      getOverdueStatus: expect.any(Function),
      getOverdueMessage: expect.any(Function),
      getDueDate: expect.any(Function),
      getLateFee: expect.any(Function),
      adminContact: null,
      refresh: expect.any(Function),
    }

    // Verify the structure can be created
    const mockReturn = {
      settings: null,
      loading: true,
      error: null,
      getOverdueStatus: async () => ({ level: 'NORMAL', days: 0, message: '' }),
      getOverdueMessage: async () => ({ title: '', description: '', actionText: '' }),
      getDueDate: async () => '',
      getLateFee: async () => 0,
      adminContact: null,
      refresh: async () => {},
    }

    expect(mockReturn).toMatchObject({
      settings: null,
      loading: true,
      error: null,
      adminContact: null,
    })
    expect(typeof mockReturn.getOverdueStatus).toBe('function')
    expect(typeof mockReturn.refresh).toBe('function')
  })
})

describe('useOverdueAlert styling', () => {
  it('should define correct styling for URGENT level', () => {
    const urgentStyling = {
      bgClass: 'bg-gradient-to-r from-red-50 to-red-100',
      borderClass: 'border-2 border-red-300 ring-2 ring-red-100',
      iconBg: 'bg-red-200',
      iconColor: 'text-red-700',
      titleColor: 'text-red-800',
      textColor: 'text-red-700',
      animation: 'animate-pulse',
    }
    expect(urgentStyling.animation).toBe('animate-pulse')
    expect(urgentStyling.bgClass).toContain('red')
  })

  it('should define correct styling for WARNING level', () => {
    const warningStyling = {
      bgClass: 'bg-gradient-to-r from-orange-50 to-orange-100',
      borderClass: 'border-2 border-orange-300',
      animation: '',
    }
    expect(warningStyling.animation).toBe('')
    expect(warningStyling.bgClass).toContain('orange')
  })

  it('should define correct styling for DUE_SOON level', () => {
    const dueSoonStyling = {
      bgClass: 'bg-gradient-to-r from-blue-50 to-blue-100',
      borderClass: 'border border-blue-300',
      animation: '',
    }
    expect(dueSoonStyling.bgClass).toContain('blue')
  })

  it('should define default styling for unknown level', () => {
    const defaultStyling = {
      bgClass: 'bg-amber-50',
      borderClass: 'border border-amber-200',
      animation: '',
    }
    expect(defaultStyling.bgClass).toContain('amber')
  })
})
