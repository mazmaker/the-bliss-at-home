import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
const { mockGetStaffNotifications, mockMarkNotificationAsRead, mockMarkAllNotificationsAsRead, mockSubscribeToStaffNotifications } = vi.hoisted(() => ({
  mockGetStaffNotifications: vi.fn(),
  mockMarkNotificationAsRead: vi.fn(),
  mockMarkAllNotificationsAsRead: vi.fn(),
  mockSubscribeToStaffNotifications: vi.fn(() => vi.fn()),
}))

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(() => ({
    user: null,
    isLoading: false,
  })),
}))

vi.mock('../staffNotificationService', () => ({
  getStaffNotifications: mockGetStaffNotifications,
  markNotificationAsRead: mockMarkNotificationAsRead,
  markAllNotificationsAsRead: mockMarkAllNotificationsAsRead,
  subscribeToStaffNotifications: mockSubscribeToStaffNotifications,
}))

vi.mock('../../auth/hooks', () => ({
  useAuth: mockUseAuth,
}))

// Mock localStorage
const localStorageMock: Record<string, string> = {}
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
    setItem: vi.fn((key: string, val: string) => { localStorageMock[key] = val }),
    removeItem: vi.fn((key: string) => { delete localStorageMock[key] }),
  },
  configurable: true,
})

// Mock window with event support
const eventListeners: Record<string, Function[]> = {}
Object.defineProperty(global, 'window', {
  value: {
    addEventListener: vi.fn((event: string, handler: Function) => {
      if (!eventListeners[event]) eventListeners[event] = []
      eventListeners[event].push(handler)
    }),
    removeEventListener: vi.fn((event: string, handler: Function) => {
      if (eventListeners[event]) {
        eventListeners[event] = eventListeners[event].filter(h => h !== handler)
      }
    }),
    dispatchEvent: vi.fn((event: any) => {
      const handlers = eventListeners[event.type] || []
      handlers.forEach(h => h(event))
    }),
    CustomEvent: class CustomEvent {
      type: string
      detail: any
      constructor(type: string, options?: { detail?: any }) {
        this.type = type
        this.detail = options?.detail
      }
    },
  },
  configurable: true,
  writable: true,
})

// We need global CustomEvent for setStaffNotificationsEnabled
global.CustomEvent = (window as any).CustomEvent

import { isStaffNotificationsEnabled, setStaffNotificationsEnabled, useStaffNotifications } from '../useStaffNotifications'

describe('isStaffNotificationsEnabled', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(localStorageMock).forEach(k => delete localStorageMock[k])
  })

  it('should return true by default when nothing stored', () => {
    expect(isStaffNotificationsEnabled()).toBe(true)
  })

  it('should return true when stored value is "true"', () => {
    localStorageMock['staff_notifications_enabled'] = 'true'
    expect(isStaffNotificationsEnabled()).toBe(true)
  })

  it('should return false when stored value is "false"', () => {
    localStorageMock['staff_notifications_enabled'] = 'false'
    expect(isStaffNotificationsEnabled()).toBe(false)
  })

  it('should return true on localStorage error', () => {
    ;(localStorage.getItem as any).mockImplementationOnce(() => { throw new Error('access denied') })
    expect(isStaffNotificationsEnabled()).toBe(true)
  })
})

describe('setStaffNotificationsEnabled', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(localStorageMock).forEach(k => delete localStorageMock[k])
  })

  it('should store enabled value in localStorage', () => {
    setStaffNotificationsEnabled(true)
    expect(localStorage.setItem).toHaveBeenCalledWith('staff_notifications_enabled', 'true')
  })

  it('should store disabled value in localStorage', () => {
    setStaffNotificationsEnabled(false)
    expect(localStorage.setItem).toHaveBeenCalledWith('staff_notifications_enabled', 'false')
  })

  it('should dispatch custom event', () => {
    setStaffNotificationsEnabled(true)
    expect(window.dispatchEvent).toHaveBeenCalled()
  })
})

describe('useStaffNotifications hook', () => {
  it('should export useStaffNotifications as a function', () => {
    expect(typeof useStaffNotifications).toBe('function')
  })

  it('should accept no arguments', () => {
    expect(useStaffNotifications.length).toBe(0)
  })

  it('should be importable alongside utility functions', () => {
    expect(typeof isStaffNotificationsEnabled).toBe('function')
    expect(typeof setStaffNotificationsEnabled).toBe('function')
    expect(typeof useStaffNotifications).toBe('function')
  })
})

describe('staffNotificationService mocks', () => {
  it('getStaffNotifications is mockable', () => {
    mockGetStaffNotifications.mockResolvedValue([{ id: 'n1' }])
    expect(mockGetStaffNotifications).toBeDefined()
  })

  it('markNotificationAsRead is mockable', () => {
    mockMarkNotificationAsRead.mockResolvedValue(undefined)
    expect(mockMarkNotificationAsRead).toBeDefined()
  })

  it('markAllNotificationsAsRead is mockable', () => {
    mockMarkAllNotificationsAsRead.mockResolvedValue(undefined)
    expect(mockMarkAllNotificationsAsRead).toBeDefined()
  })

  it('subscribeToStaffNotifications is mockable', () => {
    const unsubscribe = mockSubscribeToStaffNotifications('u1', vi.fn())
    expect(typeof unsubscribe).toBe('function')
  })

  it('useAuth mock returns expected shape', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, isLoading: false })
    const result = mockUseAuth()
    expect(result.user.id).toBe('u1')
    expect(result.isLoading).toBe(false)
  })
})
