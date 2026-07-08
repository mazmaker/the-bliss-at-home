/**
 * Extension Payment Page
 * Handles payment for session-extension charges.
 * Supports all admin-configured channels: PromptPay, Credit Card,
 * Internet Banking, and Mobile Banking — same as regular booking.
 */

import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, QrCode, CreditCard, Clock, AlertTriangle, CheckCircle, Lock, Building2, Smartphone } from 'lucide-react'
import { useTranslation } from '@bliss/i18n'
import { supabase } from '@bliss/supabase/auth'
import ManualPaymentInstructions, { type ManualQrConfig } from '../components/ManualPaymentInstructions'

const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')

async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}

type Channel = 'credit_card' | 'promptpay' | 'internet_banking' | 'mobile_banking'

interface CardForm {
  name: string
  number: string
  expiry: string
  cvv: string
}

const BANKS = [
  { code: 'scb',   label: 'SCB',   color: 'bg-purple-600',  hover: 'hover:border-purple-500 hover:bg-purple-50' },
  { code: 'kbank', label: 'K',     color: 'bg-green-600',   hover: 'hover:border-green-500 hover:bg-green-50' },
  { code: 'bbl',   label: 'BBL',   color: 'bg-blue-700',    hover: 'hover:border-blue-500 hover:bg-blue-50' },
  { code: 'ktb',   label: 'KTB',   color: 'bg-cyan-600',    hover: 'hover:border-cyan-500 hover:bg-cyan-50' },
  { code: 'bay',   label: 'BAY',   color: 'bg-yellow-500',  hover: 'hover:border-yellow-500 hover:bg-yellow-50' },
  { code: 'ttb',   label: 'TTB',   color: 'bg-orange-500',  hover: 'hover:border-orange-500 hover:bg-orange-50' },
]

