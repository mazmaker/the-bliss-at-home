import { describe, it, expect, vi } from 'vitest'

// Mock dependencies
vi.mock('../../lib/sosQueries', () => ({
  getAllSOSAlerts: vi.fn().mockResolvedValue([]),
  getPendingSOSAlerts: vi.fn().mockResolvedValue([]),
  acknowledgeSOSAlert: vi.fn(),
  resolveSOSAlert: vi.fn(),
  cancelSOSAlert: vi.fn(),
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

vi.mock('../useSOS', () => ({
  usePendingSOSAlerts: vi.fn(() => ({
    alerts: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  })),
}))

vi.mock('../../utils/notificationService', () => ({
  notificationService: {
    requestPermission: vi.fn().mockResolvedValue(false),
    showSOSNotification: vi.fn(),
  },
}))

vi.mock('../../utils/soundAlert', () => ({
  soundAlertService: {
    isSoundMuted: vi.fn(() => false),
    toggleMute: vi.fn(() => true),
    startRepeatingAlert: vi.fn(),
    stopRepeatingAlert: vi.fn(),
    stopAllRepeatingAlerts: vi.fn(),
    playTestSound: vi.fn(),
    enableAudio: vi.fn().mockResolvedValue(true),
    isAudioContextReady: vi.fn(() => false),
    isRepeating: vi.fn(() => false),
  },
}))

import { useSOSNotifications } from '../useSOSNotifications'

describe('useSOSNotifications', () => {
  it('exports useSOSNotifications as a function', () => {
    expect(typeof useSOSNotifications).toBe('function')
  })

  it('has the correct function name', () => {
    expect(useSOSNotifications.name).toBe('useSOSNotifications')
  })
})
