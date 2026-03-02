import { describe, it, expect, vi } from 'vitest'

// Mock all dependencies before importing
vi.mock('../../lib/mockAuth', () => ({
  USE_MOCK_AUTH: false,
}))

vi.mock('../../lib/mockAuthService', () => ({
  mockAuthLogin: vi.fn(),
  mockGetCurrentProfile: vi.fn(),
  mockLogout: vi.fn(),
  setMockAuthState: vi.fn(),
}))

vi.mock('../../lib/supabaseAuth', () => ({
  signInWithEmail: vi.fn(),
  signOut: vi.fn(),
  getCurrentUserWithProfile: vi.fn().mockResolvedValue({ user: null, profile: null }),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
}))

vi.mock('../../utils/sessionManager', () => ({
  setupActivityMonitoring: vi.fn(() => vi.fn()),
  startSessionMonitoring: vi.fn(),
  stopSessionMonitoring: vi.fn(),
  refreshSession: vi.fn(),
}))

import { useAdminAuth } from '../useAdminAuth'

describe('useAdminAuth', () => {
  it('exports useAdminAuth as a function', () => {
    expect(typeof useAdminAuth).toBe('function')
  })

  it('has the correct function name', () => {
    expect(useAdminAuth.name).toBe('useAdminAuth')
  })
})
