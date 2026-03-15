import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase client
const { mockSignOut } = vi.hoisted(() => ({
  mockSignOut: vi.fn().mockResolvedValue({ error: null }),
}))

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      signOut: mockSignOut,
    },
  },
}))

// Mock import.meta.env
vi.stubEnv('DEV', '')
vi.stubEnv('MODE', 'production')

// Mock localStorage and sessionStorage
const localStorageMock: Record<string, string> = {}
const sessionStorageMock: Record<string, string> = {}

Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => localStorageMock[key] || null),
    setItem: vi.fn((key: string, val: string) => { localStorageMock[key] = val }),
    removeItem: vi.fn((key: string) => { delete localStorageMock[key] }),
  },
  configurable: true,
})

Object.defineProperty(global, 'sessionStorage', {
  value: {
    getItem: vi.fn((key: string) => sessionStorageMock[key] || null),
    setItem: vi.fn((key: string, val: string) => { sessionStorageMock[key] = val }),
    removeItem: vi.fn((key: string) => { delete sessionStorageMock[key] }),
  },
  configurable: true,
})

// Mock window.addEventListener
const eventListeners: Record<string, Function[]> = {}
Object.defineProperty(global, 'window', {
  value: {
    addEventListener: vi.fn((event: string, handler: Function) => {
      if (!eventListeners[event]) eventListeners[event] = []
      eventListeners[event].push(handler)
    }),
    removeEventListener: vi.fn(),
  },
  configurable: true,
  writable: true,
})

import { initSessionManager, shouldPersistSession, clearSession } from '../sessionManager'

describe('sessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(localStorageMock).forEach(k => delete localStorageMock[k])
    Object.keys(sessionStorageMock).forEach(k => delete sessionStorageMock[k])
    Object.keys(eventListeners).forEach(k => delete eventListeners[k])
  })

  describe('shouldPersistSession', () => {
    it('should return true when rememberMe is true', () => {
      localStorageMock['rememberMe'] = 'true'
      expect(shouldPersistSession()).toBe(true)
    })

    it('should return false when rememberMe is false', () => {
      localStorageMock['rememberMe'] = 'false'
      expect(shouldPersistSession()).toBe(false)
    })

    it('should return false when rememberMe is not set', () => {
      expect(shouldPersistSession()).toBe(false)
    })
  })

  describe('clearSession', () => {
    it('should call signOut and clear storage', async () => {
      localStorageMock['bliss-customer-auth'] = 'session-data'
      localStorageMock['rememberMe'] = 'true'
      sessionStorageMock['sessionOnly'] = 'true'

      await clearSession()

      expect(mockSignOut).toHaveBeenCalled()
      expect(localStorage.removeItem).toHaveBeenCalledWith('bliss-customer-auth')
      expect(localStorage.removeItem).toHaveBeenCalledWith('rememberMe')
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('sessionOnly')
    })
  })

  describe('initSessionManager', () => {
    it('should set up beforeunload listener when sessionOnly is true', () => {
      sessionStorageMock['sessionOnly'] = 'true'

      initSessionManager()

      expect(window.addEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    })

    it('should set up beforeunload listener when rememberMe is false', () => {
      localStorageMock['rememberMe'] = 'false'

      initSessionManager()

      expect(window.addEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    })

    it('should set up beforeunload listener when rememberMe is not set', () => {
      initSessionManager()

      expect(window.addEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    })

    it('should not set up beforeunload listener when rememberMe is true and not sessionOnly', () => {
      localStorageMock['rememberMe'] = 'true'

      initSessionManager()

      // It should still be called because sessionOnly check comes first with OR logic:
      // isSessionOnly || !rememberMe -> false || false -> false, so no listener
      expect(window.addEventListener).not.toHaveBeenCalledWith('beforeunload', expect.any(Function))
    })

    it('should clear session data on beforeunload when rememberMe is false', () => {
      localStorageMock['rememberMe'] = 'false'

      initSessionManager()

      // Trigger beforeunload
      const handler = eventListeners['beforeunload']?.[0]
      expect(handler).toBeDefined()
      handler?.()

      expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' })
      expect(localStorage.removeItem).toHaveBeenCalledWith('bliss-customer-auth')
      expect(localStorage.removeItem).toHaveBeenCalledWith('rememberMe')
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('sessionOnly')
    })
  })
})
