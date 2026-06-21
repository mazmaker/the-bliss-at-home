/**
 * Payment Form Component
 * Credit card payment form using Omise.js
 */

import { useState, useEffect } from 'react'
import { CreditCard, Lock } from 'lucide-react'
import { supabase } from '@bliss/supabase/auth'
import { useTranslation } from '@bliss/i18n'

// Omise.js types
declare global {
  interface Window {
    Omise: any
    OmiseCard: any
  }
}

export interface PaymentFormProps {
  amount: number
  bookingId: string
  customerId: string
  onSuccess?: (result: any) => void
  onError?: (error: string) => void
}

function PaymentForm({ amount, bookingId, customerId, onSuccess, onError }: PaymentFormProps) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiryMonth, setExpiryMonth] = useState('')
  const [expiryYear, setExpiryYear] = useState('')
  const [cvv, setCvv] = useState('')
  const [saveCard, setSaveCard] = useState(false)

  // Load Omise.js script
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdn.omise.co/omise.js'
    script.async = true
    document.body.appendChild(script)

    script.onload = () => {
      window.Omise.setPublicKey(import.meta.env.VITE_OMISE_PUBLIC_KEY)
    }

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '')
    const chunks = cleaned.match(/.{1,4}/g) || []
    return chunks.join(' ')
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, '')
    if (value.length <= 16 && /^\d*$/.test(value)) {
      setCardNumber(value)
    }
  }

  const handleExpiryMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value.length <= 2 && /^\d*$/.test(value)) {
      const month = parseInt(value)
      if (value === '' || (month >= 1 && month <= 12)) {
        setExpiryMonth(value)
      }
    }
  }

  const handleExpiryYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value.length <= 4 && /^\d*$/.test(value)) {
      setExpiryYear(value)
    }
  }

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value.length <= 4 && /^\d*$/.test(value)) {
      setCvv(value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validate inputs
      if (!cardName || !cardNumber || !expiryMonth || !expiryYear || !cvv) {
        throw new Error(t('booking:payment.validation.fillAllFields'))
      }

      if (cardNumber.length !== 16) {
        throw new Error(t('booking:payment.validation.invalidCardNumber'))
      }

      if (cvv.length < 3) {
        throw new Error(t('booking:payment.validation.invalidCvv'))
      }

      // Tokenize card with Omise.js
      window.Omise.createToken('card', {
        name: cardName,
        number: cardNumber,
        expiration_month: parseInt(expiryMonth),
        expiration_year: parseInt(expiryYear),
        security_code: cvv,
      }, async (statusCode: number, response: any) => {
        if (statusCode === 200) {
          // Token created successfully
          const token = response.id

          // Send token to backend
          try {
            const result = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')}/api/payments/create-charge`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              },
              body: JSON.stringify({
                booking_id: bookingId,
                customer_id: customerId,
                amount,
                token,
                payment_method: 'credit_card',
                card_info: {
                  brand: response.card.brand,
                  last_digits: response.card.last_digits,
                  expiry_month: response.card.expiration_month,
                  expiry_year: response.card.expiration_year,
                  name: cardName,
                },
              }),
            })

            const data = await result.json()

            if (data.success) {
              onSuccess?.(data)
            } else {
              throw new Error(data.error || t('booking:payment.error.paymentFailed'))
            }
          } catch (error: any) {
            console.error('Payment API error:', error)
            onError?.(error.message || t('booking:payment.error.paymentFailedRetry'))
          }
        } else {
          // Tokenization failed
          console.error('Omise tokenization error:', response)
          onError?.(response.message || t('booking:payment.error.cardValidationFailed'))
        }

        setIsLoading(false)
      })
    } catch (error: any) {
      console.error('Payment error:', error)
      onError?.(error.message || t('booking:payment.error.paymentFailedRetry'))
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gradient-to-r from-amber-50 to-stone-50 border border-amber-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-stone-700">
            <p className="font-medium mb-1">{t('booking:payment.securePayment.title')}</p>
            <p className="text-xs text-stone-600">
              {t('booking:payment.securePayment.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Cardholder Name */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          {t('booking:payment.form.cardholderName')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={cardName}
          onChange={(e) => setCardName(e.target.value)}
          placeholder={t('booking:payment.form.cardholderNamePlaceholder')}
          className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent uppercase"
          required
          disabled={isLoading}
        />
      </div>

      {/* Card Number */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          {t('booking:payment.form.cardNumber')} <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={formatCardNumber(cardNumber)}
            onChange={handleCardNumberChange}
            placeholder={t('booking:payment.form.cardNumberPlaceholder')}
            className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent pl-12"
            required
            disabled={isLoading}
          />
          <CreditCard className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Expiry Date and CVV */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            {t('booking:payment.form.expiryMonth')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={expiryMonth}
            onChange={handleExpiryMonthChange}
            placeholder={t('booking:payment.form.expiryMonthPlaceholder')}
            className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-center"
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            {t('booking:payment.form.expiryYear')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={expiryYear}
            onChange={handleExpiryYearChange}
            placeholder={t('booking:payment.form.expiryYearPlaceholder')}
            className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-center"
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            {t('booking:payment.form.cvv')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={cvv}
            onChange={handleCvvChange}
            placeholder={t('booking:payment.form.cvvPlaceholder')}
            className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-center"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Save Card Option */}
      <div className="flex items-center gap-2 pt-2">
        <input
          type="checkbox"
          id="saveCard"
          checked={saveCard}
          onChange={(e) => setSaveCard(e.target.checked)}
          className="w-4 h-4 text-amber-700 border-stone-300 rounded focus:ring-amber-500"
          disabled={isLoading}
        />
        <label htmlFor="saveCard" className="text-sm text-stone-700">
          {t('booking:payment.form.saveCardForFuture')}
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-amber-700 text-white py-4 rounded-xl font-medium hover:bg-amber-800 transition disabled:bg-stone-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            {t('booking:payment.form.processing')}
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            {t('booking:payment.form.payButton')} ฿{amount.toLocaleString()}
          </>
        )}
      </button>

      {/* Test Card Info */}
      {import.meta.env.DEV && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
          <p className="font-medium mb-1">{t('booking:payment.testMode.title')}</p>
          <p>{t('booking:payment.testMode.testCardNumber')}</p>
          <p>{t('booking:payment.testMode.testCardDetails')}</p>
        </div>
      )}
    </form>
  )
}

export default PaymentForm
