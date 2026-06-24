/**
 * ManualPaymentInstructions — shown in the booking wizard Step 6 (and the extension
 * payment screen) when the admin has set payment_mode='manual_qr'.
 *
 * The customer transfers via a static QR and sends the slip over the LINE OA; the
 * booking/extension stays payment_status='pending' until an admin verifies the slip
 * and marks it paid. This component does NOT touch Omise (no Omise.js, no create-charge,
 * no status poll) — it is a pure display surface. Reusable for both a new booking and
 * an extension (pass bookingNumber + amount).
 */
import { useState } from 'react'
import { Copy, Check, MessageCircle, Clock } from 'lucide-react'
import { useTranslation } from '@bliss/i18n'
import { LINE_CONTACT_URL } from '../config/contact'

export interface ManualQrConfig {
  image_url: string
  line_oa_qr_url: string
  line_oa_id: string
}

interface ManualPaymentInstructionsProps {
  bookingNumber: string | null
  amount: number
  config: ManualQrConfig | null
}

export default function ManualPaymentInstructions({
  bookingNumber,
  amount,
  config,
}: ManualPaymentInstructionsProps) {
  const { t } = useTranslation('booking')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!bookingNumber) return
    try {
      await navigator.clipboard.writeText(bookingNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard may be unavailable (insecure context) — non-fatal
    }
  }

  const lineUrl = config?.line_oa_id
    ? `https://line.me/R/ti/p/${encodeURIComponent(config.line_oa_id)}`
    : LINE_CONTACT_URL

  // No payment QR configured → don't render an empty box; tell the customer to use LINE.
  const hasPaymentQr = !!config?.image_url

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-bliss-900">{t('wizard.payment.manualQr.title')}</h3>
        <p className="text-sm text-bliss-600 mt-1">{t('wizard.payment.manualQr.instruction')}</p>
      </div>

      {/* Booking number + copy */}
      <div className="bg-bliss-50 border border-bliss-200 rounded-xl p-4">
        <p className="text-xs text-bliss-500 mb-1">{t('wizard.payment.manualQr.bookingNumberLabel')}</p>
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono font-semibold text-bliss-900 text-lg break-all">
            {bookingNumber || '—'}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!bookingNumber}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-bliss-600 text-white rounded-lg text-sm font-medium hover:bg-bliss-700 transition disabled:opacity-50 shrink-0"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? t('wizard.payment.manualQr.copied') : t('wizard.payment.manualQr.copyButton')}
          </button>
        </div>
      </div>

      {/* Amount */}
      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-4">
        <span className="text-sm text-bliss-700">{t('wizard.payment.manualQr.amountLabel')}</span>
        <span className="text-2xl font-bold text-amber-700">฿{amount.toLocaleString()}</span>
      </div>

      {/* Payment-receiving QR */}
      {hasPaymentQr ? (
        <div className="border border-bliss-200 rounded-xl p-4 text-center">
          <p className="text-sm font-medium text-bliss-700 mb-3">{t('wizard.payment.manualQr.qrImageLabel')}</p>
          {/* Payment QR — comfortably scannable size (~24rem/384px), responsive: w-full caps to the
              card width on narrow screens, max-w-[24rem] keeps it from getting oversized on desktop. */}
          <img
            src={config!.image_url}
            alt={t('wizard.payment.manualQr.qrImageLabel')}
            className="mx-auto w-full max-w-[24rem] h-auto object-contain rounded-lg border border-bliss-100"
          />
        </div>
      ) : (
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 text-center text-sm text-amber-700">
          {t('wizard.payment.manualQr.noQrConfigured')}
        </div>
      )}

      {/* Send slip via LINE OA */}
      <div className="border border-bliss-200 rounded-xl p-4">
        <p className="text-sm font-medium text-bliss-700 mb-2 flex items-center gap-1.5">
          <MessageCircle className="w-4 h-4 text-green-600" />
          {t('wizard.payment.manualQr.lineOALabel')}
        </p>
        {config?.line_oa_qr_url && (
          <img
            src={config.line_oa_qr_url}
            alt={t('wizard.payment.manualQr.lineOALabel')}
            className="mx-auto w-40 h-40 object-contain rounded-lg border border-bliss-100 mb-3"
          />
        )}
        {config?.line_oa_id && (
          <p className="text-center text-sm text-bliss-700 mb-3">
            {t('wizard.payment.manualQr.lineIdLabel')}: <span className="font-semibold">{config.line_oa_id}</span>
          </p>
        )}
        <a
          href={lineUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
        >
          {t('wizard.payment.manualQr.lineOpenButton')}
        </a>
      </div>

      {/* Send-slip + pending notes */}
      <div className="space-y-2">
        <p className="text-sm text-bliss-700">{t('wizard.payment.manualQr.sendSlipNote')}</p>
        <p className="flex items-start gap-1.5 text-xs text-bliss-500">
          <Clock className="w-4 h-4 shrink-0 mt-0.5" />
          {t('wizard.payment.manualQr.pendingVerification')}
        </p>
      </div>
    </div>
  )
}
