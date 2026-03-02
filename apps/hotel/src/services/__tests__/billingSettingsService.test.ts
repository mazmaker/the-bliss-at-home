import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to ensure mock variables are available when vi.mock is hoisted
const { mockSingle, mockEq, mockSelect, mockFrom } = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockEq = vi.fn(() => ({ single: mockSingle }))
  const mockSelect = vi.fn(() => ({ eq: mockEq }))
  const mockFrom = vi.fn(() => ({ select: mockSelect }))
  return { mockSingle, mockEq, mockSelect, mockFrom }
})

vi.mock('@bliss/supabase/auth', () => ({
  supabase: {
    from: mockFrom,
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}))

import {
  getBillingSettings,
  clearBillingSettingsCache,
  getBillingSetting,
  getFormattedPaymentMethods,
  type BillingSettings,
} from '../billingSettingsService'

const FULL_SETTINGS: BillingSettings = {
  id: 'settings-1',
  due_day_type: 'fixed_day',
  due_day_value: 15,
  due_months_after: 1,
  due_soon_days: 7,
  overdue_days: 7,
  warning_days: 15,
  urgent_days: 15,
  enable_late_fee: true,
  late_fee_type: 'percentage_per_day',
  late_fee_percentage: 0.1,
  late_fee_fixed_amount: 50,
  admin_contact_phone: '081-234-5678',
  admin_contact_email: 'admin@test.com',
  admin_contact_line_id: '@test',
  due_soon_message: 'ใกล้กำหนด',
  overdue_message: 'เลยกำหนด',
  warning_message: 'เตือน',
  urgent_message: 'ด่วน',
  auto_email_reminder: true,
  auto_line_reminder: false,
  reminder_frequency_days: 7,
  bank_transfer_enabled: true,
  bank_name: 'ธนาคารกสิกรไทย',
  bank_account_number: '123-456',
  bank_account_name: 'Bliss Co.',
  cash_payment_enabled: true,
  office_address: '123 Bangkok',
  office_hours: '9-17',
  check_payment_enabled: false,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  clearBillingSettingsCache()
  vi.clearAllMocks()
})

// ============================================
// getBillingSettings
// ============================================
describe('getBillingSettings', () => {
  it('returns settings from database', async () => {
    mockSingle.mockResolvedValueOnce({ data: FULL_SETTINGS, error: null })

    const settings = await getBillingSettings()
    expect(settings.due_day_type).toBe('fixed_day')
    expect(settings.due_day_value).toBe(15)
    expect(settings.enable_late_fee).toBe(true)
  })

  it('returns default settings when database errors', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })

    const settings = await getBillingSettings()
    expect(settings.due_day_type).toBe('fixed_day')
    expect(settings.due_day_value).toBe(15)
  })

  it('uses cached settings on second call', async () => {
    mockSingle.mockResolvedValueOnce({ data: FULL_SETTINGS, error: null })

    await getBillingSettings()
    await getBillingSettings()

    // from() should only be called once due to caching
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('refreshes cache when forceRefresh is true', async () => {
    mockSingle.mockResolvedValue({ data: FULL_SETTINGS, error: null })

    await getBillingSettings()
    await getBillingSettings(true)

    // from() should be called twice
    expect(mockFrom).toHaveBeenCalledTimes(2)
  })
})

// ============================================
// clearBillingSettingsCache
// ============================================
describe('clearBillingSettingsCache', () => {
  it('clears cache so next call fetches from DB', async () => {
    mockSingle.mockResolvedValue({ data: FULL_SETTINGS, error: null })

    await getBillingSettings()
    clearBillingSettingsCache()
    await getBillingSettings()

    expect(mockFrom).toHaveBeenCalledTimes(2)
  })
})

// ============================================
// getBillingSetting
// ============================================
describe('getBillingSetting', () => {
  it('returns a specific setting value', async () => {
    mockSingle.mockResolvedValueOnce({ data: FULL_SETTINGS, error: null })

    const value = await getBillingSetting('due_day_value')
    expect(value).toBe(15)
  })

  it('returns boolean setting', async () => {
    mockSingle.mockResolvedValueOnce({ data: FULL_SETTINGS, error: null })

    const value = await getBillingSetting('enable_late_fee')
    expect(value).toBe(true)
  })
})

// ============================================
// getFormattedPaymentMethods
// ============================================
describe('getFormattedPaymentMethods', () => {
  it('returns enabled bank transfer details', async () => {
    mockSingle.mockResolvedValueOnce({ data: FULL_SETTINGS, error: null })

    const methods = await getFormattedPaymentMethods()
    expect(methods.bankTransfer?.enabled).toBe(true)
    expect(methods.bankTransfer?.bankName).toBe('ธนาคารกสิกรไทย')
    expect(methods.bankTransfer?.accountNumber).toBe('123-456')
  })

  it('returns enabled cash payment details', async () => {
    mockSingle.mockResolvedValueOnce({ data: FULL_SETTINGS, error: null })

    const methods = await getFormattedPaymentMethods()
    expect(methods.cashPayment?.enabled).toBe(true)
    expect(methods.cashPayment?.address).toBe('123 Bangkok')
  })

  it('returns disabled check payment', async () => {
    mockSingle.mockResolvedValueOnce({ data: FULL_SETTINGS, error: null })

    const methods = await getFormattedPaymentMethods()
    expect(methods.checkPayment?.enabled).toBe(false)
  })

  it('returns disabled when bank transfer is off', async () => {
    const settingsNoBankTransfer = { ...FULL_SETTINGS, bank_transfer_enabled: false }
    mockSingle.mockResolvedValueOnce({ data: settingsNoBankTransfer, error: null })

    const methods = await getFormattedPaymentMethods()
    expect(methods.bankTransfer?.enabled).toBe(false)
    expect(methods.bankTransfer?.bankName).toBeUndefined()
  })
})
