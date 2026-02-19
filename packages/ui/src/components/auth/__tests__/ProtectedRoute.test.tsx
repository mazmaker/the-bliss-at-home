// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock modules
const mockUseAuth = vi.fn()
const mockUseLocation = vi.fn()

vi.mock('@bliss/supabase/auth', () => ({
  useAuth: (...args: any[]) => mockUseAuth(...args),
}))

vi.mock('react-router-dom', () => ({
  Navigate: ({ to, state, replace }: any) => (
    <div data-testid="navigate" data-to={to} data-state={JSON.stringify(state)} data-replace={String(replace)} />
  ),
  useLocation: () => mockUseLocation(),
}))

import { ProtectedRoute } from '../ProtectedRoute'

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseLocation.mockReturnValue({ pathname: '/dashboard', search: '' })
  })

  it('shows loader when auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true })
    const { container } = render(
      <ProtectedRoute>Protected Content</ProtectedRoute>
    )
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    // Loader renders an animate-spin div
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1', role: 'admin' }, isLoading: false })
    render(<ProtectedRoute>Protected Content</ProtectedRoute>)
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects to /login when not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false })
    render(<ProtectedRoute>Protected Content</ProtectedRoute>)
    const nav = screen.getByTestId('navigate')
    expect(nav.getAttribute('data-to')).toBe('/login')
  })

  it('redirects to custom path when not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false })
    render(<ProtectedRoute redirectTo="/auth/sign-in">Content</ProtectedRoute>)
    const nav = screen.getByTestId('navigate')
    expect(nav.getAttribute('data-to')).toBe('/auth/sign-in')
  })

  it('preserves intended destination in redirect state', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false })
    mockUseLocation.mockReturnValue({ pathname: '/settings', search: '?tab=profile' })
    render(<ProtectedRoute>Content</ProtectedRoute>)
    const nav = screen.getByTestId('navigate')
    const state = JSON.parse(nav.getAttribute('data-state') || '{}')
    expect(state.from).toBe('/settings?tab=profile')
  })

  it('redirects to /unauthorized when user role not allowed', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1', role: 'customer' }, isLoading: false })
    render(<ProtectedRoute allowedRoles={['admin', 'staff']}>Content</ProtectedRoute>)
    const nav = screen.getByTestId('navigate')
    expect(nav.getAttribute('data-to')).toBe('/unauthorized')
  })

  it('allows access when user role is in allowedRoles', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1', role: 'admin' }, isLoading: false })
    render(<ProtectedRoute allowedRoles={['admin', 'staff']}>Allowed Content</ProtectedRoute>)
    expect(screen.getByText('Allowed Content')).toBeInTheDocument()
  })

  it('allows access with no role restriction', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1', role: 'customer' }, isLoading: false })
    render(<ProtectedRoute>Any Role Content</ProtectedRoute>)
    expect(screen.getByText('Any Role Content')).toBeInTheDocument()
  })

  it('uses replace when navigating', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false })
    render(<ProtectedRoute>Content</ProtectedRoute>)
    const nav = screen.getByTestId('navigate')
    expect(nav.getAttribute('data-replace')).toBe('true')
  })
})
