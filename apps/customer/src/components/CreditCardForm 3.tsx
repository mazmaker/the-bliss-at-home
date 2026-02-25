import { useState } from 'react'
import { CreditCard, Lock } from 'lucide-react'
import type { CardDetails } from '@bliss/supabase/payment'

interface CreditCardFormProps {
  onSubmit: (cardDetails: CardDetails) => void
  isLoading?: boolean
  submitButtonText?: string
}

function CreditCardForm({ onSubmit, isLoading, submitButtonText = 'Pay Securely' }: CreditCardFormProps) {
  const [cardDetails, setCardDetails] = useState<CardDetails>({
    name: '',
    number: '',
    expiration_month: '',
    expiration_year: '',
    security_code: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '')
    const groups = cleaned.match(/.{1,4}/g) || []
    return groups.join(' ').slice(0, 19) // Max 16 digits + 3 spaces
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value)
    setCardDetails({ ...cardDetails, number: formatted })
    if (errors.number) {
      setErrors({ ...errors, number: '' })
    }
  }

  const handleExpiryChange = (field: 'month' | 'year', value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (field === 'month') {
      const month = cleaned.slice(0, 2)
      setCardDetails({ ...cardDetails, expiration_month: month })
      if (errors.expiration_month) {
        setErrors({ ...errors, expiration_month: '' })
      }
    } else {
      const year = cleaned.slice(0, 4)
      setCardDetails({ ...cardDetails, expiration_year: year })
      if (errors.expiration_year) {
        setErrors({ ...errors, expiration_year: '' })
      }
    }
  }

  const handleCVVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 4)
    setCardDetails({ ...cardDetails, security_code: cleaned })
    if (errors.security_code) {
      setErrors({ ...errors, security_code: '' })
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Name validation
    if (!cardDetails.name.trim()) {
      newErrors.name = 'Cardholder name is required'
    }

    // Card number validation (simple check for 13-19 digits)
    const cardNumberClean = cardDetails.number.replace(/\s/g, '')
    if (cardNumberClean.length < 13 || cardNumberClean.length > 19) {
      newErrors.number = 'Invalid card number'
    }

    // Expiry month validation
    const month = parseInt(cardDetails.expiration_month)
    if (!cardDetails.expiration_month || month < 1 || month > 12) {
      newErrors.expiration_month = 'Invalid month'
    }

    // Expiry year validation
    const currentYear = new Date().getFullYear()
    const year = parseInt(cardDetails.expiration_year)
    if (!cardDetails.expiration_year || year < currentYear || year > currentYear + 20) {
      newErrors.expiration_year = 'Invalid year'
    }

    // CVV validation
    if (!cardDetails.security_code || cardDetails.security_code.length < 3) {
      newErrors.security_code = 'Invalid CVV'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSubmit(cardDetails)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Cardholder Name */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Cardholder Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={cardDetails.name}
          onChange={(e) => {
            setCardDetails({ ...cardDetails, name: e.target.value })
            if (errors.name) setErrors({ ...errors, name: '' })
          }}
          placeholder="JOHN DOE"
          disabled={isLoading}
          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent uppercase disabled:bg-stone-50 disabled:cursor-not-allowed ${
            errors.name ? 'border-red-500' : 'border-stone-300'
          }`}
        />
        {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
      </div>

      {/* Card Number */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Card Number <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={cardDetails.number}
            onChange={handleCardNumberChange}
            placeholder="1234 5678 9012 3456"
            disabled={isLoading}
            className={`w-full px-4 py-3 pr-12 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-stone-50 disabled:cursor-not-allowed ${
              errors.number ? 'border-red-500' : 'border-stone-300'
            }`}
          />
          <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-stone-400" />
        </div>
        {errors.number && <p className="text-xs text-red-600 mt-1">{errors.number}</p>}
      </div>

      {/* Expiry and CVV */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Month <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={cardDetails.expiration_month}
            onChange={(e) => handleExpiryChange('month', e.target.value)}
            placeholder="MM"
            maxLength={2}
            disabled={isLoading}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-stone-50 disabled:cursor-not-allowed ${
              errors.expiration_month ? 'border-red-500' : 'border-stone-300'
            }`}
          />
          {errors.expiration_month && <p className="text-xs text-red-600 mt-1">{errors.expiration_month}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Year <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={cardDetails.expiration_year}
            onChange={(e) => handleExpiryChange('year', e.target.value)}
            placeholder="YYYY"
            maxLength={4}
            disabled={isLoading}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-stone-50 disabled:cursor-not-allowed ${
              errors.expiration_year ? 'border-red-500' : 'border-stone-300'
            }`}
          />
          {errors.expiration_year && <p className="text-xs text-red-600 mt-1">{errors.expiration_year}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            CVV <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={cardDetails.security_code}
            onChange={handleCVVChange}
            placeholder="123"
            maxLength={4}
            disabled={isLoading}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-stone-50 disabled:cursor-not-allowed ${
              errors.security_code ? 'border-red-500' : 'border-stone-300'
            }`}
          />
          {errors.security_code && <p className="text-xs text-red-600 mt-1">{errors.security_code}</p>}
        </div>
      </div>

      {/* Security Note */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
          Your payment information is secure. We use Omise payment gateway with industry-standard encryption.
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Processing...</span>
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            <span>{submitButtonText}</span>
          </>
        )}
      </button>
    </form>
  )
}

export default CreditCardForm
