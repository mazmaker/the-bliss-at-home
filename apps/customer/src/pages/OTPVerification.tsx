import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Smartphone, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { useTranslation } from '@bliss/i18n'
import LanguageSwitcher from '../components/LanguageSwitcher'

interface OTPVerificationProps {
  phoneNumber?: string
  onVerified?: () => void
}

function OTPVerification({ phoneNumber: propPhoneNumber, onVerified }: OTPVerificationProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Get phone number from props or location state
  const phoneNumber = propPhoneNumber || (location.state as any)?.phoneNumber || ''

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [countdown])

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1)
    }

    if (!/^\d*$/.test(value)) {
      return
    }

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').trim()
    if (!/^\d{6}$/.test(pastedData)) {
      return
    }

    const newOtp = pastedData.split('')
    setOtp(newOtp)
    inputRefs.current[5]?.focus()
  }

  const handleVerify = async () => {
    const otpCode = otp.join('')
    if (otpCode.length !== 6) {
      setError(t('auth:otpVerification.errorIncomplete'))
      return
    }

    setIsVerifying(true)
    setError(null)

    try {
      // Call backend API to verify OTP
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')}/api/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber,
          code: otpCode
        }),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || t('auth:otpVerification.errorVerificationFailed'))
        return
      }

      setSuccess(true)

      // Call onVerified callback if provided
      if (onVerified) {
        onVerified()
      } else {
        // Navigate to home after 2 seconds
        setTimeout(() => {
          navigate('/')
        }, 2000)
      }
    } catch (err: any) {
      setError(err.message || t('auth:otpVerification.errorVerificationFailedRetry'))
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendOTP = async () => {
    if (!canResend) return

    setCanResend(false)
    setCountdown(60)
    setError(null)
    setOtp(['', '', '', '', '', ''])

    try {
      // Call backend API to resend OTP
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')}/api/otp/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber }),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || t('auth:otpVerification.errorResendFailed'))
        setCountdown(0)
        setCanResend(true)
      }
    } catch (err) {
      console.error('Failed to resend OTP:', err)
      setError(t('auth:otpVerification.errorResendError'))
      setCountdown(0)
      setCanResend(true)
    }
  }

  const maskPhoneNumber = (phone: string) => {
    if (phone.length < 4) return phone
    return phone.slice(0, 3) + '***' + phone.slice(-4)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-bliss-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-bliss-900 mb-2">{t('auth:otpVerification.successTitle')}</h2>
            <p className="text-bliss-700">{t('auth:otpVerification.successMessage')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bliss-100 py-8">
      <div className="container mx-auto px-4 max-w-md">
        {/* Back Button + Language Switcher */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-bliss-700 hover:text-bliss-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t('common:buttons.back')}</span>
          </button>
          <LanguageSwitcher />
        </div>

        {/* OTP Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-bliss-200 rounded-full mb-4">
              <Smartphone className="w-8 h-8 text-bliss-600" />
            </div>
            <h1 className="text-2xl font-bold text-bliss-900 mb-2">{t('auth:otpVerification.pageTitle')}</h1>
            <p className="text-bliss-700 text-sm">
              {t('auth:otpVerification.descriptionPrefix')}
            </p>
            <p className="text-bliss-900 font-medium mt-1">
              {maskPhoneNumber(phoneNumber)}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* OTP Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-bliss-700 mb-3 text-center">
              {t('auth:otpVerification.inputLabel')}
            </label>
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={isVerifying}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-bliss-300 rounded-xl focus:ring-2 focus:ring-bliss-600 focus:border-bliss-600 disabled:bg-bliss-100 disabled:cursor-not-allowed"
                />
              ))}
            </div>
          </div>

          {/* Verify Button */}
          <button
            onClick={handleVerify}
            disabled={otp.join('').length !== 6 || isVerifying}
            className="w-full py-3 bg-bliss-600 text-white rounded-xl font-medium hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>{t('auth:otpVerification.verifying')}</span>
              </>
            ) : (
              t('auth:otpVerification.verifyButton')
            )}
          </button>

          {/* Resend OTP */}
          <div className="mt-6 text-center">
            {canResend ? (
              <button
                onClick={handleResendOTP}
                className="text-bliss-600 hover:text-bliss-800 font-medium text-sm"
              >
                {t('auth:otpVerification.resendButton')}
              </button>
            ) : (
              <p className="text-bliss-500 text-sm">
                {t('auth:otpVerification.resendCountdownPrefix')}{' '}
                <span className="font-medium text-bliss-600">{countdown}</span> {t('auth:otpVerification.resendCountdownSuffix')}
              </p>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-800">
              <strong>{t('auth:otpVerification.helpTitle')}</strong>
              <br />
              {t('auth:otpVerification.helpText1')}
              <br />
              {t('auth:otpVerification.helpText2')}
              <br />{t('auth:otpVerification.helpText3')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OTPVerification
