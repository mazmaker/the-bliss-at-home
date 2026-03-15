// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock authService before importing
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

// Setup localStorage mock
const localStorageMock: Record<string, string> = {}
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => localStorageMock[key] || null),
    setItem: vi.fn((key: string, val: string) => { localStorageMock[key] = val }),
    removeItem: vi.fn((key: string) => { delete localStorageMock[key] }),
  },
  configurable: true,
})

import { AuthProvider, useAuthContext, useOptionalAuthContext, useAuthProviderAvailable } from '../AuthProvider'

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(localStorageMock).forEach(k => delete localStorageMock[k])
    mockGetCurrentProfile.mockResolvedValue(null)
  })

  it('should render children', async () => {
    render(
      <AuthProvider>
        <div data-testid="child">Hello</div>
      </AuthProvider>
    )
    expect(screen.getByTestId('child')).toBeTruthy()
  })

  it('should provide auth context to children', async () => {
    function Consumer() {
      const ctx = useAuthContext()
      return <div data-testid="auth">{ctx.isAuthenticated ? 'yes' : 'no'}</div>
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('no')
    })
  })

  it('should start with loading=false when no session in localStorage', async () => {
    function Consumer() {
      const ctx = useAuthContext()
      return <div data-testid="loading">{ctx.isLoading ? 'loading' : 'done'}</div>
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('done')
    })
  })

  it('should load user profile when session exists in localStorage', async () => {
    localStorageMock['bliss-customer-auth'] = 'session-data'
    const mockProfile = { id: 'u1', email: 'test@test.com', role: 'CUSTOMER', status: 'ACTIVE' }
    mockGetCurrentProfile.mockResolvedValue(mockProfile)

    function Consumer() {
      const ctx = useAuthContext()
      return (
        <div>
          <span data-testid="user">{ctx.user?.email || 'none'}</span>
          <span data-testid="auth">{ctx.isAuthenticated ? 'yes' : 'no'}</span>
        </div>
      )
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('test@test.com')
      expect(screen.getByTestId('auth').textContent).toBe('yes')
    })
  })

  it('should set up auth state change listener and unsubscribe on unmount', async () => {
    const { unmount } = render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>
    )

    expect(mockOnAuthStateChange).toHaveBeenCalled()

    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('should handle login via context', async () => {
    const mockProfile = { id: 'u1', role: 'CUSTOMER', status: 'ACTIVE', email: 'test@test.com' }
    mockLogin.mockResolvedValue({ profile: mockProfile, session: { access_token: 'at' } })

    function LoginConsumer() {
      const ctx = useAuthContext()
      return (
        <div>
          <button onClick={() => ctx.login({ email: 'test@test.com', password: 'pass' })}>Login</button>
          <span data-testid="auth">{ctx.isAuthenticated ? 'yes' : 'no'}</span>
        </div>
      )
    }

    render(
      <AuthProvider>
        <LoginConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('no')
    })

    const user = userEvent.setup()
    await user.click(screen.getByText('Login'))

    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('yes')
    })
    expect(mockLogin).toHaveBeenCalledWith({ email: 'test@test.com', password: 'pass' }, undefined)
  })

  it('should handle login error via context', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'))

    function LoginConsumer() {
      const ctx = useAuthContext()
      return (
        <div>
          <button onClick={async () => {
            try { await ctx.login({ email: 'bad@test.com', password: 'wrong' }) } catch {}
          }}>Login</button>
          <span data-testid="error">{ctx.error || 'none'}</span>
        </div>
      )
    }

    render(
      <AuthProvider>
        <LoginConsumer />
      </AuthProvider>
    )

    const user = userEvent.setup()
    await user.click(screen.getByText('Login'))

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('Login failed')
    })
  })

  it('should handle logout via context', async () => {
    localStorageMock['bliss-customer-auth'] = 'session-data'
    const mockProfile = { id: 'u1', role: 'CUSTOMER', status: 'ACTIVE', email: 'test@test.com' }
    mockGetCurrentProfile.mockResolvedValue(mockProfile)
    mockLogout.mockResolvedValue(undefined)

    function LogoutConsumer() {
      const ctx = useAuthContext()
      return (
        <div>
          <button onClick={() => ctx.logout()}>Logout</button>
          <span data-testid="auth">{ctx.isAuthenticated ? 'yes' : 'no'}</span>
        </div>
      )
    }

    render(
      <AuthProvider>
        <LogoutConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('yes')
    })

    const user = userEvent.setup()
    await user.click(screen.getByText('Logout'))

    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('no')
    })
  })

  it('should handle register via context', async () => {
    const mockProfile = { id: 'u2', role: 'CUSTOMER', status: 'ACTIVE', email: 'new@test.com' }
    mockRegister.mockResolvedValue({ profile: mockProfile, session: { access_token: 'at' } })

    function RegisterConsumer() {
      const ctx = useAuthContext()
      return (
        <div>
          <button onClick={() => ctx.register({ email: 'new@test.com', password: 'pass', fullName: 'Test', phone: '081', role: 'CUSTOMER' })}>Register</button>
          <span data-testid="auth">{ctx.isAuthenticated ? 'yes' : 'no'}</span>
        </div>
      )
    }

    render(
      <AuthProvider>
        <RegisterConsumer />
      </AuthProvider>
    )

    const user = userEvent.setup()
    await user.click(screen.getByText('Register'))

    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('yes')
    })
  })

  it('should clearError via context', async () => {
    mockLogin.mockRejectedValue(new Error('fail'))

    function ErrorConsumer() {
      const ctx = useAuthContext()
      return (
        <div>
          <button onClick={async () => { try { await ctx.login({ email: 'x', password: 'y' }) } catch {} }}>Login</button>
          <button onClick={() => ctx.clearError()}>Clear</button>
          <span data-testid="error">{ctx.error || 'none'}</span>
        </div>
      )
    }

    render(
      <AuthProvider>
        <ErrorConsumer />
      </AuthProvider>
    )

    const user = userEvent.setup()
    await user.click(screen.getByText('Login'))

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).not.toBe('none')
    })

    await user.click(screen.getByText('Clear'))

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('none')
    })
  })

  it('should reject role mismatch during initialization', async () => {
    localStorageMock['bliss-customer-auth'] = 'session-data'
    const mockProfile = { id: 'u1', role: 'CUSTOMER', status: 'ACTIVE', email: 'test@test.com' }
    mockGetCurrentProfile.mockResolvedValue(mockProfile)
    mockLogout.mockResolvedValue(undefined)

    function Consumer() {
      const ctx = useAuthContext()
      return <span data-testid="error">{ctx.error || 'none'}</span>
    }

    render(
      <AuthProvider expectedRole="ADMIN">
        <Consumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('Invalid role for this application')
    })
    expect(mockLogout).toHaveBeenCalled()
  })
})

