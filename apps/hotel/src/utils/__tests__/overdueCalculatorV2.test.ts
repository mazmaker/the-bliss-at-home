import { describe, it, expect, vi } from 'vitest'
import {
  calculateOverdueDays,
  createDueDateLegacy,
  getOverdueStatusLegacy,
  getMonthlyBillStatusLegacy,
  calculateLateFee,
  getOverdueStatus,
  createDueDate,
  formatOverdueMessage,
  getAdminContactInfo,
  type OverdueStatus,
} from '../overdueCalculatorV2'
import type { BillingSettings } from '../../services/billingSettingsService'

// Mock billingSettingsService to avoid Supabase dependency
vi.mock('../../services/billingSettingsService', () => ({
  getBillingSettings: vi.fn(),
}))

// ============================================
// Helper: default BillingSettings for async tests
// ============================================
function makeSettings(overrides: Partial<BillingSettings> = {}): BillingSettings {
  return {
    id: 'test-id',
    due_day_type: 'fixed_day',
    due_day_value: 15,
    due_months_after: 1,
    due_soon_days: 7,
    overdue_days: 7,
    warning_days: 15,
    urgent_days: 15,
    enable_late_fee: false,
    late_fee_type: 'percentage_per_day',
    late_fee_percentage: 0.1,
    late_fee_fixed_amount: 50,
    admin_contact_phone: '02-123-4567',
    admin_contact_email: 'admin@theblissathome.com',
    admin_contact_line_id: '@theblissathome',
    due_soon_message: 'ใกล้ถึงกำหนด',
    overdue_message: 'บิลค้างชำระ',
    warning_message: 'ค้างชำระนาน',
    urgent_message: 'ต้องชำระทันที',
    auto_email_reminder: true,
    auto_line_reminder: false,
    reminder_frequency_days: 7,
    bank_transfer_enabled: true,
    bank_name: 'KBank',
    bank_account_number: '123-456',
    bank_account_name: 'Bliss',
    cash_payment_enabled: true,
    office_address: '123 Bangkok',
    office_hours: '9-17',
    check_payment_enabled: false,
    is_active: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  }
}

// ============================================
// calculateOverdueDays (synchronous, no DB)
// ============================================
describe('calculateOverdueDays', () => {
  it('returns 0 when due date is today', () => {
    const today = new Date('2026-03-15')
    expect(calculateOverdueDays('2026-03-15', today)).toBe(0)
  })

  it('returns positive days when overdue', () => {
    const current = new Date('2026-03-20')
    expect(calculateOverdueDays('2026-03-15', current)).toBe(5)
  })

  it('returns negative days when not yet due', () => {
    const current = new Date('2026-03-10')
    expect(calculateOverdueDays('2026-03-15', current)).toBe(-5)
  })

  it('handles month boundaries correctly', () => {
    const current = new Date('2026-04-02')
    expect(calculateOverdueDays('2026-03-30', current)).toBe(3)
  })

  it('handles year boundaries correctly', () => {
    const current = new Date('2027-01-03')
    expect(calculateOverdueDays('2026-12-30', current)).toBe(4)
  })
})

// ============================================
// createDueDateLegacy (synchronous)
// ============================================
describe('createDueDateLegacy', () => {
  it('returns 15th of next month for given billing month', () => {
    expect(createDueDateLegacy('2026-01')).toBe('2026-02-15')
  })

  it('handles December correctly (wraps to next year)', () => {
    expect(createDueDateLegacy('2026-12')).toBe('2027-01-15')
  })

  it('handles February correctly', () => {
    expect(createDueDateLegacy('2026-02')).toBe('2026-03-15')
  })
})

// ============================================
// getOverdueStatusLegacy (synchronous)
// ============================================
describe('getOverdueStatusLegacy', () => {
  it('returns CURRENT for more than 7 days before due', () => {
    const status = getOverdueStatusLegacy(-10)
    expect(status.level).toBe('CURRENT')
    expect(status.color).toBe('green')
    expect(status.actionRequired).toBe(false)
  })

  it('returns DUE_SOON for 1-7 days before due', () => {
    const status = getOverdueStatusLegacy(-3)
    expect(status.level).toBe('DUE_SOON')
    expect(status.color).toBe('blue')
    expect(status.actionRequired).toBe(false)
  })

  it('returns DUE_SOON with actionRequired for due date today', () => {
    const status = getOverdueStatusLegacy(0)
    expect(status.level).toBe('DUE_SOON')
    expect(status.actionRequired).toBe(true)
  })

  it('returns OVERDUE for 1-7 days after due', () => {
    const status = getOverdueStatusLegacy(5)
    expect(status.level).toBe('OVERDUE')
    expect(status.color).toBe('yellow')
    expect(status.actionRequired).toBe(true)
  })

  it('returns WARNING for 8-15 days after due', () => {
    const status = getOverdueStatusLegacy(12)
    expect(status.level).toBe('WARNING')
    expect(status.color).toBe('orange')
    expect(status.actionRequired).toBe(true)
  })

  it('returns URGENT for more than 15 days after due', () => {
    const status = getOverdueStatusLegacy(20)
    expect(status.level).toBe('URGENT')
    expect(status.color).toBe('red')
    expect(status.actionRequired).toBe(true)
  })

  it('preserves days value', () => {
    const status = getOverdueStatusLegacy(-3)
    expect(status.days).toBe(-3)
  })

  it('returns boundary OVERDUE at exactly 7 days', () => {
    const status = getOverdueStatusLegacy(7)
    expect(status.level).toBe('OVERDUE')
  })

  it('returns boundary WARNING at exactly 15 days', () => {
    const status = getOverdueStatusLegacy(15)
    expect(status.level).toBe('WARNING')
  })
})

