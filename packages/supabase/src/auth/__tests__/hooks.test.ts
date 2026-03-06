// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import React from 'react'

// Mock dependencies
const { mockGetCurrentProfile, mockLogin, mockRegister, mockLogout } = vi.hoisted(() => ({
  mockGetCurrentProfile: vi.fn(),
  mockLogin: vi.fn(),
  mockRegister: vi.fn(),
  mockLogout: vi.fn(),
}))

const { mockGetSession, mockOnAuthStateChange, mockUnsubscribe } = vi.hoisted(() => {
  const mockUnsubscribe = vi.fn()
  return {
    mockGetSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    mockOnAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    })),
    mockUnsubscribe,
  }
})

vi.mock('../authService', () => ({
  authService: {
    getCurrentProfile: mockGetCurrentProfile,
    login: mockLogin,
    register: mockRegister,
    logout: mockLogout,
  },
}))

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  },
}))

vi.mock('../types', () => ({
  AuthError: class AuthError extends Error {
    code?: string
    constructor(message: string, code?: string) {
      super(message)
      this.name = 'AuthError'
      this.code = code
    }
  },
}))

vi.mock('../AuthProvider', () => ({
  useOptionalAuthContext: vi.fn(() => null),
}))

const localStorageMock: Record<string, string> = {}
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => localStorageMock[key] || null),
    setItem: vi.fn((key: string, val: string) => { localStorageMock[key] = val }),
    removeItem: vi.fn((key: string) => { delete localStorageMock[key] }),
  },
  configurable: true,
})

import { useAuth, useHasRole, useHasAnyRole, useProfile } from '../hooks'

describe('useAuth (standalone mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(localStorageMock).forEach(k => delete localStorageMock[k])
    mockGetCurrentProfile.mockResolvedValue(null)
  })

  it('should return initial state when no session exists', async () => {
    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should load profile when session exists in localStorage', async () => {
    localStorageMock['bliss-customer-auth'] = 'session-data'
    const mockProfile = { id: 'u1', role: 'CUSTOMER', status: 'ACTIVE', email: 'test@test.com' }
    mockGetCurrentProfile.mockResolvedValue(mockProfile)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toEqual(mockProfile)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('should skip initial check when option is set', async () => {
    localStorageMock['bliss-customer-auth'] = 'session-data'

    const { result } = renderHook(() => useAuth(undefined, { skipInitialCheck: true }))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toBeNull()
    expect(mockGetCurrentProfile).not.toHaveBeenCalled()
  })

  it('should provide login function', async () => {
    const mockProfile = { id: 'u1', role: 'CUSTOMER', email: 'test@test.com' }
    mockLogin.mockResolvedValue({ profile: mockProfile, session: { access_token: 'at' } })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.login({ email: 'test@test.com', password: 'pass' })
    })

    expect(result.current.user).toEqual(mockProfile)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('should handle login error', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid'))

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      try {
        await result.current.login({ email: 'bad', password: 'bad' })
      } catch {}
    })

    expect(result.current.error).toBe('Login failed')
    expect(result.current.isAuthenticated).toBeFalsy()
  })

  it('should provide register function', async () => {
    const mockProfile = { id: 'u2', role: 'CUSTOMER', email: 'new@test.com' }
    mockRegister.mockResolvedValue({ profile: mockProfile, session: { access_token: 'at' } })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.register({ email: 'new@test.com', password: 'pass', fullName: 'User', phone: '081', role: 'CUSTOMER' as const })
    })

    expect(result.current.user).toEqual(mockProfile)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('should provide logout function', async () => {
    localStorageMock['bliss-customer-auth'] = 'session-data'
    const mockProfile = { id: 'u1', role: 'CUSTOMER', status: 'ACTIVE' }
    mockGetCurrentProfile.mockResolvedValue(mockProfile)
    mockLogout.mockResolvedValue(undefined)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true)
    })

    await act(async () => {
      await result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should provide clearError function', async () => {
    mockLogin.mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      try { await result.current.login({ email: 'x', password: 'y' }) } catch {}
    })

    expect(result.current.error).toBeTruthy()

    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
  })

  it('should subscribe to auth state changes', () => {
    renderHook(() => useAuth())
    expect(mockOnAuthStateChange).toHaveBeenCalled()
  })

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() => useAuth())
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('should reject role mismatch', async () => {
    localStorageMock['bliss-customer-auth'] = 'session-data'
    const mockProfile = { id: 'u1', role: 'CUSTOMER', status: 'ACTIVE' }
    mockGetCurrentProfile.mockResolvedValue(mockProfile)
    mockLogout.mockResolvedValue(undefined)

    const { result } = renderHook(() => useAuth('ADMIN' as any))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('Invalid role for this application')
    expect(result.current.isAuthenticated).toBe(false)
    expect(mockLogout).toHaveBeenCalled()
  })
})

