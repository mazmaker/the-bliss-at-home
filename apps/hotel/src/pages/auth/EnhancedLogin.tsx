/**
 * Enhanced Hotel Login Page
 * Handles first-time login, password changes, and hotel-specific authentication
 */

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@bliss/supabase/auth'
import { supabase } from '@bliss/supabase'
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle,
  Building,
  ArrowLeft,
  RefreshCw,
  Shield,
  Key,
} from 'lucide-react'

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
  rememberMe: z.boolean().optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'กรุณากรอกรหัสผ่านปัจจุบัน'),
  newPassword: z
    .string()
    .min(8, 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร')
    .regex(/[A-Z]/, 'ต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว')
    .regex(/[a-z]/, 'ต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว')
    .regex(/\d/, 'ต้องมีตัวเลขอย่างน้อย 1 ตัว'),
  confirmPassword: z.string().min(1, 'กรุณายืนยันรหัสผ่าน'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'รหัสผ่านไม่ตรงกัน',
  path: ['confirmPassword'],
})

type LoginFormData = z.infer<typeof loginSchema>
type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

interface PasswordRequirement {
  label: string
  test: (password: string) => boolean
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'อย่างน้อย 8 ตัวอักษร', test: (p) => p.length >= 8 },
  { label: 'ตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว', test: (p) => /[A-Z]/.test(p) },
  { label: 'ตัวพิมพ์เล็กอย่างน้อย 1 ตัว', test: (p) => /[a-z]/.test(p) },
  { label: 'ตัวเลขอย่างน้อย 1 ตัว', test: (p) => /\d/.test(p) },
]

