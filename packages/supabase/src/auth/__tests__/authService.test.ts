import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockAuth, mockFromFn } = vi.hoisted(() => {
  return {
    mockAuth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      signInWithOAuth: vi.fn(),
      getSession: vi.fn(),
    },
    mockFromFn: vi.fn(),
  }
})

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: mockAuth,
    from: mockFromFn,
  },
}))

function createBuilder(resolveValue: any = { data: null, error: null }) {
  const b: any = {}
  const m = ['select', 'eq', 'neq', 'in', 'gte', 'lte', 'order', 'limit', 'single', 'insert', 'update', 'delete', 'is', 'maybeSingle']
  m.forEach(k => { b[k] = vi.fn().mockReturnValue(b) })
  b.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve)
  return b
}

const localStorageMock: Record<string, string> = {}
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => localStorageMock[key] || null),
    setItem: vi.fn((key: string, val: string) => { localStorageMock[key] = val }),
    removeItem: vi.fn((key: string) => { delete localStorageMock[key] }),
  },
  configurable: true,
})
Object.defineProperty(global, 'sessionStorage', {
  value: { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn() },
  configurable: true,
})
Object.defineProperty(global, 'window', {
  value: { location: { origin: 'http://localhost:3000' }, ...global.window },
  configurable: true,
  writable: true,
})

