import { describe, it, expect, vi, beforeEach } from 'vitest'

// Setup mocks with vi.hoisted
const {
  mockFrom,
  mockSelect,
  mockEq,
  mockSingle,
  mockMaybeSingle,
  mockInsert,
  mockSignInWithPassword,
  mockSignUp,
  mockSignOut,
  mockGetSession,
  mockGetUser,
  mockOnAuthStateChange,
  mockResetPasswordForEmail,
  mockUpdateUser,
} = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn()
  const mockSingle = vi.fn()
  const mockEq = vi.fn()
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()

  const chain = () => ({
    select: mockSelect,
    eq: mockEq,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    insert: mockInsert,
  })

  mockSelect.mockImplementation(() => chain())
  mockEq.mockImplementation(() => chain())
  mockSingle.mockImplementation(() => chain())
  mockMaybeSingle.mockImplementation(() => chain())
  mockInsert.mockImplementation(() => chain())

  const mockFrom = vi.fn(() => chain())

  const mockSignInWithPassword = vi.fn()
  const mockSignUp = vi.fn()
  const mockSignOut = vi.fn()
  const mockGetSession = vi.fn()
  const mockGetUser = vi.fn()
  const mockOnAuthStateChange = vi.fn()
  const mockResetPasswordForEmail = vi.fn()
  const mockUpdateUser = vi.fn()

  return {
    mockFrom,
    mockSelect,
    mockEq,
    mockSingle,
    mockMaybeSingle,
    mockInsert,
    mockSignInWithPassword,
    mockSignUp,
    mockSignOut,
    mockGetSession,
    mockGetUser,
    mockOnAuthStateChange,
    mockResetPasswordForEmail,
    mockUpdateUser,
  }
})

vi.mock('../supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: mockSignOut,
      getSession: mockGetSession,
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
    },
  },
}))

// Mock window.localStorage
const mockLocalStorage = {
  removeItem: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
}
vi.stubGlobal('window', {
  localStorage: mockLocalStorage,
  location: { origin: 'http://localhost:3001' },
})

import {
  signInWithEmail,
  signUpAdmin,
  signOut,
  getCurrentSession,
  getUserProfile,
  getUserProfileByEmail,
  createUserProfile,
  getCurrentUserWithProfile,
  onAuthStateChange,
  resetPassword,
  updatePassword,
} from '../supabaseAuth'
import type { Profile, LoginCredentials } from '../supabaseAuth'