function ExtensionPayment() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation('extension')

  const bookingId     = searchParams.get('booking_id')     || ''
  const bookingNumber = searchParams.get('booking_number') || ''
  const duration      = Number(searchParams.get('duration') || 0)
  const amount        = Number(searchParams.get('amount')   || 0)
  const promotionId   = searchParams.get('promotion_id')   || undefined
  const discountAmt   = searchParams.get('discount_amount')
    ? Number(searchParams.get('discount_amount'))
    : undefined
  const notes         = searchParams.get('notes')          || undefined

  const [enabledChannels, setEnabledChannels] = useState<string[]>([])
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [promptpayQR, setPromptpayQR]         = useState<string | null>(null)
  const [chargeId, setChargeId]               = useState<string | null>(null)
  const [isLoading, setIsLoading]             = useState(false)
  const [error, setError]                     = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess]   = useState(false)
  const [cardForm, setCardForm]               = useState<CardForm>({ name: '', number: '', expiry: '', cvv: '' })
  const [omiseReady, setOmiseReady]           = useState(false)
  // [manual-QR] admin payment mode + config (from the same enabled-channels fetch). Default omise.
  const [paymentMode, setPaymentMode]         = useState<'omise' | 'manual_qr'>('omise')
  const [manualQrConfig, setManualQrConfig]   = useState<ManualQrConfig | null>(null)
  // [manual-QR] PART47 P3: no-payment submit state — manual_qr paid extend registers a PENDING
  // (admin confirms after the slip); a FREE (amount=0) extend applies immediately.
  const [channelsResolved, setChannelsResolved] = useState(false)
  const [pendingState, setPendingState]       = useState<'idle' | 'submitting' | 'awaiting_admin' | 'error'>('idle')
  const [pendingInfo, setPendingInfo]         = useState<{ bookingNumber?: string; amount?: number } | null>(null)
  const submittedRef = useRef(false)

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/api/payments/enabled-channels`)
      .then(r => r.json())
      .then(d => {
        if (d?.success && Array.isArray(d.channels)) setEnabledChannels(d.channels)
        // [manual-QR] G23: extension must honour the mode too → render the manual screen instead of Omise.
        if (d?.payment_mode === 'manual_qr') {
          setPaymentMode('manual_qr')
          if (d.manual_qr) setManualQrConfig(d.manual_qr)
        }
      })
      .catch(() => {})
      .finally(() => setChannelsResolved(true))
  }, [])

  useEffect(() => {
    if (paymentMode === 'manual_qr') return // [manual-QR] defense: never load Omise.js in manual mode
    if (selectedChannel !== 'credit_card') return
    if ((window as any).Omise) {
      ;(window as any).Omise.setPublicKey(import.meta.env.VITE_OMISE_PUBLIC_KEY)
      setOmiseReady(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdn.omise.co/omise.js'
    script.onload = () => {
      ;(window as any).Omise.setPublicKey(import.meta.env.VITE_OMISE_PUBLIC_KEY)
      setOmiseReady(true)
    }
    document.head.appendChild(script)
  }, [selectedChannel, paymentMode])

  useEffect(() => {
    if (!chargeId) return

    const stopPolling = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }

    const poll = async () => {
      try {
        const res  = await fetch(`${API_URL}/api/payments/status/${chargeId}`)
        const data = await res.json()
        if (data.status === 'successful') {
          stopPolling()
          setPaymentSuccess(true)
          setTimeout(() => {
            navigate(`/bookings/${bookingNumber || bookingId}?payment=success&type=extension`)
          }, 2000)
        } else if (data.status === 'failed') {
          stopPolling()
          setError(t('payment.errPaymentFailed'))
        }
      } catch {
        // transient error — keep polling
      }
    }

    pollTimerRef.current = setInterval(poll, 3000)
    const timeout = setTimeout(stopPolling, 15 * 60 * 1000)

    return () => {
      stopPolling()
      clearTimeout(timeout)
    }
  }, [chargeId, bookingId, bookingNumber, navigate])

  const callExtendAPI = async (paymentMethod: string, omiseToken?: string, bankCode?: string) => {
    const token = await getAccessToken()
    const body: Record<string, any> = {
      additional_duration: duration,
      requested_by: 'customer',
      payment_method: paymentMethod,
    }
    if (promotionId)          body.promotion_id    = promotionId
    if (discountAmt != null)  body.discount_amount = discountAmt
    if (notes)                body.notes           = notes
    if (omiseToken)           body.omise_token     = omiseToken
    if (bankCode)             body.bank_code       = bankCode

    const res = await fetch(`${API_URL}/api/bookings/${bookingId}/extend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
    return res.json()
  }

  // [manual-QR] PART47 P3: register the extension WITHOUT an Omise payment method. The server branches:
  // paid + manual_qr → PENDING (status 'requires_admin_confirmation', admin confirms after the slip);
  // free (amount=0) → applies immediately (hotel/free branch).
  const submitExtensionNoPayment = async () => {
    const token = await getAccessToken()
    const body: Record<string, any> = { additional_duration: duration, requested_by: 'customer' }
    if (promotionId)         body.promotion_id    = promotionId
    if (discountAmt != null) body.discount_amount = discountAmt
    if (notes)               body.notes           = notes
    const res = await fetch(`${API_URL}/api/bookings/${bookingId}/extend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    })
    return res.json()
  }

  // Fire the no-payment submit exactly once — for a FREE extend (apply now) or a manual_qr paid extend
  // (register pending). Omise-paid (amount>0, omise mode) keeps the normal channel-selector flow.
  useEffect(() => {
    if (submittedRef.current) return
    if (!bookingId || duration <= 0) return
    const isFree = amount === 0
    const isManual = paymentMode === 'manual_qr'
    if (!isFree && !isManual) return           // omise paid → channel selector below
    if (!isFree && !channelsResolved) return   // wait until the mode is known for a paid extend
    submittedRef.current = true
    setPendingState('submitting')
    submitExtensionNoPayment()
      .then((result) => {
        if (result?.status === 'requires_admin_confirmation') {
          setPendingInfo({
            bookingNumber: result?.booking?.booking_number || bookingNumber,
            amount: result?.extension?.final_price ?? amount,
          })
          setPendingState('awaiting_admin')
        } else if (result?.success) {
          setPaymentSuccess(true) // free extension applied immediately
          setTimeout(() => navigate(`/bookings/${bookingNumber || bookingId}?payment=success&type=extension`), 2000)
        } else {
          setError(result?.message || t('pending.errSubmitRetry'))
          setPendingState('error')
        }
      })
      .catch((e) => {
        setError(e?.message || t('pending.errSubmitGeneric'))
        setPendingState('error')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMode, channelsResolved, amount, bookingId, duration])

  const handlePromptPay = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await callExtendAPI('promptpay')
      if (result.payment?.payment_url) {
        setPromptpayQR(result.payment.payment_url)
        setChargeId(result.payment.payment_reference)
      } else if (result.success) {
        setPaymentSuccess(true)
        setTimeout(() => navigate(`/bookings/${bookingNumber || bookingId}?payment=success&type=extension`), 2000)
      } else {
        setError(result.message || t('payment.errQRFailed'))
      }
    } catch {
      setError(t('payment.errGeneric'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreditCard = async (omiseToken: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await callExtendAPI('credit_card', omiseToken)
      if (result.success) {
        if (result.payment?.charge_status === 'successful' || result.payment?.requires_payment === false) {
          setPaymentSuccess(true)
          setTimeout(() => navigate(`/bookings/${bookingNumber || bookingId}?payment=success&type=extension`), 2000)
        } else if (result.payment?.payment_reference) {
          setChargeId(result.payment.payment_reference)
        } else {
          setPaymentSuccess(true)
          setTimeout(() => navigate(`/bookings/${bookingNumber || bookingId}?payment=success&type=extension`), 2000)
        }
      } else {
        setError(result.message || t('payment.errPaymentFailedShort'))
      }
    } catch {
      setError(t('payment.errGeneric'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleBanking = async (bankCode: string, isMobile: boolean) => {
    setIsLoading(true)
    setError(null)
    const method = isMobile ? 'mobile_banking' : 'internet_banking'
    try {
      const result = await callExtendAPI(method, undefined, bankCode)
      if (result.success && result.payment?.authorize_uri) {
        // Save charge ID so BookingDetails can poll after redirect back
        if (result.payment?.payment_reference) {
          sessionStorage.setItem(`ext_charge_${bookingNumber || bookingId}`, result.payment.payment_reference)
        }
        window.location.href = result.payment.authorize_uri
      } else {
        setError(result.message || t('payment.errBankFailed'))
        setIsLoading(false)
      }
    } catch {
      setError(t('payment.errGeneric'))
      setIsLoading(false)
    }
  }

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!omiseReady) { setError(t('payment.errSystemNotReady')); return }

    const [mm, yy] = cardForm.expiry.split('/')
    ;(window as any).Omise.createToken(
      'card',
      {
        name: cardForm.name,
        number: cardForm.number.replace(/\s/g, ''),
        expiration_month: parseInt(mm, 10),
        expiration_year: 2000 + parseInt(yy || '0', 10),
        security_code: cardForm.cvv,
      },
      (statusCode: number, response: any) => {
        if (statusCode === 200) handleCreditCard(response.id)
        else setError(response.message || t('payment.errInvalidCard'))
      }
    )
  }

  const formatCardNumber = (v: string) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()

  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4)
    return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
  }

  const resetChannel = () => {
    setSelectedChannel(null)
    setPromptpayQR(null)
    setChargeId(null)
    setError(null)
  }

  // Exit to an EXPLICIT safe route — never navigate(-1). This page is a ProtectedRoute, so a deep
  // link (e.g. from LINE) enters via /login, leaving /login as the previous history entry; navigate(-1)
  // returns there and Login redirects back here (state.from) → an inescapable loop (worst for a booking
  // that admin already deleted). Go to the booking detail (which renders its own "back to history" link
  // when the booking is missing) or, absent a ref, the history list.
  const goBack = () =>
    navigate(bookingNumber || bookingId ? `/bookings/${bookingNumber || bookingId}` : '/bookings')

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-bliss-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-bliss-900 mb-2">{t('payment.successTitle')}</h1>
          <p className="text-bliss-700">{t('payment.successRedirect')}</p>
        </div>
      </div>
    )
  }

  // [manual-QR] PART47 P3: manual mode (paid → pending admin confirm) OR a free extend (applied now).
  // Register via submitExtensionNoPayment (fired in the effect above); skip the Omise channel selector.
  if (amount === 0 || paymentMode === 'manual_qr') {
    return (
      <div className="min-h-screen bg-bliss-100">
        <div className="bg-bliss-50 border-b border-bliss-200 sticky top-0 z-10">
          <div className="max-w-md mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <button onClick={goBack} className="p-2 -ml-2 text-bliss-700 hover:text-bliss-900 transition">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-semibold text-bliss-900">{t('payment.title')}</h1>
            </div>
          </div>
        </div>
        <div className="max-w-md mx-auto p-4 space-y-4">
          {duration > 0 && (
            <div className="bg-bliss-50 rounded-xl p-6 border border-bliss-200">
              <h2 className="text-lg font-semibold text-bliss-900 mb-4">{t('payment.summaryTitle')}</h2>
              <div className="flex justify-between">
                <span className="text-bliss-700 flex items-center gap-1"><Clock className="w-4 h-4" />{t('payment.addTime')}</span>
                <span className="font-medium">{duration} {t('payment.minutes')}</span>
              </div>
            </div>
          )}

          {(pendingState === 'submitting' || pendingState === 'idle') && (
            <div className="bg-bliss-50 rounded-xl p-8 border border-bliss-200 text-center">
              <div className="inline-block w-8 h-8 border-3 border-bliss-300 border-t-bliss-600 rounded-full animate-spin mb-3" />
              <p className="text-bliss-700">{t('pending.submitting')}</p>
            </div>
          )}

          {pendingState === 'error' && (
            <div className="bg-red-50 rounded-xl p-6 border border-red-200 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
              <p className="text-red-700">{error || t('pending.errSubmitFailed')}</p>
              <button onClick={goBack} className="px-5 py-2 bg-bliss-600 text-white rounded-lg font-medium">
                {t('pending.back')}
              </button>
            </div>
          )}

          {pendingState === 'awaiting_admin' && (
            <>
              <div className="bg-amber-50 rounded-xl p-5 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-semibold">
                  <Clock className="w-5 h-5" />
                  {t('pending.awaitingTitle')}
                </div>
                <p className="text-sm text-amber-700">
                  {pendingInfo?.bookingNumber
                    ? t('pending.awaitingBodyWithRef', { amount: (pendingInfo?.amount ?? amount).toLocaleString(), bookingNumber: pendingInfo.bookingNumber })
                    : t('pending.awaitingBody', { amount: (pendingInfo?.amount ?? amount).toLocaleString() })}
                </p>
              </div>
              <ManualPaymentInstructions
                bookingNumber={pendingInfo?.bookingNumber || bookingNumber || null}
                amount={pendingInfo?.amount ?? amount}
                config={manualQrConfig}
              />
            </>
          )}
        </div>
      </div>
    )
  }

  const isBanking = selectedChannel === 'internet_banking' || selectedChannel === 'mobile_banking'

  return (
    <div className="min-h-screen bg-bliss-100">
      {/* Header */}
      <div className="bg-bliss-50 border-b border-bliss-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => selectedChannel ? resetChannel() : goBack()}
              className="p-2 -ml-2 text-bliss-700 hover:text-bliss-900 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-bliss-900">{t('payment.title')}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Summary */}
        <div className="bg-bliss-50 rounded-xl p-6 border border-bliss-200">
          <h2 className="text-lg font-semibold text-bliss-900 mb-4">{t('payment.summaryTitle')}</h2>
          <div className="space-y-3">
            {bookingNumber && (
              <div className="flex justify-between">
                <span className="text-bliss-700">{t('payment.bookingNumber')}</span>
                <span className="font-medium">{bookingNumber}</span>
              </div>
            )}
            {duration > 0 && (
              <div className="flex justify-between">
                <span className="text-bliss-700 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {t('payment.addTime')}
                </span>
                <span className="font-medium">{duration} {t('payment.minutes')}</span>
              </div>
            )}
            <div className="border-t border-bliss-200 pt-3">
              <div className="flex justify-between text-lg font-semibold">
                <span>{t('payment.amountDue')}</span>
                <span className="text-bliss-600">฿{amount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">{t('payment.errorTitle')}</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <button onClick={resetChannel} className="mt-2 text-sm text-bliss-600 font-medium underline">
                {t('payment.retry')}
              </button>
            </div>
          </div>
        )}

        {/* ── Channel selection ─────────────────────────────────────── */}
        {!selectedChannel && !error && (
          <div className="bg-bliss-50 rounded-xl p-6 border border-bliss-200 space-y-4">
            <h3 className="font-semibold text-bliss-900">{t('payment.selectMethod')}</h3>
            <div className="grid gap-3">

              {enabledChannels.includes('promptpay') && (
                <button
                  onClick={() => { setSelectedChannel('promptpay'); handlePromptPay() }}
                  className="flex items-center gap-4 p-4 border-2 border-bliss-200 rounded-xl hover:border-bliss-500 hover:bg-bliss-100 transition-all text-left"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-bliss-600 flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-bliss-900">PromptPay</p>
                    <p className="text-sm text-bliss-500">{t('payment.promptpayDesc')}</p>
                  </div>
                </button>
              )}

              {enabledChannels.includes('credit_card') && (
                <button
                  onClick={() => setSelectedChannel('credit_card')}
                  className="flex items-center gap-4 p-4 border-2 border-bliss-200 rounded-xl hover:border-bliss-500 hover:bg-bliss-100 transition-all text-left"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-bliss-600 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-bliss-900">{t('payment.creditCard')}</p>
                    <p className="text-sm text-bliss-500">Visa, Mastercard</p>
                  </div>
                </button>
              )}

              {enabledChannels.includes('internet_banking') && (
                <button
                  onClick={() => setSelectedChannel('internet_banking')}
                  className="flex items-center gap-4 p-4 border-2 border-bliss-200 rounded-xl hover:border-bliss-500 hover:bg-bliss-100 transition-all text-left"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-bliss-600 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-bliss-900">Internet Banking</p>
                    <p className="text-sm text-bliss-500">{t('payment.internetBankingDesc')}</p>
                  </div>
                </button>
              )}

              {enabledChannels.includes('mobile_banking') && (
                <button
                  onClick={() => setSelectedChannel('mobile_banking')}
                  className="flex items-center gap-4 p-4 border-2 border-bliss-200 rounded-xl hover:border-bliss-500 hover:bg-bliss-100 transition-all text-left"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-bliss-600 flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-bliss-900">Mobile Banking</p>
                    <p className="text-sm text-bliss-500">{t('payment.mobileBankingDesc')}</p>
                  </div>
                </button>
              )}

              {enabledChannels.length === 0 && (
                <p className="text-center text-bliss-500 py-4 text-sm">{t('payment.loadingChannels')}</p>
              )}
            </div>
          </div>
        )}

        {/* ── PromptPay QR ──────────────────────────────────────────── */}
        {selectedChannel === 'promptpay' && !error && (
          <div className="bg-bliss-50 rounded-xl p-6 border border-bliss-200">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={resetChannel} className="p-1 text-bliss-500 hover:text-bliss-900 transition">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="font-semibold text-bliss-900 flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                {t('payment.payWithPromptpay')}
              </h3>
            </div>

            {isLoading && !promptpayQR ? (
              <div className="flex flex-col items-center py-10 gap-3 text-bliss-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <span>{t('payment.generatingQR')}</span>
              </div>
            ) : promptpayQR ? (
              <div className="text-center">
                <img src={promptpayQR} alt="PromptPay QR Code" className="w-64 h-64 mx-auto rounded-xl" />
                <p className="text-sm text-bliss-700 mt-3">{t('payment.scanQR')}</p>
                <div className="flex items-center justify-center gap-2 mt-2 text-bliss-500 text-sm">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-bliss-600" />
                  {t('payment.waitingPayment')}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ── Credit card form ───────────────────────────────────────── */}
        {selectedChannel === 'credit_card' && !error && (
          <div className="bg-bliss-50 rounded-xl p-6 border border-bliss-200">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={resetChannel} className="p-1 text-bliss-500 hover:text-bliss-900 transition">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="font-semibold text-bliss-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                {t('payment.payWithCard')}
              </h3>
            </div>

            <form onSubmit={handleCardSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-bliss-700 mb-1">{t('payment.cardName')}</label>
                <input
                  type="text" required placeholder={t('payment.cardNamePlaceholder')}
                  value={cardForm.name}
                  onChange={e => setCardForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-bliss-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-bliss-600 focus:border-bliss-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-bliss-700 mb-1">{t('payment.cardNumber')}</label>
                <input
                  type="text" required inputMode="numeric" placeholder="0000 0000 0000 0000"
                  value={cardForm.number}
                  onChange={e => setCardForm(f => ({ ...f, number: formatCardNumber(e.target.value) }))}
                  className="w-full px-3 py-2 border border-bliss-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-bliss-600 focus:border-bliss-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-bliss-700 mb-1">{t('payment.cardExpiry')}</label>
                  <input
                    type="text" required inputMode="numeric" placeholder="MM/YY"
                    value={cardForm.expiry}
                    onChange={e => setCardForm(f => ({ ...f, expiry: formatExpiry(e.target.value) }))}
                    className="w-full px-3 py-2 border border-bliss-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-bliss-600 focus:border-bliss-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-bliss-700 mb-1">CVV</label>
                  <input
                    type="text" required inputMode="numeric" placeholder="123" maxLength={4}
                    value={cardForm.cvv}
                    onChange={e => setCardForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    className="w-full px-3 py-2 border border-bliss-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-bliss-600 focus:border-bliss-600"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !omiseReady}
                className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                  isLoading || !omiseReady
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-bliss-600 hover:bg-bliss-600 text-white shadow-lg shadow-bliss-600/20'
                }`}
              >
                {isLoading ? t('payment.processing') : t('payment.pay', { amount: amount.toLocaleString() })}
              </button>
            </form>

            <div className="flex items-center justify-center gap-2 mt-4 text-bliss-500 text-xs">
              <Lock className="w-3 h-3" />
              {t('payment.securedBy')}
            </div>
          </div>
        )}

        {/* ── Internet / Mobile Banking bank grid ────────────────────── */}
        {isBanking && !error && (
          <div className="bg-bliss-50 rounded-xl p-6 border border-bliss-200">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={resetChannel} className="p-1 text-bliss-500 hover:text-bliss-900 transition">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="font-semibold text-bliss-900">
                {selectedChannel === 'internet_banking' ? 'Internet Banking' : 'Mobile Banking'}
              </h3>
            </div>
            <p className="text-sm text-bliss-500 mb-4 ml-8">{t('payment.selectBank')}</p>

            {isLoading ? (
              <div className="flex flex-col items-center py-8 gap-3 text-bliss-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bliss-600" />
                <span>{t('payment.connectingBank')}</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {BANKS.map(bank => (
                  <button
                    key={bank.code}
                    onClick={() => handleBanking(bank.code, selectedChannel === 'mobile_banking')}
                    disabled={isLoading}
                    className={`p-4 rounded-xl border-2 border-bliss-200 ${bank.hover} transition disabled:opacity-50`}
                  >
                    <div className="text-center">
                      <div className={`w-12 h-12 ${bank.color} rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-bold text-xs`}>
                        {bank.label}
                      </div>
                      <p className="text-xs font-medium text-bliss-900">{bank.label}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Security notice */}
        <div className="p-4 bg-bliss-100 border border-bliss-300 rounded-xl">
          <p className="text-sm text-bliss-700 text-center">
            {t('payment.securityNotice')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default ExtensionPayment