// ============================================
// getMonthlyBillStatusLegacy (synchronous)
// ============================================
describe('getMonthlyBillStatusLegacy', () => {
  it('returns CURRENT when well before due date', () => {
    // Due date for 2026-01 is 2026-02-15
    const currentDate = new Date('2026-02-01')
    const status = getMonthlyBillStatusLegacy('2026-01', currentDate)
    expect(status.level).toBe('CURRENT')
  })

  it('returns DUE_SOON when close to due date', () => {
    const currentDate = new Date('2026-02-12')
    const status = getMonthlyBillStatusLegacy('2026-01', currentDate)
    expect(status.level).toBe('DUE_SOON')
  })

  it('returns OVERDUE when past due date', () => {
    const currentDate = new Date('2026-02-18')
    const status = getMonthlyBillStatusLegacy('2026-01', currentDate)
    expect(status.level).toBe('OVERDUE')
  })

  it('returns URGENT when far past due date', () => {
    const currentDate = new Date('2026-03-05')
    const status = getMonthlyBillStatusLegacy('2026-01', currentDate)
    expect(status.level).toBe('URGENT')
  })
})

// ============================================
// createDueDate (async, with settings param)
// ============================================
describe('createDueDate', () => {
  it('returns fixed_day due date', async () => {
    const settings = makeSettings({ due_day_type: 'fixed_day', due_day_value: 20, due_months_after: 1 })
    const result = await createDueDate('2026-03', settings)
    expect(result).toBe('2026-04-20')
  })

  it('returns month_end due date', async () => {
    const settings = makeSettings({ due_day_type: 'month_end', due_months_after: 1 })
    // Bill for March → due end of April (30 days)
    const result = await createDueDate('2026-03', settings)
    expect(result).toBe('2026-04-30')
  })

  it('returns month_end for February (28 days)', async () => {
    const settings = makeSettings({ due_day_type: 'month_end', due_months_after: 0 })
    // Bill for Feb → due end of Feb (28 days in non-leap year 2026)
    const result = await createDueDate('2026-02', settings)
    expect(result).toBe('2026-02-28')
  })

  it('handles business_days_after', async () => {
    const settings = makeSettings({ due_day_type: 'business_days_after', due_day_value: 5, due_months_after: 1 })
    // Bill for Jan → due month is Feb, start from 1st, count 5 business days
    // Feb 1 = Sun (skip), Feb 2 = Mon(1), Feb 3 = Tue(2), Feb 4 = Wed(3), Feb 5 = Thu(4), Feb 6 = Fri(5)
    const result = await createDueDate('2026-01', settings)
    expect(result).toBe('2026-02-06')
  })

  it('defaults to day 15 for unknown due_day_type', async () => {
    const settings = makeSettings({ due_day_type: 'unknown' as any, due_months_after: 1 })
    const result = await createDueDate('2026-03', settings)
    expect(result).toBe('2026-04-15')
  })
})

// ============================================
// getOverdueStatus (async, with settings param)
// ============================================
describe('getOverdueStatus', () => {
  it('returns CURRENT when well before due', async () => {
    const settings = makeSettings({ due_soon_days: 7 })
    const status = await getOverdueStatus(-10, settings)
    expect(status.level).toBe('CURRENT')
    expect(status.actionRequired).toBe(false)
  })

  it('returns DUE_SOON when within due_soon_days', async () => {
    const settings = makeSettings({ due_soon_days: 7 })
    const status = await getOverdueStatus(-5, settings)
    expect(status.level).toBe('DUE_SOON')
  })

  it('returns DUE_SOON on due day with actionRequired', async () => {
    const settings = makeSettings()
    const status = await getOverdueStatus(0, settings)
    expect(status.level).toBe('DUE_SOON')
    expect(status.actionRequired).toBe(true)
  })

  it('returns OVERDUE within overdue threshold', async () => {
    const settings = makeSettings({ overdue_days: 7 })
    const status = await getOverdueStatus(5, settings)
    expect(status.level).toBe('OVERDUE')
    expect(status.actionRequired).toBe(true)
  })

  it('returns WARNING within warning threshold', async () => {
    const settings = makeSettings({ overdue_days: 7, warning_days: 15 })
    const status = await getOverdueStatus(12, settings)
    expect(status.level).toBe('WARNING')
  })

  it('returns URGENT beyond warning threshold', async () => {
    const settings = makeSettings({ overdue_days: 7, warning_days: 15, urgent_days: 15 })
    const status = await getOverdueStatus(20, settings)
    expect(status.level).toBe('URGENT')
    expect(status.color).toBe('red')
  })
})

