import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Phone, Eye, EyeOff, ArrowLeft, Check, AlertCircle } from 'lucide-react'
import { authService } from '@bliss/supabase/auth'
import type { RegisterCredentials } from '@bliss/supabase/auth'
import { useTranslation } from '@bliss/i18n'

function generateTestData() {
  const firstNames = ['สมชาย', 'สมหญิง', 'วิชัย', 'สุดา', 'ประเสริฐ', 'นภา', 'ธนา', 'พิมพ์', 'กิตติ', 'อรุณ']
  const lastNames = ['ใจดี', 'สุขสันต์', 'มีชัย', 'รักไทย', 'แสนดี', 'วงษ์สวัสดิ์', 'พงศ์พันธ์', 'ศรีสุข']
  const id = Math.random().toString(36).slice(2, 7)
  const name = firstNames[Math.floor(Math.random() * firstNames.length)]
  const surname = lastNames[Math.floor(Math.random() * lastNames.length)]
  const phone = `08${Math.floor(Math.random() * 2) + 1}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
  return {
    name: `${name} ${surname}`,
    email: `test.${id}@example.com`,
    phone,
    password: 'Test1234!',
    confirmPassword: 'Test1234!',
    agreeToTerms: true,
  }
}

function Register() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState(generateTestData)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Validate password match
      if (formData.password !== formData.confirmPassword) {
        setError(t('register.passwordMismatch'))
        setIsLoading(false)
        return
      }

      // Prepare registration data
      const credentials: RegisterCredentials = {
        email: formData.email,
        password: formData.password,
        fullName: formData.name,
        phone: formData.phone,
        role: 'CUSTOMER',
      }

      // Register with authService
      await authService.register(credentials)

      // Success - redirect to services page
      navigate('/services')
    } catch (err: any) {
      console.error('Registration error:', err)
      setError(err.message || t('register.error'))
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid = () => {
    return (
      formData.name &&
      formData.email &&
      formData.phone &&
      formData.password &&
      formData.password === formData.confirmPassword &&
      formData.agreeToTerms
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl">
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('register.backToHome')}</span>
        </Link>

        {/* Register Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-stone-100">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-700 to-amber-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">บ</span>
            </div>
            <h1 className="text-2xl font-bold text-stone-900">{t('register.title')}</h1>
            <p className="text-stone-500">{t('register.subtitle')}</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3" role="alert">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {t('register.fullName')}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('register.namePlaceholder')}
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-stone-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {t('register.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('register.emailPlaceholder')}
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-stone-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {t('register.phone')}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={t('register.phonePlaceholder')}
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-stone-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {t('register.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={t('register.passwordPlaceholder')}
                  required
                  minLength={8}
                  disabled={isLoading}
                  className="w-full pl-10 pr-12 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-stone-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-stone-500 mt-1">{t('register.passwordHint')}</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {t('register.confirmPassword')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder={t('register.passwordPlaceholder')}
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-12 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-stone-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 disabled:opacity-50"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">{t('register.passwordMismatch')}</p>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                  <Check className="w-3 h-3" />
                  <span>{t('register.passwordMatch')}</span>
                </div>
              )}
            </div>

            {/* Terms & Conditions */}
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={formData.agreeToTerms}
                onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                required
                disabled={isLoading}
                className="w-4 h-4 mt-0.5 text-amber-700 rounded focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
              />
              <span className="text-sm text-stone-600">
                {t('register.agreeTerms')}{' '}
                <Link to="/terms" className="text-amber-700 hover:underline">
                  {t('register.termsOfService')}
                </Link>{' '}
                {t('register.and')}{' '}
                <Link to="/privacy" className="text-amber-700 hover:underline">
                  {t('register.privacyPolicy')}
                </Link>
              </span>
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isFormValid() || isLoading}
              className="w-full py-3 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{t('register.submitting')}</span>
                </>
              ) : (
                t('register.submit')
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-sm text-stone-600 mt-6">
            {t('register.haveAccount')}{' '}
            <Link to="/login" className="text-amber-700 hover:text-amber-800 font-medium">
              {t('register.loginLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
