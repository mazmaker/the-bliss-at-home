// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock modules
const mockNavigate = vi.fn()
const mockLogin = vi.fn()
const mockClearError = vi.fn()
let mockAuthReturn = {
  login: mockLogin,
  isLoading: false,
  error: null as string | null,
  clearError: mockClearError,
}

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('@bliss/supabase/auth', () => ({
  useAuth: () => mockAuthReturn,
}))

// Mock icons to simple elements
vi.mock('react-icons/fa', () => ({
  FaGoogle: (props: any) => <span data-testid="google-icon" {...props} />,
  FaFacebook: (props: any) => <span data-testid="facebook-icon" {...props} />,
}))

import { LoginForm } from '../LoginForm'

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthReturn = {
      login: mockLogin,
      isLoading: false,
      error: null,
      clearError: mockClearError,
    }
  })

  describe('rendering', () => {
    it('renders app title', () => {
      render(<LoginForm appTitle="Admin Portal" />)
      expect(screen.getByText('Admin Portal')).toBeInTheDocument()
    })

    it('renders app logo when provided', () => {
      render(<LoginForm appTitle="App" appLogo="/logo.png" />)
      expect(screen.getByAltText('App')).toBeInTheDocument()
    })

    it('renders email and password fields', () => {
      render(<LoginForm appTitle="App" />)
      expect(screen.getByLabelText('อีเมล')).toBeInTheDocument()
      expect(screen.getByLabelText('รหัสผ่าน')).toBeInTheDocument()
    })

    it('renders submit button', () => {
      render(<LoginForm appTitle="App" />)
      expect(screen.getByRole('button', { name: 'เข้าสู่ระบบ' })).toBeInTheDocument()
    })

    it('shows social login buttons by default', () => {
      render(<LoginForm appTitle="App" />)
      expect(screen.getByText('เข้าสู่ระบบด้วย Google')).toBeInTheDocument()
    })

    it('hides social login when showSocialLogin is false', () => {
      render(<LoginForm appTitle="App" showSocialLogin={false} />)
      expect(screen.queryByText('เข้าสู่ระบบด้วย Google')).not.toBeInTheDocument()
    })

    it('shows remember me checkbox by default', () => {
      render(<LoginForm appTitle="App" />)
      expect(screen.getByText('จดจำฉัน')).toBeInTheDocument()
    })

    it('hides remember me when showRememberMe is false', () => {
      render(<LoginForm appTitle="App" showRememberMe={false} showForgotPassword={false} />)
      expect(screen.queryByText('จดจำฉัน')).not.toBeInTheDocument()
    })

    it('shows forgot password link by default', () => {
      render(<LoginForm appTitle="App" />)
      expect(screen.getByText('ลืมรหัสผ่าน?')).toBeInTheDocument()
    })

    it('hides forgot password when showForgotPassword is false', () => {
      render(<LoginForm appTitle="App" showForgotPassword={false} showRememberMe={false} />)
      expect(screen.queryByText('ลืมรหัสผ่าน?')).not.toBeInTheDocument()
    })

    it('shows register link when enabled', () => {
      const onRegister = vi.fn()
      render(<LoginForm appTitle="App" showRegister onRegisterClick={onRegister} />)
      expect(screen.getByText('สร้างบัญชี')).toBeInTheDocument()
    })

    it('hides register link by default', () => {
      render(<LoginForm appTitle="App" />)
      expect(screen.queryByText('สร้างบัญชี')).not.toBeInTheDocument()
    })
  })

  describe('error display', () => {
    it('shows auth error', () => {
      mockAuthReturn = { ...mockAuthReturn, error: 'Invalid credentials' }
      render(<LoginForm appTitle="App" />)
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials')
    })

    it('does not show alert when no error', () => {
      render(<LoginForm appTitle="App" />)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('form validation', () => {
    // Use fireEvent.submit to bypass HTML5 constraint validation in jsdom
    it('shows error for empty email on submit', async () => {
      const { container } = render(<LoginForm appTitle="App" showSocialLogin={false} />)

      fireEvent.submit(container.querySelector('form')!)

      await waitFor(() => {
        expect(screen.getByText('กรุณากรอกอีเมล')).toBeInTheDocument()
      })
      expect(mockLogin).not.toHaveBeenCalled()
    })

    it('shows error for invalid email format', async () => {
      const user = userEvent.setup()
      const { container } = render(<LoginForm appTitle="App" showSocialLogin={false} />)

      await user.type(screen.getByLabelText('อีเมล'), 'notanemail')
      await user.type(screen.getByLabelText('รหัสผ่าน'), 'password123')
      fireEvent.submit(container.querySelector('form')!)

      await waitFor(() => {
        expect(screen.getByText('รูปแบบอีเมลไม่ถูกต้อง')).toBeInTheDocument()
      })
      expect(mockLogin).not.toHaveBeenCalled()
    })

    it('shows error for empty password on submit', async () => {
      const user = userEvent.setup()
      const { container } = render(<LoginForm appTitle="App" showSocialLogin={false} />)

      await user.type(screen.getByLabelText('อีเมล'), 'test@example.com')
      fireEvent.submit(container.querySelector('form')!)

      await waitFor(() => {
        expect(screen.getByText('กรุณากรอกรหัสผ่าน')).toBeInTheDocument()
      })
    })

    it('shows error for short password', async () => {
      const user = userEvent.setup()
      const { container } = render(<LoginForm appTitle="App" showSocialLogin={false} />)

      await user.type(screen.getByLabelText('อีเมล'), 'test@example.com')
      await user.type(screen.getByLabelText('รหัสผ่าน'), '12345')
      fireEvent.submit(container.querySelector('form')!)

      await waitFor(() => {
        expect(screen.getByText('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')).toBeInTheDocument()
      })
    })

    it('clears validation error when user types', async () => {
      const user = userEvent.setup()
      const { container } = render(<LoginForm appTitle="App" showSocialLogin={false} />)

      // Submit empty to trigger error
      fireEvent.submit(container.querySelector('form')!)
      await waitFor(() => {
        expect(screen.getByText('กรุณากรอกอีเมล')).toBeInTheDocument()
      })

      // Type in email field - error should clear
      await user.type(screen.getByLabelText('อีเมล'), 't')
      expect(screen.queryByText('กรุณากรอกอีเมล')).not.toBeInTheDocument()
    })
  })

  describe('form submission', () => {
    it('calls login with credentials on valid submit', async () => {
      mockLogin.mockResolvedValue(undefined)
      const user = userEvent.setup()
      render(<LoginForm appTitle="App" showSocialLogin={false} />)

      await user.type(screen.getByLabelText('อีเมล'), 'test@example.com')
      await user.type(screen.getByLabelText('รหัสผ่าน'), 'password123')
      await user.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))

      expect(mockClearError).toHaveBeenCalled()
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      })
    })

    it('navigates to redirectTo on successful login', async () => {
      mockLogin.mockResolvedValue(undefined)
      const user = userEvent.setup()
      render(<LoginForm appTitle="App" redirectTo="/dashboard" showSocialLogin={false} />)

      await user.type(screen.getByLabelText('อีเมล'), 'test@example.com')
      await user.type(screen.getByLabelText('รหัสผ่าน'), 'password123')
      await user.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('does not navigate when no redirectTo', async () => {
      mockLogin.mockResolvedValue(undefined)
      const user = userEvent.setup()
      render(<LoginForm appTitle="App" showSocialLogin={false} />)

      await user.type(screen.getByLabelText('อีเมล'), 'test@example.com')
      await user.type(screen.getByLabelText('รหัสผ่าน'), 'password123')
      await user.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled()
      })
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('handles login error gracefully', async () => {
      mockLogin.mockRejectedValue(new Error('Auth failed'))
      const user = userEvent.setup()
      render(<LoginForm appTitle="App" showSocialLogin={false} />)

      await user.type(screen.getByLabelText('อีเมล'), 'test@example.com')
      await user.type(screen.getByLabelText('รหัสผ่าน'), 'password123')
      await user.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))

      // Should not throw - error handled by useAuth
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled()
      })
    })
  })

  describe('interactions', () => {
    it('calls onForgotPasswordClick when clicked', async () => {
      const onForgot = vi.fn()
      const user = userEvent.setup()
      render(<LoginForm appTitle="App" onForgotPasswordClick={onForgot} />)

      await user.click(screen.getByText('ลืมรหัสผ่าน?'))
      expect(onForgot).toHaveBeenCalled()
    })

    it('calls onRegisterClick when clicked', async () => {
      const onRegister = vi.fn()
      const user = userEvent.setup()
      render(<LoginForm appTitle="App" showRegister onRegisterClick={onRegister} />)

      await user.click(screen.getByText('สร้างบัญชี'))
      expect(onRegister).toHaveBeenCalled()
    })

    it('calls onSocialLogin with google', async () => {
      const onSocial = vi.fn()
      const user = userEvent.setup()
      render(<LoginForm appTitle="App" onSocialLogin={onSocial} />)

      await user.click(screen.getByText('เข้าสู่ระบบด้วย Google'))
      expect(onSocial).toHaveBeenCalledWith('google')
    })

    it('toggles remember me checkbox', async () => {
      const user = userEvent.setup()
      render(<LoginForm appTitle="App" showSocialLogin={false} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()

      await user.click(checkbox)
      expect(checkbox).toBeChecked()
    })
  })

  describe('loading state', () => {
    it('shows loading text when isLoading', () => {
      mockAuthReturn = { ...mockAuthReturn, isLoading: true }
      render(<LoginForm appTitle="App" showSocialLogin={false} />)
      expect(screen.getByText('กำลังเข้าสู่ระบบ...')).toBeInTheDocument()
    })

    it('disables form fields when loading', () => {
      mockAuthReturn = { ...mockAuthReturn, isLoading: true }
      render(<LoginForm appTitle="App" showSocialLogin={false} />)
      expect(screen.getByLabelText('อีเมล')).toBeDisabled()
      expect(screen.getByLabelText('รหัสผ่าน')).toBeDisabled()
    })
  })
})