// ============================================
// calculateLateFee (async, with settings param)
// ============================================
describe('calculateLateFee', () => {
  it('returns 0 when late fees are disabled', async () => {
    const settings = makeSettings({ enable_late_fee: false })
    const fee = await calculateLateFee(10000, 10, settings)
    expect(fee).toBe(0)
  })

  it('returns 0 when not overdue', async () => {
    const settings = makeSettings({ enable_late_fee: true })
    const fee = await calculateLateFee(10000, -5, settings)
    expect(fee).toBe(0)
  })

  it('returns 0 when exactly on due date', async () => {
    const settings = makeSettings({ enable_late_fee: true })
    const fee = await calculateLateFee(10000, 0, settings)
    expect(fee).toBe(0)
  })

  it('calculates percentage-based late fee correctly', async () => {
    const settings = makeSettings({
      enable_late_fee: true,
      late_fee_type: 'percentage_per_day',
      late_fee_percentage: 0.1, // 0.1% per day
    })
    // 10000 * 0.1/100 * 10 days = 100
    const fee = await calculateLateFee(10000, 10, settings)
    expect(fee).toBe(100)
  })

  it('calculates fixed-amount late fee correctly', async () => {
    const settings = makeSettings({
      enable_late_fee: true,
      late_fee_type: 'fixed_per_day',
      late_fee_fixed_amount: 50, // 50 baht per day
    })
    // 50 * 10 days = 500
    const fee = await calculateLateFee(10000, 10, settings)
    expect(fee).toBe(500)
  })

  it('rounds to 2 decimal places', async () => {
    const settings = makeSettings({
      enable_late_fee: true,
      late_fee_type: 'percentage_per_day',
      late_fee_percentage: 0.15, // 0.15% per day
    })
    // 10000 * 0.15/100 * 3 = 45.0
    const fee = await calculateLateFee(10000, 3, settings)
    expect(fee).toBe(45)
  })
})

// ============================================
// formatOverdueMessage (async, with settings param)
// ============================================
describe('formatOverdueMessage', () => {
  it('formats CURRENT message', async () => {
    const settings = makeSettings()
    const status: OverdueStatus = {
      level: 'CURRENT', days: -10, color: 'green', bgColor: 'bg-green-100',
      textColor: 'text-green-700', icon: '✅', message: 'ปัจจุบัน', actionRequired: false,
    }
    const msg = await formatOverdueMessage(status, 5000, settings)
    expect(msg.title).toContain('✅')
    expect(msg.description).toContain('฿5,000')
  })

  it('formats OVERDUE message with amount', async () => {
    const settings = makeSettings({ overdue_message: 'กรุณาชำระ' })
    const status: OverdueStatus = {
      level: 'OVERDUE', days: 5, color: 'yellow', bgColor: 'bg-amber-100',
      textColor: 'text-amber-700', icon: '🟡', message: 'เลยกำหนด 5 วัน', actionRequired: true,
    }
    const msg = await formatOverdueMessage(status, 28750, settings)
    expect(msg.title).toContain('บิลค้างชำระ')
    expect(msg.description).toContain('฿28,750')
    expect(msg.description).toContain('กรุณาชำระ')
  })

  it('formats URGENT message', async () => {
    const settings = makeSettings({ urgent_message: 'ต้องชำระทันที' })
    const status: OverdueStatus = {
      level: 'URGENT', days: 30, color: 'red', bgColor: 'bg-red-100',
      textColor: 'text-red-700', icon: '🔴', message: 'เลยกำหนด 30 วัน', actionRequired: true,
    }
    const msg = await formatOverdueMessage(status, undefined, settings)
    expect(msg.title).toContain('ด่วน')
    expect(msg.actionText).toBe('จ่ายด่วน')
  })

  it('formats DUE_SOON message', async () => {
    const settings = makeSettings()
    const status: OverdueStatus = {
      level: 'DUE_SOON', days: -3, color: 'blue', bgColor: 'bg-blue-100',
      textColor: 'text-blue-700', icon: '📅', message: 'ใกล้กำหนด 3 วัน', actionRequired: false,
    }
    const msg = await formatOverdueMessage(status, 15000, settings)
    expect(msg.actionText).toBe('ดูวิธีการชำระ')
  })
})

// ============================================
// getAdminContactInfo
// ============================================
describe('getAdminContactInfo', () => {
  it('returns contact info from settings', async () => {
    const settings = makeSettings({
      admin_contact_phone: '081-234-5678',
      admin_contact_email: 'test@test.com',
      admin_contact_line_id: '@test',
    })
    const info = await getAdminContactInfo(settings)
    expect(info.phone).toBe('081-234-5678')
    expect(info.email).toBe('test@test.com')
    expect(info.lineId).toBe('@test')
  })
})
