import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Smartphone, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'

interface OTPVerificationProps {
  phoneNumber?: string
  onVerified?: () => void
}

function OTPVerification({ phoneNumber: propPhoneNumber, onVerified }: OTPVerificationProps) {
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
      setError('กรุณากรอก OTP ให้ครบ 6 หลัก')
      return
    }

    setIsVerifying(true)
    setError(null)

    try {
      // Call backend API to verify OTP
      const response = await fetch('http://localhost:3000/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber,
          code: otpCode
        }),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'การยืนยัน OTP ล้มเหลว')
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
      setError(err.message || 'การยืนยัน OTP ล้มเหลว กรุณาลองใหม่อีกครั้ง')
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
      const response = await fetch('http://localhost:3000/api/otp/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber }),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'ไม่สามารถส่ง OTP ใหม่ได้')
        setCountdown(0)
        setCanResend(true)
      }
    } catch (err) {
      console.error('Failed to resend OTP:', err)
      setError('เกิดข้อผิดพลาดในการส่ง OTP ใหม่')
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
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-stone-900 mb-2">ยืนยันสำเร็จ!</h2>
            <p className="text-stone-600">หมายเลขโทรศัพท์ของคุณได้รับการยืนยันแล้ว</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 py-8">
      <div className="container mx-auto px-4 max-w-md">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>ย้อนกลับ</span>
        </button>

        {/* OTP Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
              <Smartphone className="w-8 h-8 text-amber-700" />
            </div>
            <h1 className="text-2xl font-bold text-stone-900 mb-2">ยืนยันเบอร์โทรศัพท์</h1>
            <p className="text-stone-600 text-sm">
              เราได้ส่งรหัส OTP 6 หลักไปยัง
            </p>
            <p className="text-stone-900 font-medium mt-1">
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
            <label className="block text-sm font-medium text-stone-700 mb-3 text-center">
              กรุณากรอกรหัส OTP
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
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-stone-50 disabled:cursor-not-allowed"
                />
              ))}
            </div>
          </div>

          {/* Verify Button */}
          <button
            onClick={handleVerify}
            disabled={otp.join('').length !== 6 || isVerifying}
            className="w-full py-3 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>กำลังตรวจสอบ...</span>
              </>
            ) : (
              'ยืนยัน OTP'
            )}
          </button>

          {/* Resend OTP */}
          <div className="mt-6 text-center">
            {canResend ? (
              <button
                onClick={handleResendOTP}
                className="text-amber-700 hover:text-amber-900 font-medium text-sm"
              >
                ส่งรหัส OTP อีกครั้ง
              </button>
            ) : (
              <p className="text-stone-500 text-sm">
                ส่งรหัสใหม่ได้ในอีก{' '}
                <span className="font-medium text-amber-700">{countdown}</span> วินาที
              </p>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-800">
              <strong>ไม่ได้รับรหัส OTP?</strong>
              <br />
              • ตรวจสอบว่าเบอร์โทรศัพท์ถูกต้อง
              <br />
              • รอสักครู่แล้วลองอีกครั้ง
              <br />• ติดต่อฝ่ายสนับสนุนหากยังมีปัญหา
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OTPVerification
