import { useEffect, useState, useRef } from 'react'
import { supabase } from '@bliss/supabase'
import { useTranslation } from '@bliss/i18n'
import { RefreshCw, MapPin, Phone, Navigation } from 'lucide-react'

// สำหรับ GPS tracking ใช้ regular client แล้วแก้ RLS policies แทน
// เพื่อหลีกเลี่ยง multiple client instances

interface JourneyInfo {
  id: string
  status: string
  staff_name?: string
  customer_name?: string
  destination_lat?: number
  destination_lng?: number
  destination_name?: string
  started_at: string
  current_latitude?: number
  current_longitude?: number
  last_location_update?: string
}

interface StaffTrackingMapProps {
  journeyId: string
  height?: string
}

export default function StaffTrackingMap({
  journeyId,
  height = "400px"
}: StaffTrackingMapProps) {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language === 'cn' ? 'zh-CN' : i18n.language === 'en' ? 'en-US' : i18n.language === 'kr' ? 'ko-KR' : i18n.language === 'jp' ? 'ja-JP' : 'th-TH'
  const [journey, setJourney] = useState<JourneyInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [mapKey, setMapKey] = useState(0) // Force iframe refresh
  const [useGoogleMaps, setUseGoogleMaps] = useState(true) // Try Google Maps first

  const lastCoordsRef = useRef<string>('')

  // Fetch journey information via the public RPC (works for the anonymous /track share link;
  // the owner-scoped RLS policies deny direct anon reads of staff_journeys).
  const fetchJourneyData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error: rpcError } = await (supabase.rpc as any)('get_journey_tracking', { p_journey_id: journeyId }).maybeSingle()

      if (rpcError) {
        throw new Error(t('common:errors.failedToLoadJourneyDetail', { error: rpcError.message }))
      }
      if (!data) {
        throw new Error(t('common:errors.journeyNotFound'))
      }

      const toNum = (v: any) => (v === null || v === undefined ? undefined : Number(v))
      const journeyInfo: JourneyInfo = {
        id: data.id,
        status: data.status,
        staff_name: data.staff_name || t('common:fallback.staff'),
        customer_name: data.customer_name || t('common:fallback.customer'),
        destination_lat: toNum(data.destination_lat),
        destination_lng: toNum(data.destination_lng),
        destination_name: data.destination_name || t('common:fallback.customerAddress'),
        started_at: data.started_at,
        current_latitude: toNum(data.current_latitude),
        current_longitude: toNum(data.current_longitude),
        last_location_update: data.last_location_update
      }

      setJourney(journeyInfo)

      if (journeyInfo.last_location_update) {
        setLastUpdate(new Date(journeyInfo.last_location_update).toLocaleString(dateLocale))
      }

      // Only reload the map iframe when the position actually changed (saves Maps credits + avoids flicker)
      const coordsKey = `${journeyInfo.current_latitude ?? ''},${journeyInfo.current_longitude ?? ''}`
      if (coordsKey !== lastCoordsRef.current) {
        lastCoordsRef.current = coordsKey
        setMapKey(prev => prev + 1)
      }
    } catch (err: any) {
      console.error('Error fetching journey data:', err)
      setError(err.message || t('common:errors.failedToLoadJourney'))
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchJourneyData()
  }, [journeyId])

  // Subscribe to real-time updates (simplified)
  useEffect(() => {
    if (!journeyId) return

    // ใช้ regular supabase client สำหรับ subscription
    const channel = supabase
      .channel(`journey-tracking-${journeyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'staff_journeys',
        filter: `id=eq.${journeyId}`
      }, (payload) => {
        console.log('Journey updated:', payload)
        fetchJourneyData()
      })
      .subscribe((status) => {
        console.log('Subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [journeyId])

  // Auto-refresh the staff position every 20s (an anonymous /track visitor can't receive Realtime,
  // so poll the RPC). The map iframe only actually reloads when the coordinates change (see fetchJourneyData).
  useEffect(() => {
    const interval = setInterval(() => {
      fetchJourneyData()
    }, 20 * 1000)

    return () => clearInterval(interval)
  }, [journeyId])

  // Google Maps Embed API with OpenStreetMap fallback
  const getMapEmbedUrl = () => {
    if (!journey) return null

    const { current_latitude, current_longitude, destination_lat, destination_lng } = journey
    const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

    // ลองใช้ Google Maps ก่อน (ถ้ายังไม่ fail และมี API key)
    if (useGoogleMaps && API_KEY && API_KEY !== 'your-google-maps-api-key') {
      if (current_latitude && current_longitude && destination_lat && destination_lng) {
        // Directions API: แสดงเส้นทางจากพนักงาน → ลูกค้า
        return `https://www.google.com/maps/embed/v1/directions?key=${API_KEY}&origin=${current_latitude},${current_longitude}&destination=${destination_lat},${destination_lng}&mode=driving&language=th&zoom=14`
      } else if (current_latitude && current_longitude) {
        // Place API: แสดงตำแหน่งพนักงาน
        return `https://www.google.com/maps/embed/v1/place?key=${API_KEY}&q=${current_latitude},${current_longitude}&zoom=16&language=th`
      } else {
        // Default Google Maps Bangkok
        return `https://www.google.com/maps/embed/v1/place?key=${API_KEY}&q=13.7563,100.5018&zoom=12&language=th`
      }
    }

    // Fallback: OpenStreetMap
    if (current_latitude && current_longitude) {
      const bbox = `${current_longitude-0.01},${current_latitude-0.01},${current_longitude+0.01},${current_latitude+0.01}`
      return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${current_latitude},${current_longitude}`
    }

    // Ultimate fallback: OpenStreetMap Bangkok
    return `https://www.openstreetmap.org/export/embed.html?bbox=100.4,13.6,100.7,13.9&layer=mapnik&marker=13.7563,100.5018`
  }

  // Handle iframe load error (switch to OpenStreetMap)
  const handleMapError = () => {
    console.log('🗺️ Google Maps failed, switching to OpenStreetMap')
    setUseGoogleMaps(false)
    setMapKey(prev => prev + 1) // Force re-render with new URL
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

  const refreshMap = () => {
    fetchJourneyData()
  }

  if (isLoading && !journey) {
    return (
      <div className="bg-bliss-50 rounded-lg shadow-md p-6" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bliss-600 mx-auto mb-2"></div>
            <p className="text-gray-600">{t('common:trackingMap.loadingMap')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !journey) {
    return (
      <div className="bg-bliss-50 rounded-lg shadow-md p-6" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-red-600">
            <p className="mb-2">{t('common:trackingMap.errorTitle')}</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={refreshMap}
              className="mt-3 bg-bliss-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-bliss-600 transition"
            >
              {t('common:buttons.retry')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const embedUrl = getMapEmbedUrl()

  return (
    <div className="bg-bliss-50 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      {journey && (
        <div className="bg-bliss-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                {t('common:trackingMap.title')}
              </h3>
              <p className="text-bliss-200 text-sm">{journey.staff_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(journey.status)}`}>
                {getStatusText(journey.status)}
              </span>
              <button
                onClick={refreshMap}
                disabled={isLoading}
                className="p-1 hover:bg-bliss-700 rounded transition"
                title={t('common:trackingMap.refreshMap')}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          {lastUpdate && (
            <p className="text-bliss-200 text-xs mt-2">{t('common:trackingMap.lastUpdated')} {lastUpdate}</p>
          )}
        </div>
      )}

      {/* Google Maps Embed */}
      <div className="relative" style={{ height }}>
        {embedUrl ? (
          <iframe
            key={mapKey} // Force refresh when key changes
            src={embedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-full"
            onError={handleMapError}
            onLoad={() => {
              // แสดงว่าใช้ Google Maps หรือ OpenStreetMap
              console.log(`🗺️ Map loaded: ${useGoogleMaps ? 'Google Maps' : 'OpenStreetMap'}`)
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center text-gray-500">
              <MapPin className="w-8 h-8 mx-auto mb-2" />
              <p>{t('common:trackingMap.noLocationData')}</p>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && journey && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-bliss-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">{t('common:trackingMap.updating')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Info Panel */}
      {journey && (
        <div className="p-3 bg-gray-50 border-t space-y-3">
          {/* Current Location Info */}
          {journey.current_latitude && journey.current_longitude && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-700 font-medium text-sm">{t('common:trackingMap.currentLocation')}</span>
              </div>
              <p className="text-xs text-green-600">
                {t('common:trackingMap.coordinates')} {journey.current_latitude.toFixed(6)}, {journey.current_longitude.toFixed(6)}
              </p>
            </div>
          )}

          {/* Destination Info */}
          <div className="bg-bliss-100 border border-bliss-300 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-bliss-600" />
                  <span className="text-bliss-600 font-medium text-sm">{t('common:labels.destination')}</span>
                </div>
                <p className="text-sm text-bliss-600">{journey.destination_name}</p>
              </div>

              <div className="flex gap-2">
                {journey.destination_lat && journey.destination_lng && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${journey.destination_lat},${journey.destination_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-bliss-200 text-bliss-600 p-2 rounded hover:bg-bliss-300 transition"
                    title={t('common:trackingMap.navigateGoogleMaps')}
                  >
                    <Navigation className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Map provider และ Auto-refresh notice */}
          <div className="text-center space-y-1">
            <p className="text-xs text-gray-500">
              {t('common:trackingMap.autoRefreshNotice')}
            </p>

            {/* GPS Status Debug */}
            <div className="bg-gray-100 rounded px-3 py-2 mt-3 text-left">
              <p className="font-mono text-xs text-gray-600">
                🎯 GPS: {journey?.current_latitude ?
                  `${journey.current_latitude.toFixed(6)}, ${journey.current_longitude?.toFixed(6)}` :
                  t('common:trackingMap.testDataLabel')
                }
              </p>
              <p className="font-mono text-xs text-gray-600">
                {t('common:trackingMap.debugUpdateLabel')} {lastUpdate || t('common:trackingMap.noTimeData')}
              </p>
              <p className="font-mono text-xs text-gray-600">
                {t('common:trackingMap.debugStatusLabel')} {journey?.id?.includes('test') ?
                  t('common:trackingMap.testData') :
                  t('common:trackingMap.realGps')
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}