import { authService } from '../authService'

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(localStorageMock).forEach(k => delete localStorageMock[k])
  })

  describe('login', () => {
    const creds = { email: 'test@example.com', password: 'pass123' }

    it('should login successfully', async () => {
      const profile = { id: 'u1', role: 'CUSTOMER', status: 'ACTIVE' }
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        data: { user: { id: 'u1' }, session: { access_token: 'at', refresh_token: 'rt', expires_at: 999 } },
        error: null,
      })
      // from('profiles').select().eq().single() -> profile
      mockFromFn.mockReturnValueOnce(createBuilder({ data: profile, error: null }))
      // from('profiles').update().eq() -> update last login
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: null }))

      const result = await authService.login(creds)
      expect(result.profile).toEqual(profile)
      expect(result.session.access_token).toBe('at')
    })

    it('should throw on invalid credentials', async () => {
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid' },
      })
      await expect(authService.login(creds)).rejects.toThrow('Invalid email or password')
    })

    it('should throw when profile not found', async () => {
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        data: { user: { id: 'u1' }, session: { access_token: 'at', refresh_token: 'rt' } },
        error: null,
      })
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: { message: 'Not found' } }))
      await expect(authService.login(creds)).rejects.toThrow('Profile not found')
    })

    it('should throw when account suspended', async () => {
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        data: { user: { id: 'u1' }, session: { access_token: 'at', refresh_token: 'rt' } },
        error: null,
      })
      mockFromFn.mockReturnValueOnce(createBuilder({ data: { id: 'u1', role: 'CUSTOMER', status: 'SUSPENDED' }, error: null }))
      await expect(authService.login(creds)).rejects.toThrow('suspended')
      expect(mockAuth.signOut).toHaveBeenCalled()
    })

    it('should throw when role mismatch', async () => {
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        data: { user: { id: 'u1' }, session: { access_token: 'at', refresh_token: 'rt' } },
        error: null,
      })
      mockFromFn.mockReturnValueOnce(createBuilder({ data: { id: 'u1', role: 'CUSTOMER', status: 'ACTIVE' }, error: null }))
      await expect(authService.login(creds, 'ADMIN')).rejects.toThrow('not authorized')
      expect(mockAuth.signOut).toHaveBeenCalled()
    })

    it('should set rememberMe=true in localStorage', async () => {
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        data: { user: { id: 'u1' }, session: { access_token: 'at', refresh_token: 'rt', expires_at: 999 } },
        error: null,
      })
      mockFromFn.mockReturnValueOnce(createBuilder({ data: { id: 'u1', role: 'CUSTOMER', status: 'ACTIVE' }, error: null }))
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: null }))

      await authService.login({ ...creds, rememberMe: true })
      expect(localStorage.setItem).toHaveBeenCalledWith('rememberMe', 'true')
    })

    it('should set sessionOnly when rememberMe=false', async () => {
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        data: { user: { id: 'u1' }, session: { access_token: 'at', refresh_token: 'rt', expires_at: 999 } },
        error: null,
      })
      mockFromFn.mockReturnValueOnce(createBuilder({ data: { id: 'u1', role: 'CUSTOMER', status: 'ACTIVE' }, error: null }))
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: null }))

      await authService.login({ ...creds, rememberMe: false })
      expect(localStorage.setItem).toHaveBeenCalledWith('rememberMe', 'false')
      expect(sessionStorage.setItem).toHaveBeenCalledWith('sessionOnly', 'true')
    })
  })

  describe('register', () => {
    const creds = { email: 'new@test.com', password: 'pass', fullName: 'User', phone: '081', role: 'CUSTOMER' as const }

    it('should register successfully', async () => {
      const profile = { id: 'u2', role: 'CUSTOMER', status: 'ACTIVE' }
      mockAuth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'u2', email: 'new@test.com' }, session: { access_token: 'at', refresh_token: 'rt', expires_at: 999 } },
        error: null,
      })
      mockFromFn.mockReturnValueOnce(createBuilder({ data: profile, error: null }))

      const result = await authService.register(creds)
      expect(result.profile).toEqual(profile)
    })

    it('should throw on already registered', async () => {
      mockAuth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      })
      await expect(authService.register(creds)).rejects.toThrow('Email already registered')
    })

    it('should throw when no user returned', async () => {
      mockAuth.signUp.mockResolvedValueOnce({ data: { user: null, session: null }, error: null })
      await expect(authService.register(creds)).rejects.toThrow('Registration failed')
    })

    it('should throw when no session returned', async () => {
      mockAuth.signUp.mockResolvedValueOnce({ data: { user: { id: 'u2' }, session: null }, error: null })
      await expect(authService.register(creds)).rejects.toThrow('no session created')
    })

    it('should handle duplicate profile (23505)', async () => {
      mockAuth.signUp.mockResolvedValueOnce({
        data: { user: { id: 'u2' }, session: { access_token: 'at', refresh_token: 'rt', expires_at: 999 } },
        error: null,
      })
      // Insert fails with duplicate
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: { code: '23505', message: 'dup' } }))
      // Fetch existing
      mockFromFn.mockReturnValueOnce(createBuilder({ data: { id: 'u2', role: 'CUSTOMER' }, error: null }))

      const result = await authService.register(creds)
      expect(result.profile.id).toBe('u2')
    })
  })

  describe('logout', () => {
    it('should sign out and clear storage', async () => {
      mockAuth.signOut.mockResolvedValueOnce({ error: null })
      await authService.logout()
      expect(mockAuth.signOut).toHaveBeenCalled()
      expect(localStorage.removeItem).toHaveBeenCalledWith('rememberMe')
    })

    it('should not throw on error and still clear storage', async () => {
      mockAuth.signOut.mockResolvedValueOnce({ error: { message: 'Err' } })
      // logout swallows errors and continues with local cleanup
      await authService.logout()
      expect(localStorage.removeItem).toHaveBeenCalledWith('rememberMe')
    })
  })

  describe('refreshSession', () => {
    it('should refresh', async () => {
      mockAuth.refreshSession.mockResolvedValueOnce({ error: null })
      await authService.refreshSession()
    })

    it('should throw on error', async () => {
      mockAuth.refreshSession.mockResolvedValueOnce({ error: { message: 'Expired' } })
      await expect(authService.refreshSession()).rejects.toThrow('Failed to refresh session')
    })
  })

  describe('resetPassword', () => {
    it('should send reset email', async () => {
      mockAuth.resetPasswordForEmail.mockResolvedValueOnce({ error: null })
      await authService.resetPassword('test@example.com')
      expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com', expect.any(Object))
    })

    it('should throw on error', async () => {
      mockAuth.resetPasswordForEmail.mockResolvedValueOnce({ error: { message: 'Invalid' } })
      await expect(authService.resetPassword('bad')).rejects.toThrow('Failed to send reset email')
    })
  })

  describe('updatePassword', () => {
    it('should update password', async () => {
      mockAuth.updateUser.mockResolvedValueOnce({ error: null })
      await authService.updatePassword('newPass')
      expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'newPass' })
    })

    it('should throw on error', async () => {
      mockAuth.updateUser.mockResolvedValueOnce({ error: { message: 'Weak' } })
      await expect(authService.updatePassword('123')).rejects.toThrow('Failed to update password')
    })
  })

  describe('signInWithGoogle', () => {
    it('should call OAuth with google', async () => {
      mockAuth.signInWithOAuth.mockResolvedValueOnce({ error: null })
      await authService.signInWithGoogle()
      expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: 'google' }))
    })

    it('should throw on error', async () => {
      mockAuth.signInWithOAuth.mockResolvedValueOnce({ error: { message: 'Err' } })
      await expect(authService.signInWithGoogle()).rejects.toThrow('Failed to sign in with Google')
    })
  })

  describe('signInWithFacebook', () => {
    it('should call OAuth with facebook', async () => {
      mockAuth.signInWithOAuth.mockResolvedValueOnce({ error: null })
      await authService.signInWithFacebook()
      expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: 'facebook' }))
    })

    it('should throw on error', async () => {
      mockAuth.signInWithOAuth.mockResolvedValueOnce({ error: { message: 'Err' } })
      await expect(authService.signInWithFacebook()).rejects.toThrow('Failed to sign in with Facebook')
    })
  })

  describe('linkLineAccount', () => {
    const lineCreds = { lineUserId: 'U123', displayName: 'Test', pictureUrl: 'https://pic.jpg' }

    it('should link LINE to current user', async () => {
      mockAuth.getSession.mockResolvedValueOnce({ data: { session: { user: { id: 'u1' } } }, error: null })
      // Check existing link - no match
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: null }))
      // Update profile
      mockFromFn.mockReturnValueOnce(createBuilder({ error: null }))

      await authService.linkLineAccount(lineCreds)
    })

    it('should throw when not logged in', async () => {
      mockAuth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null })
      await expect(authService.linkLineAccount(lineCreds)).rejects.toThrow('Please login first')
    })

    it('should throw when LINE already linked', async () => {
      mockAuth.getSession.mockResolvedValueOnce({ data: { session: { user: { id: 'u1' } } }, error: null })
      mockFromFn.mockReturnValueOnce(createBuilder({ data: { id: 'other', email: 'other@test.com' }, error: null }))
      await expect(authService.linkLineAccount(lineCreds)).rejects.toThrow()
    })
  })

  describe('linkLineAccountToUser', () => {
    const lineCreds = { userId: 'u1', lineUserId: 'U123', displayName: 'Test', pictureUrl: 'https://pic.jpg' }

    it('should link LINE to specific user', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: null }))
      mockFromFn.mockReturnValueOnce(createBuilder({ error: null }))
      await authService.linkLineAccountToUser(lineCreds)
    })

    it('should throw when already linked', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: { id: 'other', email: 'x@test.com' }, error: null }))
      await expect(authService.linkLineAccountToUser(lineCreds)).rejects.toThrow()
    })

    it('should throw on update error', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: null }))
      mockFromFn.mockReturnValueOnce(createBuilder({ error: { message: 'DB err' } }))
      await expect(authService.linkLineAccountToUser(lineCreds)).rejects.toThrow('Failed to link LINE account')
    })
  })
})
