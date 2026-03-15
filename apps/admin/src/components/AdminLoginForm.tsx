/**
 * Admin Login Form with Mock Authentication Support
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Loader } from '@bliss/ui'
import { Eye, EyeOff } from 'lucide-react'
import { useAdminAuth } from '../hooks/useAdminAuth'
import type { LoginCredentials } from '@bliss/supabase/auth'

export interface AdminLoginFormProps {
  appTitle: string
  primaryColor?: string
  redirectTo?: string
}

export function AdminLoginForm({
  appTitle,
  primaryColor = '#6366f1',
  redirectTo = '/admin/dashboard',
}: AdminLoginFormProps) {
  const navigate = useNavigate()
  const { login, isLoading, error, clearError } = useAdminAuth()

  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
    rememberMe: false,
  })

  const [validationErrors, setValidationErrors] = useState<{
    email?: string
    password?: string
  }>({})

  const [showPassword, setShowPassword] = useState(false)

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {}

    // Email validation
    if (!credentials.email) {
      errors.email = 'กรุณากรอกอีเมล'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
      errors.email = 'รูปแบบอีเมลไม่ถูกต้อง'
    }

    // Password validation
    if (!credentials.password) {
      errors.password = 'กรุณากรอกรหัสผ่าน'
    } else if (credentials.password.length < 6) {
      errors.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!validateForm()) {
      return
    }

    try {
      await login(credentials)
      // Navigate after successful login
      navigate(redirectTo)
    } catch (error) {
      console.error('Login error:', error)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            เข้าสู่ระบบ {appTitle}
          </h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              อีเมล
            </label>
            <Input
              id="email"
              type="email"
              placeholder="กรุณากรอกอีเมล"
              value={credentials.email}
              onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
              error={validationErrors.email}
              disabled={isLoading}
            />
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              รหัสผ่าน
            </label>
            <div className="w-full">
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="กรุณากรอกรหัสผ่าน"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  disabled={isLoading}
                  className="w-full px-4 py-3 pr-12 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 border-stone-300 focus:ring-amber-500 focus:border-amber-500 disabled:bg-stone-100 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  tabIndex={-1}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
              )}
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center">
            <input
              id="rememberMe"
              type="checkbox"
              checked={credentials.rememberMe}
              onChange={(e) => setCredentials(prev => ({ ...prev, rememberMe: e.target.checked }))}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              disabled={isLoading}
            />
            <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
              จดจำการเข้าสู่ระบบ
            </label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
            style={{ backgroundColor: primaryColor }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <Loader className="mr-2" />
                กำลังเข้าสู่ระบบ...
              </div>
            ) : (
              'เข้าสู่ระบบ'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}