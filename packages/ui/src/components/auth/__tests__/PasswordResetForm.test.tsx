// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock modules
const mockNavigate = vi.fn()
const mockResetPassword = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('@bliss/supabase/auth', () => ({
  authService: {
    resetPassword: (...args: any[]) => mockResetPassword(...args),
  },
}))

import { PasswordResetForm } from '../PasswordResetForm'

describe('PasswordResetForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('rendering', () => {
    it('renders title and description', () => {
      render(<PasswordResetForm />)
      expect(screen.getByText('Reset your password')).toBeInTheDocument()
      expect(screen.getByText(/Enter your email/)).toBeInTheDocument()
    })

    it('renders email input', () => {
      render(<PasswordResetForm />)
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    })

    it('renders submit button', () => {
      render(<PasswordResetForm />)
      expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeInTheDocument()
    })

    it('shows back to login link by default', () => {
      render(<PasswordResetForm />)
      expect(screen.getByText('Back to login')).toBeInTheDocument()
    })

    it('hides back to login when showBackLink is false', () => {
      render(<PasswordResetForm showBackLink={false} />)
      expect(screen.queryByText('Back to login')).not.toBeInTheDocument()
    })

    it('disables submit when email is empty', () => {
      render(<PasswordResetForm />)
      expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeDisabled()
    })
  })

  describe('form submission', () => {
    it('calls resetPassword with email', async () => {
      mockResetPassword.mockResolvedValue(undefined)
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<PasswordResetForm />)

      await user.type(screen.getByLabelText('Email Address'), 'test@example.com')
      await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('test@example.com')
      })
    })

    it('shows success message after successful reset', async () => {
      mockResetPassword.mockResolvedValue(undefined)
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<PasswordResetForm />)

      await user.type(screen.getByLabelText('Email Address'), 'user@test.com')
      await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))

      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument()
      })
      expect(screen.getByText(/user@test.com/)).toBeInTheDocument()
    })

    it('navigates after success timeout', async () => {
      mockResetPassword.mockResolvedValue(undefined)
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<PasswordResetForm redirectTo="/login" />)

      await user.type(screen.getByLabelText('Email Address'), 'test@example.com')
      await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))

      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument()
      })

      vi.advanceTimersByTime(3000)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login')
      })
    })

    it('shows error on Error instance', async () => {
      mockResetPassword.mockRejectedValue(new Error('User not found'))
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<PasswordResetForm />)

      await user.type(screen.getByLabelText('Email Address'), 'bad@test.com')
      await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('User not found')
      })
    })

    it('shows generic error on non-Error rejection', async () => {
      mockResetPassword.mockRejectedValue('string error')
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<PasswordResetForm />)

      await user.type(screen.getByLabelText('Email Address'), 'test@test.com')
      await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to send reset email')
      })
    })
  })

  describe('interactions', () => {
    it('calls onBackToLogin when back link clicked', async () => {
      const onBack = vi.fn()
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<PasswordResetForm onBackToLogin={onBack} />)

      await user.click(screen.getByText('Back to login'))
      expect(onBack).toHaveBeenCalled()
    })

    it('navigates to redirectTo when back link clicked without handler', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<PasswordResetForm redirectTo="/sign-in" />)

      await user.click(screen.getByText('Back to login'))
      expect(mockNavigate).toHaveBeenCalledWith('/sign-in')
    })

    it('shows back to login on success screen', async () => {
      mockResetPassword.mockResolvedValue(undefined)
      const onBack = vi.fn()
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<PasswordResetForm onBackToLogin={onBack} />)

      await user.type(screen.getByLabelText('Email Address'), 'test@test.com')
      await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))

      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Back to login'))
      expect(onBack).toHaveBeenCalled()
    })

    it('hides back to login on success when showBackLink is false', async () => {
      mockResetPassword.mockResolvedValue(undefined)
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<PasswordResetForm showBackLink={false} />)

      await user.type(screen.getByLabelText('Email Address'), 'test@test.com')
      await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))

      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument()
      })
      expect(screen.queryByText('Back to login')).not.toBeInTheDocument()
    })
  })
})