describe('useAuthContext', () => {
  it('should throw when used outside AuthProvider', () => {
    function BadConsumer() {
      useAuthContext()
      return <div />
    }

    expect(() => render(<BadConsumer />)).toThrow('useAuthContext must be used within an AuthProvider')
  })
})

describe('useOptionalAuthContext', () => {
  it('should return null when no AuthProvider', () => {
    let result: any = 'not-null'
    function Consumer() {
      result = useOptionalAuthContext()
      return <div />
    }

    render(<Consumer />)
    expect(result).toBeNull()
  })

  it('should return context when inside AuthProvider', async () => {
    let result: any = null
    function Consumer() {
      result = useOptionalAuthContext()
      return <div />
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(result).not.toBeNull()
      expect(result).toHaveProperty('login')
      expect(result).toHaveProperty('logout')
    })
  })
})

describe('useAuthProviderAvailable', () => {
  it('should return false when no AuthProvider', () => {
    let available = true
    function Consumer() {
      available = useAuthProviderAvailable()
      return <div />
    }

    render(<Consumer />)
    expect(available).toBe(false)
  })

  it('should return true when inside AuthProvider', async () => {
    let available = false
    function Consumer() {
      available = useAuthProviderAvailable()
      return <div />
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(available).toBe(true)
    })
  })
})
