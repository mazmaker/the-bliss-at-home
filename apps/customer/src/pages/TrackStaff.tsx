import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '@bliss/supabase'
import { useTranslation } from '@bliss/i18n'
import { ArrowLeft, Share2, Phone } from 'lucide-react'
import StaffTrackingMap from '../components/StaffTrackingMap'

interface JourneyDetails {
  id: string
  status: string
  started_at: string
  staff_name: string
  customer_name: string
  customer_phone?: string
  destination_name: string
  service_name: string
  estimated_duration?: number
}

export default function TrackStaff() {
  const { t } = useTranslation()
  const { journeyId } = useParams<{ journeyId: string }>()
  const navigate = useNavigate()
  const [journey, setJourney] = useState<JourneyDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!journeyId) {
      setError(t('common:errors.journeyNotFound'))
      setIsLoading(false)
      return
    }

    fetchJourneyDetails()
  }, [journeyId])

  const fetchJourneyDetails = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Public share link: read via the SECURITY DEFINER RPC (works when logged out;
      // the owner-scoped RLS policies deny direct anon reads of staff_journeys).
      const { data, error: rpcError } = await (supabase.rpc as any)('get_journey_tracking', { p_journey_id: journeyId }).maybeSingle()

      if (rpcError) throw rpcError
      if (!data) throw new Error(t('common:errors.journeyNotFound'))

      setJourney({
        id: data.id,
        status: data.status,
        started_at: data.started_at,
        staff_name: data.staff_name || t('common:fallback.nameNotSpecified'),
        customer_name: data.customer_name || t('common:fallback.customerNameNotSpecified'),
        customer_phone: data.customer_phone,
        destination_name: data.destination_name || t('common:fallback.addressNotSpecified'),
        service_name: data.service_name || t('common:fallback.serviceNotSpecified'),
        estimated_duration: data.duration_minutes
      })

    } catch (err: any) {
      console.error('Error fetching journey details:', err)
      setError(err.message || t('common:errors.failedToLoadJourney'))
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      traveling: t('common:journeyStatus.traveling'),
      arrived: t('common:journeyStatus.arrived'),
      completed: t('common:status.completed'),
      cancelled: t('common:status.cancelled')
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      traveling: 'text-bliss-600 bg-bliss-200 border-bliss-300',
      arrived: 'text-purple-600 bg-purple-100 border-purple-200',
      completed: 'text-green-600 bg-green-100 border-green-200',
      cancelled: 'text-red-600 bg-red-100 border-red-200'
    }
    return colorMap[status] || 'text-gray-600 bg-gray-100 border-gray-200'
  }

  const getStatusEmoji = (status: string) => {
    const emojiMap: Record<string, string> = {
      traveling: '🚗',
      arrived: '📍',
      completed: '✅',
      cancelled: '❌'
    }
    return emojiMap[status] || '📍'
  }

  const shareLink = async () => {
    if (!navigator.share) {
      // Fallback to copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert(t('common:messages.linkCopied'))
      } catch {
        alert(t('common:errors.failedToCopyLink'))
      }
      return
    }

    try {
      await navigator.share({
        title: t('common:share.journeyTrackingTitle'),
        text: journey ? t('common:share.journeyTrackingText', { staffName: journey.staff_name, serviceName: journey.service_name }) : t('common:share.journeyTrackingDefault'),
        url: window.location.href
      })
    } catch {
      // User cancelled sharing
    }
  }

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bliss-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common:loading.journey')}</p>
        </div>
      </div>
    )
  }

  if (error || !journey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-bliss-50 rounded-lg shadow-md p-6 text-center">
            <div className="text-6xl mb-4">😔</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">{t('common:errors.dataNotFound')}</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={goBack}
              className="inline-flex items-center gap-2 bg-bliss-600 text-white px-4 py-2 rounded-lg hover:bg-bliss-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('common:buttons.back')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-bliss-50 shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-900">{t('common:tracking.pageTitle')}</h1>
              <p className="text-sm text-gray-600">The Bliss at Home</p>
            </div>
            <button
              onClick={shareLink}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              title={t('common:buttons.shareLink')}
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Journey Info Card */}
        <div className="bg-bliss-50 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{journey.service_name}</h2>
              <p className="text-gray-600 text-sm">{t('common:labels.customer')}{journey.customer_name}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(journey.status)}`}>
              {getStatusEmoji(journey.status)} {getStatusText(journey.status)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">{t('common:labels.serviceStaff')}</p>
              <p className="font-medium">{journey.staff_name}</p>
            </div>
            <div>
              <p className="text-gray-500">{t('common:labels.destination')}</p>
              <p className="font-medium">{journey.destination_name}</p>
            </div>
            <div>
              <p className="text-gray-500">{t('common:labels.startTime')}</p>
              <p className="font-medium">{new Date(journey.started_at).toLocaleString('th-TH')}</p>
            </div>
            {journey.estimated_duration && (
              <div>
                <p className="text-gray-500">{t('common:labels.serviceDuration')}</p>
                <p className="font-medium">{journey.estimated_duration}{t('common:unit.minutes')}</p>
              </div>
            )}
          </div>

          {journey.customer_phone && (
            <div className="mt-4 pt-4 border-t">
              <a
                href={`tel:${journey.customer_phone}`}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
              >
                <Phone className="w-4 h-4" />
                {t('common:buttons.callStaff')}{journey.customer_phone}
              </a>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {journey.status === 'traveling' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚗</span>
              <div>
                <p className="font-medium text-blue-800">{t('common:tracking.statusTraveling')}</p>
                <p className="text-blue-600 text-sm">{t('common:tracking.mapAutoUpdate')}</p>
              </div>
            </div>
          </div>
        )}

        {journey.status === 'arrived' && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📍</span>
              <div>
                <p className="font-medium text-purple-800">{t('common:tracking.statusArrived')}</p>
                <p className="text-purple-600 text-sm">{t('common:tracking.prepareForService')}</p>
              </div>
            </div>
          </div>
        )}

        {journey.status === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-medium text-green-800">{t('common:tracking.statusCompleted')}</p>
                <p className="text-green-600 text-sm">{t('common:tracking.thankYouMessage')}</p>
              </div>
            </div>
          </div>
        )}

        {journey.status === 'cancelled' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">❌</span>
              <div>
                <p className="font-medium text-red-800">{t('common:tracking.statusCancelled')}</p>
                <p className="text-red-600 text-sm">{t('common:tracking.contactSupport')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Map Component */}
        <StaffTrackingMap journeyId={journeyId!} height="500px" />

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm py-4">
          <p>{t('common:footer.copyright')}</p>
        </div>
      </div>
    </div>
  )
}