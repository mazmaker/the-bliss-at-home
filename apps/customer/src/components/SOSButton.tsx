import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ShieldAlert, X, MapPin, Phone, AlertTriangle } from 'lucide-react'
import { useCreateSOSAlert } from '@bliss/supabase/hooks/useSOSAlerts'
import { useCurrentCustomer } from '@bliss/supabase/hooks/useCustomer'
import { useTranslation } from '@bliss/i18n'

interface SOSButtonProps {
  className?: string
}

function SOSButton({ className = '' }: SOSButtonProps) {
  const { t } = useTranslation('common')
  const [showConfirm, setShowConfirm] = useState(false)
  const [sent, setSent] = useState(false)

  const { data: customer } = useCurrentCustomer()
  const createSOSAlert = useCreateSOSAlert()

  const handleSendSOS = async () => {
    if (!customer) {
      console.error('No customer found')
      return
    }

    try {
      // Get current location
      let location: { lat: number | null; lng: number | null; accuracy: number | null } = {
        lat: null,
        lng: null,
        accuracy: null,
      }

      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
              }
              resolve(null)
            },
            () => {
              // Location denied or error, continue without it
              resolve(null)
            }
          )
        })
      }

      // Create SOS alert in database
      await createSOSAlert.mutateAsync({
        customer_id: customer.id,
        latitude: location.lat || undefined,
        longitude: location.lng || undefined,
        location_accuracy: location.accuracy || undefined,
        user_agent: navigator.userAgent,
        priority: 'high',
        message: 'Emergency alert from customer',
      })

      setSent(true)
      setTimeout(() => {
        setShowConfirm(false)
        setSent(false)
      }, 3000)
    } catch (error) {
      console.error('Failed to send SOS:', error)
      alert(t('sos.failedAlert'))
    }
  }

  return (
    <>
      {/* SOS Button */}
      <button
        onClick={() => setShowConfirm(true)}
        className={`flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition shadow-md hover:shadow-lg ${className}`}
        title="Emergency Alert"
      >
        <ShieldAlert className="w-4 h-4" />
        <span>{t('sos.button')}</span>
      </button>

      {/* Confirmation Modal */}
      {showConfirm && createPortal(
        <div className="fixed inset-0 bg-black/60 z-[9999] overflow-y-auto animate-in fade-in duration-200">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            {!sent ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-stone-900">{t('sos.title')}</h3>
                      <p className="text-xs text-stone-500">{t('sos.subtitle')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={createSOSAlert.isPending}
                    className="p-1 hover:bg-stone-100 rounded-lg transition disabled:opacity-50"
                  >
                    <X className="w-5 h-5 text-stone-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="mb-6 space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm text-red-800 font-medium mb-2">
                      {t('sos.alertSentTo')}
                    </p>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {t('sos.adminTeam')}
                      </li>
                      <li className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {t('sos.withLocation')}
                      </li>
                    </ul>
                  </div>

                  <p className="text-sm text-stone-600">
                    {t('sos.confirmMessage')}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={createSOSAlert.isPending}
                    className="flex-1 px-4 py-3 border border-stone-300 rounded-xl text-stone-700 font-medium hover:bg-stone-50 transition disabled:opacity-50"
                  >
                    {t('buttons.cancel')}
                  </button>
                  <button
                    onClick={handleSendSOS}
                    disabled={createSOSAlert.isPending}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {createSOSAlert.isPending ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>{t('sos.sending')}</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-4 h-4" />
                        <span>{t('sos.confirmSend')}</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* Success State */
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-2">{t('sos.success')}</h3>
                <p className="text-stone-600 whitespace-pre-line">
                  {t('sos.successMessage')}
                </p>
              </div>
            )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default SOSButton