describe('useHasRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(localStorageMock).forEach(k => delete localStorageMock[k])
    mockGetCurrentProfile.mockResolvedValue(null)
  })

  it('should return false when no user', async () => {
    const { result } = renderHook(() => useHasRole('ADMIN'))
    await waitFor(() => {
      expect(result.current).toBe(false)
    })
  })

  it('should return true when user has matching role', async () => {
    localStorageMock['bliss-customer-auth'] = 'session-data'
    mockGetCurrentProfile.mockResolvedValue({ id: 'u1', role: 'ADMIN', status: 'ACTIVE' })

    const { result } = renderHook(() => useHasRole('ADMIN'))
    await waitFor(() => {
      expect(result.current).toBe(true)
    })
  })

  it('should return false when role does not match', async () => {
    localStorageMock['bliss-customer-auth'] = 'session-data'
    mockGetCurrentProfile.mockResolvedValue({ id: 'u1', role: 'CUSTOMER', status: 'ACTIVE' })

    const { result } = renderHook(() => useHasRole('ADMIN'))
    await waitFor(() => {
      expect(result.current).toBe(false)
    })
  })
})

describe('useHasAnyRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(localStorageMock).forEach(k => delete localStorageMock[k])
    mockGetCurrentProfile.mockResolvedValue(null)
  })

  it('should return false when no user', async () => {
    const { result } = renderHook(() => useHasAnyRole(['ADMIN', 'STAFF']))
    await waitFor(() => {
      expect(result.current).toBe(false)
    })
  })

  it('should return true when user has one of the specified roles', async () => {
    localStorageMock['bliss-customer-auth'] = 'session-data'
    mockGetCurrentProfile.mockResolvedValue({ id: 'u1', role: 'STAFF', status: 'ACTIVE' })

    const { result } = renderHook(() => useHasAnyRole(['ADMIN', 'STAFF']))
    await waitFor(() => {
      expect(result.current).toBe(true)
    })
  })

  it('should return false when user has none of the specified roles', async () => {
    localStorageMock['bliss-customer-auth'] = 'session-data'
    mockGetCurrentProfile.mockResolvedValue({ id: 'u1', role: 'CUSTOMER', status: 'ACTIVE' })

    const { result } = renderHook(() => useHasAnyRole(['ADMIN', 'STAFF']))
    await waitFor(() => {
      expect(result.current).toBe(false)
    })
  })
})

describe('useProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(localStorageMock).forEach(k => delete localStorageMock[k])
    mockGetCurrentProfile.mockResolvedValue(null)
  })

  it('should return profile, isLoading, and error', async () => {
    const { result } = renderHook(() => useProfile())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.profile).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should return loaded profile', async () => {
    localStorageMock['bliss-customer-auth'] = 'session-data'
    const mockUser = { id: 'u1', role: 'CUSTOMER', status: 'ACTIVE', email: 'test@test.com' }
    mockGetCurrentProfile.mockResolvedValue(mockUser)

    const { result } = renderHook(() => useProfile())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.profile).toEqual(mockUser)
  })
})
