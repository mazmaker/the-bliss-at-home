/**
 * Enhanced Hotel Login Page
 * Handles first-time login, password changes, and hotel-specific authentication
 */

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@bliss/supabase/auth'
import { supabase } from '@bliss/supabase'
import { useUserHotelId } from '../../hooks/useUserHotelId'
import { getHotelSlugFromId } from '../../utils/hotelUtils'
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
    .max(128, 'รหัสผ่านยาวเกินไป (สูงสุด 128 ตัวอักษร)')
    .regex(/[A-Z]/, 'ต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว')
    .regex(/[a-z]/, 'ต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว')
    .regex(/\d/, 'ต้องมีตัวเลขอย่างน้อย 1 ตัว')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'ต้องมีอักขระพิเศษอย่างน้อย 1 ตัว')
    .refine((password) => !['password', '12345678', 'admin123', 'hotel123'].includes(password.toLowerCase()), {
      message: 'รหัสผ่านนี้ไม่ปลอดภัย กรุณาเลือกรหัสผ่านที่แข็งแรงกว่า'
    })
    .refine((password) => !/(.)\1{2,}/.test(password), {
      message: 'รหัสผ่านไม่ควรมีอักขระซ้ำติดกัน 3 ตัวขึ้นไป'
    }),
  confirmPassword: z.string().min(1, 'กรุณายืนยันรหัสผ่าน'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'รหัסผ่านยืนยันไม่ตรงกัน',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'รหัสผ่านใหม่ต้องแตกต่างจากรหัสผ่านเดิม',
  path: ['newPassword'],
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
  const { hotelId: userHotelId } = useUserHotelId()
  const [showPassword, setShowPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Debug logging removed - issue fixed!
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false)
  const [loginStep, setLoginStep] = useState<'login' | 'change-password'>('login')
  const [isCheckingPasswordRequirement, setIsCheckingPasswordRequirement] = useState(false)
  const [shouldForceCheck, setShouldForceCheck] = useState(0) // Counter to force useEffect re-run

  // Check password change requirement for authenticated users
  useEffect(() => {
    const checkPasswordRequirement = async () => {
      console.log('🔍 [DEBUG] checkPasswordRequirement called:', {
        isAuthenticated,
        user: user,
        userRole: user?.role,
        userId: user?.id
      })

      console.log('🔍 [DEBUG] Checking conditions:', {
        'isAuthenticated': isAuthenticated,
        'user exists': !!user,
        'user.id exists': !!user?.id,
        'user.role': user?.role,
        'role === HOTEL': user?.role === 'HOTEL'
      })

      // WORKAROUND: Also check localStorage for session since useAuth might be delayed
      const hasStoredSession = typeof window !== 'undefined' && !!localStorage.getItem('bliss-customer-auth')
      console.log('🔍 [DEBUG] LocalStorage session exists:', hasStoredSession)

      // Check if we have a stored session but useAuth hasn't updated yet
      if (!isAuthenticated && hasStoredSession) {
        console.log('🔄 [DEBUG] Found stored session but useAuth not ready, checking manually...')

        try {
          const sessionData = localStorage.getItem('bliss-customer-auth')
          if (sessionData) {
            const session = JSON.parse(sessionData)
            const sessionUser = session.user || session.currentSession?.user

            if (sessionUser?.id) {
              console.log('🔍 [DEBUG] Manual session check - user ID:', sessionUser.id)

              // Check hotel data directly since useAuth isn't ready
              const { data: hotelData, error: hotelError } = await supabase
                .from('hotels')
                .select('password_change_required')
                .eq('auth_user_id', sessionUser.id)
                .single()

              console.log('📊 [DEBUG] Manual hotel query result:', { hotelData, hotelError })

              if (!hotelError && hotelData?.password_change_required) {
                console.log('🔐 [DEBUG] MANUAL CHECK: Password change is REQUIRED! Setting up form...')
                setNeedsPasswordChange(true)
                setLoginStep('change-password')
                return // Stop here, don't redirect
              } else if (!hotelError && !hotelData?.password_change_required) {
                console.log('✅ [DEBUG] MANUAL CHECK: No password change needed, waiting for useAuth...')
                return // Let useAuth handle the redirect when ready
              }
            }
          }
        } catch (error) {
          console.error('❌ [DEBUG] Manual session check error:', error)
        }
      }

      if (isAuthenticated && user?.role === 'HOTEL' && user.id) {
        console.log('✅ [DEBUG] User is authenticated HOTEL, checking password requirement...')
        setIsCheckingPasswordRequirement(true)

        try {
          // Check if password change is required
          console.log('🔍 [DEBUG] Querying hotels table for auth_user_id:', user.id)
          const { data: hotelData, error: hotelError } = await supabase
            .from('hotels')
            .select('password_change_required')
            .eq('auth_user_id', user.id)
            .single()

          console.log('📊 [DEBUG] Hotel query result:', { hotelData, hotelError })

          if (hotelError) {
            console.error('❌ [DEBUG] Error checking password change requirement:', hotelError)
            // If we can't check, assume no password change needed and redirect
            const hotelUrl = await getHotelUrl()
            console.log('🔄 [DEBUG] Redirecting to hotel URL (error case):', hotelUrl)
            navigate(hotelUrl, { replace: true })
          } else if (hotelData?.password_change_required) {
            // Password change is required
            console.log('🔐 [DEBUG] Password change is REQUIRED! Setting up change password form...')
            setNeedsPasswordChange(true)
            setLoginStep('change-password')
          } else {
            // No password change needed, redirect to hotel app
            console.log('✅ [DEBUG] No password change needed, redirecting...')
            const hotelUrl = await getHotelUrl()
            console.log('🔄 [DEBUG] Redirecting to hotel URL:', hotelUrl)
            navigate(hotelUrl, { replace: true })
          }
        } catch (error) {
          console.error('❌ [DEBUG] Error checking password requirement:', error)
          // On error, redirect to avoid infinite loop
          const hotelUrl = await getHotelUrl()
          console.log('🔄 [DEBUG] Redirecting to hotel URL (catch case):', hotelUrl)
          navigate(hotelUrl, { replace: true })
        } finally {
          setIsCheckingPasswordRequirement(false)
        }
      }
    }

    checkPasswordRequirement()
  }, [isAuthenticated, user, navigate, shouldForceCheck])

  // Additional effect to handle session loading after initial mount
  useEffect(() => {
    // Set up a timer to re-check after session loading
    const timer = setTimeout(() => {
      const hasSession = typeof window !== 'undefined' && !!localStorage.getItem('bliss-customer-auth')
      if (hasSession && !isAuthenticated && !user) {
        console.log('⏰ [DEBUG] Timer triggered - session exists but useAuth not ready, forcing recheck...')
        setShouldForceCheck(prev => prev + 1) // This will trigger the main useEffect
      }
    }, 1000) // Check after 1 second

    return () => clearTimeout(timer)
  }, [isAuthenticated, user])

  // Login form - MUST be called before any early returns
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  })

  // Change password form - MUST be called before any early returns
  const changePasswordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const watchNewPassword = changePasswordForm.watch('newPassword')

  // Show loading while checking password requirements
  if (isAuthenticated && user?.role === 'HOTEL' && isCheckingPasswordRequirement) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-amber-600 mx-auto mb-4" />
          <p className="text-gray-600">กำลังตรวจสอบข้อมูล...</p>
        </div>
      </div>
    )
  }

  // Helper function to get the correct hotel URL for navigation using slug
  const getHotelUrl = async (): Promise<string> => {
    if (userHotelId) {
      const hotelSlug = await getHotelSlugFromId(userHotelId)
      return `/hotel/${hotelSlug}`
    }
    // Get current hotel context from URL instead of hard fallback
    const currentPath = window.location.pathname
    const urlSlug = currentPath.match(/\/hotel\/([^\/]+)/)?.[1] || 'resort-chiang-mai'
    return `/hotel/${urlSlug}`
  }

  const handleLogin = async (data: LoginFormData) => {
    setIsSubmitting(true)
    setSubmitError('')
    setSubmitSuccess('')

    try {
      const result = await login({ email: data.email, password: data.password })

      if (result.error) {
        // Handle specific login errors with more user-friendly messages
        const errorMessage = result.error.message.toLowerCase()

        if (errorMessage.includes('invalid login credentials') ||
            errorMessage.includes('invalid email or password') ||
            errorMessage.includes('email not confirmed') ||
            errorMessage.includes('invalid password')) {
          setSubmitError('ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')
          return
        } else if (errorMessage.includes('too many requests')) {
          setSubmitError('มีการพยายามเข้าสู่ระบบมากเกินไป กรุณารอสักครู่แล้วลองใหม่')
          return
        } else if (errorMessage.includes('email not found')) {
          setSubmitError('ไม่พบบัญชีผู้ใช้นี้ในระบบ กรุณาตรวจสอบอีเมล')
          return
        } else {
          setSubmitError(result.error.message)
          return
        }
      }

      if (result.data?.user) {
        // Check if user has HOTEL role (use profile.role from the auth response)
        if (result.profile?.role !== 'HOTEL') {
          setSubmitError('บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบโรงแรม')
          return
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
          setTimeout(async () => {
            const hotelUrl = await getHotelUrl()
            navigate(hotelUrl)
          }, 1500)
        }
      } else {
        setSubmitError('ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')
      }
    } catch (error: any) {
      // Handle authentication errors
      const errorMessage = error.message || error.toString() || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'

      if (errorMessage.toLowerCase().includes('invalid email or password') ||
          errorMessage.toLowerCase().includes('invalid login credentials')) {
        setSubmitError('ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')
      } else {
        setSubmitError(errorMessage)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChangePassword = async (data: ChangePasswordFormData) => {
    setIsSubmitting(true)
    setSubmitError('')
    setSubmitSuccess('')

    try {
      // Get hotel ID first
      if (!user?.id) {
        throw new Error('ไม่พบข้อมูลผู้ใช้')
      }

      const { data: hotelData, error: hotelQueryError } = await supabase
        .from('hotels')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (hotelQueryError || !hotelData) {
        console.error('Error finding hotel by auth_user_id:', hotelQueryError)
        throw new Error('ไม่พบข้อมูลโรงแรม')
      }

      // Use our new change-password API endpoint
      const response = await fetch('http://localhost:3000/api/hotels/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
          confirmPassword: data.confirmPassword,
          hotelId: hotelData.id
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่')
        } else if (response.status === 400) {
          throw new Error(result.message || 'ข้อมูลที่กรอกไม่ถูกต้อง')
        } else if (response.status === 404) {
          throw new Error('ไม่พบข้อมูลโรงแรม กรุณาติดต่อผู้ดูแลระบบ')
        } else if (response.status >= 500) {
          throw new Error('เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่ภายหลัง')
        } else {
          throw new Error(result.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน')
        }
      }

      console.log('✅ Password changed successfully:', result)

      setSubmitSuccess('เปลี่ยนรหัสผ่านสำเร็จ กำลังเข้าสู่หน้าหลัก...')
      setTimeout(async () => {
        const hotelUrl = await getHotelUrl()
        navigate(hotelUrl)
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

                {/* Error/Success Messages - Moved inside form container */}
                {submitError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-red-700">
                        <p>{submitError}</p>
                      </div>
                    </div>
                  </div>
                )}

                {submitSuccess && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium">สำเร็จ</p>
                      <p>{submitSuccess}</p>
                    </div>
                  </div>
                )}
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
                      type={showCurrentPassword ? 'text' : 'password'}
                      className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="รหัสผ่านชั่วคราว"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
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

                {/* Error/Success Messages - Moved inside form container */}
                {submitError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-red-700">
                        <p>{submitError}</p>
                      </div>
                    </div>
                  </div>
                )}

                {submitSuccess && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium">สำเร็จ</p>
                      <p>{submitSuccess}</p>
                    </div>
                  </div>
                )}
              </form>
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