import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Phone, Eye, EyeOff, ArrowLeft, Check, AlertCircle, HeartPulse } from 'lucide-react'
import { authService } from '@bliss/supabase/auth'
import type { RegisterCredentials } from '@bliss/supabase/auth'
import { supabase, getCurrentCustomer } from '@bliss/supabase'
import { useTranslation } from '@bliss/i18n'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { RefundPolicyConsent } from '../components/RefundPolicyConsent'
import {
  HealthChecklistFields,
  createEmptyHealthForm,
  isHealthFormValid,
  saveHealthDeclaration,
  type HealthFormState,
} from '../components/HealthDeclarationModal'

function Register() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    agreeToRefundPolicy: false,
  })
  // Health declaration — required at first registration (ข้อควรระวังและข้อมูลสุขภาพ)
  const [healthForm, setHealthForm] = useState<HealthFormState>(() => createEmptyHealthForm())

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

      // Save health declaration (creates the customer record if needed).
      // Non-fatal: if it fails, the booking-time gate will ask again.
      try {
        const customer = await getCurrentCustomer(supabase as any)
        if (customer?.id) {
          await saveHealthDeclaration(customer.id, healthForm)
        }
      } catch (healthErr) {
        console.error('Failed to save health declaration during registration:', healthErr)
      }

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
      formData.agreeToTerms &&
      formData.agreeToRefundPolicy &&
      // Must check at least one health condition (or "no condition") + confirmation
      isHealthFormValid(healthForm)
    )
  }

  return (
    <div className="min-h-screen bg-bliss-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl">
        {/* Back Button + Language Switcher */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-bliss-700 hover:text-bliss-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t('register.backToHome')}</span>
          </Link>
          <LanguageSwitcher />
        </div>

        {/* Register Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-bliss-100">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-bliss-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">บ</span>
            </div>
            <h1 className="text-2xl font-bold text-bliss-900">{t('register.title')}</h1>
            <p className="text-bliss-500">{t('register.subtitle')}</p>
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
              <label className="block text-sm font-medium text-bliss-700 mb-2">
                {t('register.fullName')}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-bliss-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('register.namePlaceholder')}
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 border border-bliss-300 rounded-xl focus:ring-2 focus:ring-bliss-600 focus:border-bliss-600 disabled:bg-bliss-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-bliss-700 mb-2">
                {t('register.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-bliss-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('register.emailPlaceholder')}
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 border border-bliss-300 rounded-xl focus:ring-2 focus:ring-bliss-600 focus:border-bliss-600 disabled:bg-bliss-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-bliss-700 mb-2">
                {t('register.phone')}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-bliss-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={t('register.phonePlaceholder')}
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 border border-bliss-300 rounded-xl focus:ring-2 focus:ring-bliss-600 focus:border-bliss-600 disabled:bg-bliss-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-bliss-700 mb-2">
                {t('register.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-bliss-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={t('register.passwordPlaceholder')}
                  required
                  minLength={8}
                  disabled={isLoading}
                  className="w-full pl-10 pr-12 py-3 border border-bliss-300 rounded-xl focus:ring-2 focus:ring-bliss-600 focus:border-bliss-600 disabled:bg-bliss-100 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-bliss-400 hover:text-bliss-700 disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-bliss-500 mt-1">{t('register.passwordHint')}</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-bliss-700 mb-2">
                {t('register.confirmPassword')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-bliss-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder={t('register.passwordPlaceholder')}
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-12 py-3 border border-bliss-300 rounded-xl focus:ring-2 focus:ring-bliss-600 focus:border-bliss-600 disabled:bg-bliss-100 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-bliss-400 hover:text-bliss-700 disabled:opacity-50"
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
                className="w-4 h-4 mt-0.5 text-bliss-600 rounded focus:ring-2 focus:ring-bliss-600 disabled:opacity-50"
              />
              <span className="text-sm text-bliss-700">
                {t('register.agreeTerms')}{' '}
                <Link to="/terms" className="text-bliss-600 hover:underline">
                  {t('register.termsOfService')}
                </Link>{' '}
                {t('register.and')}{' '}
                <Link to="/privacy" className="text-bliss-600 hover:underline">
                  {t('register.privacyPolicy')}
                </Link>
              </span>
            </label>

            {/* Refund Policy Consent */}
            <RefundPolicyConsent
              accepted={formData.agreeToRefundPolicy}
              onAcceptedChange={(accepted) => setFormData({ ...formData, agreeToRefundPolicy: accepted })}
              hideAcceptButton
            />

            {/* Health Declaration — required before submit */}
            <div className="border border-bliss-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <HeartPulse className="w-5 h-5 text-bliss-600" />
                <h2 className="font-semibold text-bliss-900">
                  {t('auth:register.healthDeclarationTitle')}
                </h2>
              </div>
              <HealthChecklistFields
                value={healthForm}
                onChange={setHealthForm}
                disabled={isLoading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isFormValid() || isLoading}
              className="w-full py-3 bg-bliss-600 text-white rounded-xl font-medium hover:bg-bliss-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          <p className="text-center text-sm text-bliss-700 mt-6">
            {t('register.haveAccount')}{' '}
            <Link to="/login" className="text-bliss-600 hover:text-bliss-700 font-medium">
              {t('register.loginLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