describe('supabaseAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signInWithEmail', () => {
    it('should sign in and return user with profile', async () => {
      const mockUser = { id: 'user-1', email: 'admin@test.com' }
      const mockSession = { access_token: 'token' }
      const mockProfile = { id: 'user-1', email: 'admin@test.com', role: 'ADMIN' }

      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      })

      // Profile lookup by email
      mockMaybeSingle.mockResolvedValueOnce({ data: mockProfile, error: null })

      const result = await signInWithEmail({ email: 'admin@test.com', password: 'password' })

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'admin@test.com',
        password: 'password',
      })
      expect(result.user).toEqual(mockUser)
      expect(result.session).toEqual(mockSession)
      expect(result.profile).toEqual(mockProfile)
    })

    it('should throw AuthError on sign in failure', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      })

      await expect(
        signInWithEmail({ email: 'bad@test.com', password: 'wrong' })
      ).rejects.toThrow('Invalid credentials')
    })

    it('should throw when no user returned', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      })

      await expect(
        signInWithEmail({ email: 'test@test.com', password: 'pass' })
      ).rejects.toThrow('No user returned from authentication')
    })

    it('should sign out and throw when profile not found', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: { id: '1', email: 'test@test.com' }, session: {} },
        error: null,
      })
      // Profile lookup returns null
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
      mockSignOut.mockResolvedValueOnce({ error: null })

      await expect(
        signInWithEmail({ email: 'test@test.com', password: 'pass' })
      ).rejects.toThrow('No profile found for this user')
      expect(mockSignOut).toHaveBeenCalled()
    })

    it('should sign out and throw when role is not ADMIN', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: { id: '1', email: 'customer@test.com' }, session: {} },
        error: null,
      })
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: '1', email: 'customer@test.com', role: 'CUSTOMER' },
        error: null,
      })
      mockSignOut.mockResolvedValueOnce({ error: null })

      await expect(
        signInWithEmail({ email: 'customer@test.com', password: 'pass' })
      ).rejects.toThrow('Access denied. Admin role required.')
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  describe('signUpAdmin', () => {
    it('should sign up and create admin profile', async () => {
      const mockUser = { id: 'new-1', email: 'newadmin@test.com' }

      mockSignUp.mockResolvedValueOnce({
        data: { user: mockUser, session: {} },
        error: null,
      })

      // createUserProfile -> insert -> select -> single
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'new-1',
          email: 'newadmin@test.com',
          role: 'ADMIN',
          full_name: 'New Admin',
        },
        error: null,
      })

      const result = await signUpAdmin({
        email: 'newadmin@test.com',
        password: 'password',
        full_name: 'New Admin',
      })

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'newadmin@test.com',
        password: 'password',
        options: {
          data: { full_name: 'New Admin', role: 'ADMIN' },
        },
      })
      expect(result.user).toEqual(mockUser)
      expect(result.profile?.role).toBe('ADMIN')
    })

    it('should throw on signup error', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Email already registered' },
      })

      await expect(
        signUpAdmin({ email: 'existing@test.com', password: 'pass', full_name: 'Test' })
      ).rejects.toThrow('Email already registered')
    })

    it('should throw when no user returned from signup', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      })

      await expect(
        signUpAdmin({ email: 'test@test.com', password: 'pass', full_name: 'Test' })
      ).rejects.toThrow('No user returned from signup')
    })
  })

  describe('signOut', () => {
    it('should clear localStorage and sign out', async () => {
      mockSignOut.mockResolvedValueOnce({ error: null })

      await signOut()

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('bliss-admin-auth')
      expect(mockSignOut).toHaveBeenCalled()
    })

    it('should not throw on sign out error', async () => {
      mockSignOut.mockResolvedValueOnce({ error: { message: 'Network error' } })

      await expect(signOut()).resolves.not.toThrow()
    })

    it('should not throw on timeout', async () => {
      mockSignOut.mockImplementationOnce(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('Aborted')), 100))
      )

      await expect(signOut()).resolves.not.toThrow()
    })
  })

  describe('getCurrentSession', () => {
    it('should return session when available', async () => {
      const mockSession = { access_token: 'token', user: { id: '1' } }

      mockGetSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      })

      const result = await getCurrentSession()
      expect(result).toEqual(mockSession)
    })

    it('should return null on error', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Session error' },
      })

      const result = await getCurrentSession()
      expect(result).toBeNull()
    })
  })

  describe('getUserProfile', () => {
    it('should fetch profile by user ID', async () => {
      const mockProfile = { id: 'user-1', email: 'test@test.com', role: 'ADMIN' }

      mockMaybeSingle.mockResolvedValueOnce({ data: mockProfile, error: null })

      const result = await getUserProfile('user-1')

      expect(mockFrom).toHaveBeenCalledWith('profiles')
      expect(mockEq).toHaveBeenCalledWith('id', 'user-1')
      expect(result).toEqual(mockProfile)
    })

    it('should return null on error', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      const result = await getUserProfile('bad-id')
      expect(result).toBeNull()
    })

    it('should return null on exception', async () => {
      mockMaybeSingle.mockRejectedValueOnce(new Error('Network error'))

      const result = await getUserProfile('user-1')
      expect(result).toBeNull()
    })
  })

  describe('getUserProfileByEmail', () => {
    it('should fetch profile by email', async () => {
      const mockProfile = { id: 'user-1', email: 'admin@test.com', role: 'ADMIN' }

      mockMaybeSingle.mockResolvedValueOnce({ data: mockProfile, error: null })

      const result = await getUserProfileByEmail('admin@test.com')

      expect(mockEq).toHaveBeenCalledWith('email', 'admin@test.com')
      expect(result).toEqual(mockProfile)
    })

    it('should return null when no profile found', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })

      const result = await getUserProfileByEmail('unknown@test.com')
      expect(result).toBeNull()
    })

    it('should return null on error', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error', code: '500' },
      })

      const result = await getUserProfileByEmail('test@test.com')
      expect(result).toBeNull()
    })
  })

  describe('createUserProfile', () => {
    it('should insert a new profile', async () => {
      const profileData = {
        email: 'new@test.com',
        role: 'ADMIN' as const,
        full_name: 'New User',
        status: 'ACTIVE' as const,
        language: 'th' as const,
      }

      const createdProfile = {
        id: 'user-1',
        ...profileData,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      mockSingle.mockResolvedValueOnce({ data: createdProfile, error: null })

      const result = await createUserProfile('user-1', profileData)

      expect(mockFrom).toHaveBeenCalledWith('profiles')
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        id: 'user-1',
        email: 'new@test.com',
        role: 'ADMIN',
      }))
      expect(result).toEqual(createdProfile)
    })

    it('should throw on insert error', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Duplicate key' },
      })

      await expect(
        createUserProfile('user-1', {
          email: 'test@test.com',
          role: 'ADMIN',
          full_name: 'Test',
          status: 'ACTIVE',
          language: 'th',
        })
      ).rejects.toThrow('Failed to create user profile: Duplicate key')
    })
  })

  describe('onAuthStateChange', () => {
    it('should register auth state change listener', () => {
      const mockCallback = vi.fn()
      const mockSubscription = { data: { subscription: { unsubscribe: vi.fn() } } }

      mockOnAuthStateChange.mockReturnValueOnce(mockSubscription)

      const result = onAuthStateChange(mockCallback)

      expect(mockOnAuthStateChange).toHaveBeenCalledWith(mockCallback)
      expect(result).toEqual(mockSubscription)
    })
  })

  describe('resetPassword', () => {
    it('should send reset password email', async () => {
      mockResetPasswordForEmail.mockResolvedValueOnce({ error: null })

      await resetPassword('admin@test.com')

      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('admin@test.com', {
        redirectTo: 'http://localhost:3001/reset-password',
      })
    })

    it('should throw AuthError on failure', async () => {
      mockResetPasswordForEmail.mockResolvedValueOnce({
        error: { message: 'Rate limit exceeded' },
      })

      await expect(resetPassword('test@test.com')).rejects.toThrow('Rate limit exceeded')
    })
  })

  describe('updatePassword', () => {
    it('should update user password', async () => {
      mockUpdateUser.mockResolvedValueOnce({ error: null })

      await updatePassword('newPassword123')

      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newPassword123' })
    })

    it('should throw AuthError on failure', async () => {
      mockUpdateUser.mockResolvedValueOnce({
        error: { message: 'Password too weak' },
      })

      await expect(updatePassword('123')).rejects.toThrow('Password too weak')
    })
  })

  describe('type validation', () => {
    it('should validate Profile interface', () => {
      const profile: Profile = {
        id: 'user-1',
        email: 'admin@test.com',
        role: 'ADMIN',
        full_name: 'Admin User',
        status: 'ACTIVE',
        language: 'th',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }
      expect(profile.role).toBe('ADMIN')
      expect(profile.language).toBe('th')
    })

    it('should validate LoginCredentials interface', () => {
      const credentials: LoginCredentials = {
        email: 'test@test.com',
        password: 'password',
      }
      expect(credentials.email).toBe('test@test.com')
    })
  })
})