export function EnhancedHotelLogin() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, isLoading: authLoading, user, isAuthenticated } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false)
  const [loginStep, setLoginStep] = useState<'login' | 'change-password'>('login')

  // Check if user is already authenticated with HOTEL role
  if (isAuthenticated && user?.user_metadata?.role === 'HOTEL') {
    return <Navigate to="/hotel/550e8400-e29b-41d4-a716-446655440002" replace />
  }

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  })

  // Change password form
  const changePasswordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const watchNewPassword = changePasswordForm.watch('newPassword')

  const handleLogin = async (data: LoginFormData) => {
    setIsSubmitting(true)
    setSubmitError('')
    setSubmitSuccess('')

    try {
      const result = await login({ email: data.email, password: data.password })

      if (result.error) {
        throw new Error(result.error.message)
      }

      if (result.data?.user) {
        // Check if user has HOTEL role
        if (result.data.user.user_metadata?.role !== 'HOTEL') {
          throw new Error('บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบโรงแรม')
        }

        // Check if password change is required
        const { data: hotelData, error: hotelError } = await supabase
          .from('hotels')
          .select('password_change_required')
          .eq('auth_user_id', result.data.user.id)
          .single()

        if (hotelError) {
          console.error('Error checking password change requirement:', hotelError)
        }

        if (hotelData?.password_change_required) {
          setNeedsPasswordChange(true)
          setLoginStep('change-password')
          setSubmitSuccess('เข้าสู่ระบบสำเร็จ กรุณาเปลี่ยนรหัสผ่านเพื่อความปลอดภัย')
        } else {
          setSubmitSuccess('เข้าสู่ระบบสำเร็จ กำลังเข้าสู่หน้าหลัก...')
          setTimeout(() => {
            navigate('/hotel/550e8400-e29b-41d4-a716-446655440002')
          }, 1500)
        }
      }
    } catch (error: any) {
      console.error('Login error:', error)
      setSubmitError(error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChangePassword = async (data: ChangePasswordFormData) => {
    setIsSubmitting(true)
    setSubmitError('')
    setSubmitSuccess('')

    try {
      // Update password via Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword
      })

      if (updateError) {
        throw new Error(updateError.message)
      }

      // Get hotel ID and notify server to clear temporary password
      if (user?.id) {
        try {
          // First, get hotel ID from auth_user_id
          const { data: hotelData, error: hotelQueryError } = await supabase
            .from('hotels')
            .select('id')
            .eq('auth_user_id', user.id)
            .single()

          if (hotelQueryError || !hotelData) {
            console.error('Error finding hotel by auth_user_id:', hotelQueryError)
          } else {
            // Notify server to clear temporary password and update status
            try {
              const response = await fetch('http://localhost:3000/api/hotels/password-changed', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  hotelId: hotelData.id,
                  authToken: user.id // For future authentication
                }),
              })

              if (response.ok) {
                console.log('✅ Server notified: temporary password cleared')
              } else {
                console.error('❌ Failed to notify server about password change')
              }
            } catch (serverError) {
              console.error('❌ Error notifying server:', serverError)
              // Don't throw error - password change should still succeed even if server notification fails
            }
          }
        } catch (error) {
          console.error('Error in password change cleanup process:', error)
          // Don't throw error - the main password change was successful
        }
      }

      setSubmitSuccess('เปลี่ยนรหัสผ่านสำเร็จ กำลังเข้าสู่หน้าหลัก...')
      setTimeout(() => {
        navigate('/hotel/550e8400-e29b-41d4-a716-446655440002')
      }, 1500)
    } catch (error: any) {
      console.error('Password change error:', error)
      setSubmitError(error.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotPassword = async () => {
    const email = loginForm.getValues('email')
    if (!email) {
      setSubmitError('กรุณากรอกอีเมลก่อนขอรีเซ็ตรหัสผ่าน')
      return
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        throw new Error(error.message)
      }

      setSubmitSuccess('ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลแล้ว กรุณาตรวจสอบกล่องจดหมาย')
    } catch (error: any) {
      console.error('Forgot password error:', error)
      setSubmitError(error.message || 'เกิดข้อผิดพลาดในการส่งลิงก์รีเซ็ตรหัสผ่าน')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                The Bliss at Home
              </h1>
              <p className="text-sm text-gray-500">Hotel Portal</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Login Step */}
          {loginStep === 'login' && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  เข้าสู่ระบบโรงแรม
                </h2>
                <p className="text-gray-600">
                  กรุณาเข้าสู่ระบบด้วยบัญชีโรงแรมของท่าน
                </p>
              </div>

              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-6">
                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    อีเมล *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      {...loginForm.register('email')}
                      type="email"
                      className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="hotel@example.com"
                      disabled={isSubmitting}
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    รหัสผ่าน *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      {...loginForm.register('password')}
                      type={showPassword ? 'text' : 'password'}
                      className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="รหัสผ่านของท่าน"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="mt-1 text-sm text-red-600">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      {...loginForm.register('rememberMe')}
                      type="checkbox"
                      className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                      disabled={isSubmitting}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      จำการเข้าสู่ระบบ
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-amber-600 hover:text-amber-700"
                    disabled={isSubmitting}
                  >
                    ลืมรหัสผ่าน?
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || authLoading}
                  className="w-full bg-amber-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting || authLoading ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Shield className="h-5 w-5" />
                  )}
                  {isSubmitting || authLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </button>
              </form>

              {/* Help Text */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">สำหรับโรงแรมใหม่:</p>
                    <p>หากเป็นการเข้าสู่ระบบครั้งแรก กรุณาใช้รหัสผ่านชั่วคราวที่ได้รับจากระบบ ระบบจะให้เปลี่ยนรหัสผ่านใหม่เพื่อความปลอดภัย</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Change Password Step */}
          {loginStep === 'change-password' && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Key className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  เปลี่ยนรหัสผ่าน
                </h2>
                <p className="text-gray-600">
                  กรุณาเปลี่ยนรหัสผ่านใหม่เพื่อความปลอดภัย
                </p>
              </div>

              <form onSubmit={changePasswordForm.handleSubmit(handleChangePassword)} className="space-y-6">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    รหัสผ่านปัจจุบัน *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      {...changePasswordForm.register('currentPassword')}
                      type="password"
                      className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="รหัสผ่านชั่วคราว"
                      disabled={isSubmitting}
                    />
                  </div>
                  {changePasswordForm.formState.errors.currentPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      {changePasswordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    รหัสผ่านใหม่ *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      {...changePasswordForm.register('newPassword')}
                      type={showNewPassword ? 'text' : 'password'}
                      className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="รหัสผ่านใหม่"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {changePasswordForm.formState.errors.newPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      {changePasswordForm.formState.errors.newPassword.message}
                    </p>
                  )}

                  {/* Password Requirements */}
                  {watchNewPassword && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-medium text-gray-700 mb-2">ข้อกำหนดรหัสผ่าน:</p>
                      <div className="space-y-1">
                        {passwordRequirements.map((req, index) => {
                          const isValid = req.test(watchNewPassword)
                          return (
                            <div key={index} className="flex items-center gap-2">
                              {isValid ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <div className="h-3 w-3 rounded-full border border-gray-300" />
                              )}
                              <span className={`text-xs ${
                                isValid ? 'text-green-600' : 'text-gray-500'
                              }`}>
                                {req.label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ยืนยันรหัสผ่านใหม่ *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      {...changePasswordForm.register('confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="ยืนยันรหัสผ่านใหม่"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {changePasswordForm.formState.errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      {changePasswordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Key className="h-5 w-5" />
                  )}
                  {isSubmitting ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'เปลี่ยนรหัสผ่าน'}
                </button>
              </form>
            </div>
          )}

          {/* Error/Success Messages */}
          {submitError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-medium">เกิดข้อผิดพลาด</p>
                <p>{submitError}</p>
              </div>
            </div>
          )}

          {submitSuccess && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-800">
                <p className="font-medium">สำเร็จ</p>
                <p>{submitSuccess}</p>
              </div>
            </div>
          )}

          {/* Back to Home */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4" />
              กลับสู่หน้าหลัก
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EnhancedHotelLogin