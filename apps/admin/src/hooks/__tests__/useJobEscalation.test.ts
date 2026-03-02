import { describe, it, expect, vi } from 'vitest'

// Mock dependencies
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          })),
        })),
      })),
    })),
  },
}))

vi.mock('../useAdminAuth', () => ({
  useAdminAuth: vi.fn(() => ({ user: null })),
}))

vi.mock('../../utils/soundAlert', () => ({
  soundAlertService: {
    playSOSAlert: vi.fn(),
    isSoundMuted: vi.fn(() => false),
  },
}))

import { useJobEscalation } from '../useJobEscalation'
import type { JobEscalationAlert } from '../useJobEscalation'

describe('useJobEscalation', () => {
  it('exports useJobEscalation as a function', () => {
    expect(typeof useJobEscalation).toBe('function')
  })

  it('has the correct function name', () => {
    expect(useJobEscalation.name).toBe('useJobEscalation')
  })
})

describe('JobEscalationAlert type', () => {
  it('can create a valid JobEscalationAlert object', () => {
    const alert: JobEscalationAlert = {
      id: 'alert-1',
      type: 'job_no_staff_warning',
      title: 'Warning',
      message: 'No staff assigned',
      data: null,
      is_read: false,
      created_at: '2026-01-01T00:00:00Z',
    }
    expect(alert.id).toBe('alert-1')
    expect(alert.type).toBe('job_no_staff_warning')
    expect(alert.is_read).toBe(false)
  })

  it('supports urgent type', () => {
    const alert: JobEscalationAlert = {
      id: 'alert-2',
      type: 'job_no_staff_urgent',
      title: 'Urgent',
      message: 'Urgent escalation',
      data: { bookingId: '123' },
      is_read: false,
      created_at: '2026-01-01T00:00:00Z',
    }
    expect(alert.type).toBe('job_no_staff_urgent')
    expect(alert.data).toEqual({ bookingId: '123' })
  })
})
