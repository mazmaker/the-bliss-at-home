import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @line/liff before importing
const mockLiff = vi.hoisted(() => ({
  init: vi.fn(),
  isInClient: vi.fn(),
  isLoggedIn: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  getProfile: vi.fn(),
  getAccessToken: vi.fn(),
  getIDToken: vi.fn(),
  closeWindow: vi.fn(),
  openWindow: vi.fn(),
}))

vi.mock('@line/liff', () => ({
  default: mockLiff,
}))

// Mock window
const windowLocationMock = {
  href: 'http://localhost:3000',
}

Object.defineProperty(global, 'window', {
  value: {
    location: windowLocationMock,
    history: {
      replaceState: vi.fn(),
    },
  },
  configurable: true,
  writable: true,
})

describe('liffService', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    windowLocationMock.href = 'http://localhost:3000'
  })

  describe('initializeLiff', () => {
    it('should initialize LIFF SDK successfully', async () => {
      const { initializeLiff } = await import('../liffService')
      mockLiff.init.mockResolvedValueOnce(undefined)

      const result = await initializeLiff('test-liff-id')

      expect(result).toBe(true)
      expect(mockLiff.init).toHaveBeenCalledWith({ liffId: 'test-liff-id' })
    })

    it('should return true if already initialized', async () => {
      const { initializeLiff } = await import('../liffService')
      mockLiff.init.mockResolvedValueOnce(undefined)

      await initializeLiff('test-liff-id')
      const result = await initializeLiff('test-liff-id')

      expect(result).toBe(true)
      // init should only be called once
      expect(mockLiff.init).toHaveBeenCalledTimes(1)
    })

    it('should handle stale authorization code error gracefully', async () => {
      const { initializeLiff } = await import('../liffService')
      mockLiff.init.mockRejectedValueOnce(new Error('invalid authorization code'))
      windowLocationMock.href = 'http://localhost:3000?code=old&state=stale&liffClientId=123'

      const result = await initializeLiff('test-liff-id')

      expect(result).toBe(true)
    })

    it('should throw on non-code-related errors', async () => {
      const { initializeLiff } = await import('../liffService')
      mockLiff.init.mockRejectedValueOnce(new Error('Network error'))

      await expect(initializeLiff('test-liff-id')).rejects.toThrow('Network error')
    })
  })

  describe('isLiffInitialized', () => {
    it('should return false when not initialized', async () => {
      const { isLiffInitialized } = await import('../liffService')
      expect(isLiffInitialized()).toBe(false)
    })

    it('should return true after initialization', async () => {
      const { initializeLiff, isLiffInitialized } = await import('../liffService')
      mockLiff.init.mockResolvedValueOnce(undefined)
      await initializeLiff('test-liff-id')
      expect(isLiffInitialized()).toBe(true)
    })
  })

  describe('isInLiffBrowser', () => {
    it('should return false when not initialized', async () => {
      const { isInLiffBrowser } = await import('../liffService')
      expect(isInLiffBrowser()).toBe(false)
    })

    it('should delegate to liff.isInClient when initialized', async () => {
      const { initializeLiff, isInLiffBrowser } = await import('../liffService')
      mockLiff.init.mockResolvedValueOnce(undefined)
      mockLiff.isInClient.mockReturnValue(true)

      await initializeLiff('test-liff-id')
      expect(isInLiffBrowser()).toBe(true)
      expect(mockLiff.isInClient).toHaveBeenCalled()
    })
  })

  describe('isLiffLoggedIn', () => {
    it('should return false when not initialized', async () => {
      const { isLiffLoggedIn } = await import('../liffService')
      expect(isLiffLoggedIn()).toBe(false)
    })

    it('should delegate to liff.isLoggedIn when initialized', async () => {
      const { initializeLiff, isLiffLoggedIn } = await import('../liffService')
      mockLiff.init.mockResolvedValueOnce(undefined)
      mockLiff.isLoggedIn.mockReturnValue(true)

      await initializeLiff('test-liff-id')
      expect(isLiffLoggedIn()).toBe(true)
    })
  })

  describe('liffLogin', () => {
    it('should throw when not initialized', async () => {
      const { liffLogin } = await import('../liffService')
      expect(() => liffLogin()).toThrow('LIFF is not initialized')
    })

    it('should call liff.login when not logged in', async () => {
      const { initializeLiff, liffLogin } = await import('../liffService')
      mockLiff.init.mockResolvedValueOnce(undefined)
      mockLiff.isLoggedIn.mockReturnValue(false)

      await initializeLiff('test-liff-id')
      liffLogin('http://redirect.url')

      expect(mockLiff.login).toHaveBeenCalledWith({ redirectUri: 'http://redirect.url' })
    })

    it('should not call liff.login when already logged in', async () => {
      const { initializeLiff, liffLogin } = await import('../liffService')
      mockLiff.init.mockResolvedValueOnce(undefined)
      mockLiff.isLoggedIn.mockReturnValue(true)

      await initializeLiff('test-liff-id')
      liffLogin()

      expect(mockLiff.login).not.toHaveBeenCalled()
    })
  })

  describe('getLiffProfile', () => {
    it('should throw when not initialized', async () => {
      const { getLiffProfile } = await import('../liffService')
      await expect(getLiffProfile()).rejects.toThrow('LIFF is not initialized')
    })

    it('should throw when not logged in', async () => {
      const { initializeLiff, getLiffProfile } = await import('../liffService')
      mockLiff.init.mockResolvedValueOnce(undefined)
      mockLiff.isLoggedIn.mockReturnValue(false)

      await initializeLiff('test-liff-id')
      await expect(getLiffProfile()).rejects.toThrow('User is not logged in')
    })

    it('should return profile when logged in', async () => {
      const { initializeLiff, getLiffProfile } = await import('../liffService')
      mockLiff.init.mockResolvedValueOnce(undefined)
      mockLiff.isLoggedIn.mockReturnValue(true)
      mockLiff.getProfile.mockResolvedValue({
        userId: 'U123',
        displayName: 'Test User',
        pictureUrl: 'https://pic.jpg',
        statusMessage: 'Hello',
      })

      await initializeLiff('test-liff-id')
      const profile = await getLiffProfile()

      expect(profile).toEqual({
        userId: 'U123',
        displayName: 'Test User',
        pictureUrl: 'https://pic.jpg',
        statusMessage: 'Hello',
      })
    })
  })

  describe('getLiffAccessToken', () => {
    it('should return null when not initialized', async () => {
      const { getLiffAccessToken } = await import('../liffService')
      expect(getLiffAccessToken()).toBeNull()
    })

    it('should return token when initialized', async () => {
      const { initializeLiff, getLiffAccessToken } = await import('../liffService')
      mockLiff.init.mockResolvedValueOnce(undefined)
      mockLiff.getAccessToken.mockReturnValue('access-token-123')

      await initializeLiff('test-liff-id')
      expect(getLiffAccessToken()).toBe('access-token-123')
    })
  })

  describe('getLiffIdToken', () => {
    it('should return null when not initialized', async () => {
      const { getLiffIdToken } = await import('../liffService')
      expect(getLiffIdToken()).toBeNull()
    })

    it('should return ID token when initialized', async () => {
      const { initializeLiff, getLiffIdToken } = await import('../liffService')
      mockLiff.init.mockResolvedValueOnce(undefined)
      mockLiff.getIDToken.mockReturnValue('id-token-456')

      await initializeLiff('test-liff-id')
      expect(getLiffIdToken()).toBe('id-token-456')
    })
  })

  describe('liffLogout', () => {
    it('should do nothing when not initialized', async () => {
      const { liffLogout } = await import('../liffService')
      liffLogout()
      expect(mockLiff.logout).not.toHaveBeenCalled()
    })

    it('should call liff.logout when initialized', async () => {
      const { initializeLiff, liffLogout } = await import('../liffService')
      mockLiff.init.mockResolvedValueOnce(undefined)

      await initializeLiff('test-liff-id')
      liffLogout()

      expect(mockLiff.logout).toHaveBeenCalled()
    })
  })

  describe('closeLiffWindow', () => {
    it('should do nothing when not initialized', async () => {
      const { closeLiffWindow } = await import('../liffService')
      closeLiffWindow()
      expect(mockLiff.closeWindow).not.toHaveBeenCalled()
    })

    it('should close window when in LIFF browser', async () => {
      const { initializeLiff, closeLiffWindow } = await import('../liffService')
      mockLiff.init.mockResolvedValueOnce(undefined)
      mockLiff.isInClient.mockReturnValue(true)

      await initializeLiff('test-liff-id')
      closeLiffWindow()

      expect(mockLiff.closeWindow).toHaveBeenCalled()
    })

    it('should not close window when not in LIFF browser', async () => {
      const { initializeLiff, closeLiffWindow } = await import('../liffService')
      mockLiff.init.mockResolvedValueOnce(undefined)
      mockLiff.isInClient.mockReturnValue(false)

      await initializeLiff('test-liff-id')
      closeLiffWindow()

      expect(mockLiff.closeWindow).not.toHaveBeenCalled()
    })
  })

  describe('openExternalBrowser', () => {
    it('should do nothing when not initialized', async () => {
      const { openExternalBrowser } = await import('../liffService')
      openExternalBrowser('https://example.com')
      expect(mockLiff.openWindow).not.toHaveBeenCalled()
    })

    it('should open external browser when initialized', async () => {
      const { initializeLiff, openExternalBrowser } = await import('../liffService')
      mockLiff.init.mockResolvedValueOnce(undefined)

      await initializeLiff('test-liff-id')
      openExternalBrowser('https://example.com')

      expect(mockLiff.openWindow).toHaveBeenCalledWith({ url: 'https://example.com', external: true })
    })
  })

  describe('liffService object', () => {
    it('should export all methods on the service object', async () => {
      const { liffService } = await import('../liffService')

      expect(liffService).toHaveProperty('initialize')
      expect(liffService).toHaveProperty('isInitialized')
      expect(liffService).toHaveProperty('isInClient')
      expect(liffService).toHaveProperty('isLoggedIn')
      expect(liffService).toHaveProperty('login')
      expect(liffService).toHaveProperty('logout')
      expect(liffService).toHaveProperty('getProfile')
      expect(liffService).toHaveProperty('getAccessToken')
      expect(liffService).toHaveProperty('getIdToken')
      expect(liffService).toHaveProperty('closeWindow')
      expect(liffService).toHaveProperty('openExternal')
    })
  })
})
