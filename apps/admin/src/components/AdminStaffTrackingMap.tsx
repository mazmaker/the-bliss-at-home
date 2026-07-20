import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { RefreshCw, MapPin, Navigation } from 'lucide-react'

// PART47 P17 — admin-side live map of a staff member traveling to a booking.
// Ported from apps/customer/src/components/StaffTrackingMap.tsx with four deliberate changes:
//   (a) no @bliss/i18n — the admin app hardcodes Thai;
//   (b) uses the admin data client (../lib/supabase), NOT @bliss/supabase (a 2nd client would mean
//       a 2nd auth session / storageKey);
//   (c) the destination is a PROP (the real booking coords), not the hardcoded Bangkok point the
//       customer component ships (StaffTrackingMap.tsx:68-69 — a pre-existing bug we must not copy);
//   (d) the customer's test-id fallback query (3 hardcoded journeyIds + its dev-only debug panel)
//       is dropped.
// The journeyId is resolved by useBookingJourneys (which handles the staff_journeys.booking_id =
// JOB id trap); this component just renders ONE journey's live position + route.

interface JourneyInfo {
  id: string
  status: string
  started_at: string
  current_latitude?: number | null
  current_longitude?: number | null
  last_location_update?: string | null
}

interface AdminStaffTrackingMapProps {
  journeyId: string
  destinationLat?: number | null
  destinationLng?: number | null
  destinationName?: string
  staffName?: string
  height?: string
}

export default function AdminStaffTrackingMap({
  journeyId,
  destinationLat,
  destinationLng,
  destinationName,
  staffName,
  height = '320px',
}: AdminStaffTrackingMapProps) {
  const [journey, setJourney] = useState<JourneyInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [mapKey, setMapKey] = useState(0) // force iframe refresh
  const [useGoogleMaps, setUseGoogleMaps] = useState(true) // try Google Maps first, OSM on error

  const fetchJourneyData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const { data, error: journeyError } = await supabase
        .from('staff_journeys')
        .select('id, status, started_at, current_latitude, current_longitude, last_location_update')
        .eq('id', journeyId)
        .maybeSingle()

      if (journeyError) throw new Error(`ไม่สามารถโหลดข้อมูลการเดินทาง: ${journeyError.message}`)
      if (!data) throw new Error('ไม่พบข้อมูลการเดินทาง')

      setJourney({
        id: data.id,
        status: data.status,
        started_at: data.started_at,
        current_latitude: data.current_latitude,
        current_longitude: data.current_longitude,
        last_location_update: data.last_location_update,
      })
      if (data.last_location_update) {
        setLastUpdate(new Date(data.last_location_update).toLocaleString('th-TH'))
      }
      setMapKey((k) => k + 1)
    } catch (err: any) {
      console.error('[AdminStaffTrackingMap] error:', err)
      setError(err?.message || 'โหลดข้อมูลการเดินทางไม่สำเร็จ')
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load + refetch when the journey changes.
  useEffect(() => {
    fetchJourneyData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyId])

  // Realtime (bonus) — realtime may be disabled project-wide, so the 5-min poll below is primary.
  useEffect(() => {
    if (!journeyId) return
    const channel = supabase
      .channel(`admin-journey-${journeyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_journeys', filter: `id=eq.${journeyId}` },
        () => fetchJourneyData()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyId])

  // Auto-refresh every 5 minutes (primary mechanism; ประหยัดเครดิต).
  useEffect(() => {
    const interval = setInterval(fetchJourneyData, 5 * 60 * 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyId])

  const getMapEmbedUrl = () => {
    if (!journey) return null
    const { current_latitude, current_longitude } = journey
    const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

    if (useGoogleMaps && API_KEY && API_KEY !== 'your-google-maps-api-key') {
      if (current_latitude && current_longitude && destinationLat && destinationLng) {
        // Directions: route from the staff's live position -> the booking destination.
        return `https://www.google.com/maps/embed/v1/directions?key=${API_KEY}&origin=${current_latitude},${current_longitude}&destination=${destinationLat},${destinationLng}&mode=driving&language=th&zoom=14`
      } else if (current_latitude && current_longitude) {
        // Place: just the staff's live position (no known destination).
        return `https://www.google.com/maps/embed/v1/place?key=${API_KEY}&q=${current_latitude},${current_longitude}&zoom=16&language=th`
      }
      return `https://www.google.com/maps/embed/v1/place?key=${API_KEY}&q=13.7563,100.5018&zoom=12&language=th`
    }

    // Fallback: OpenStreetMap (only fires on an actual iframe network error — a Google Embed API
    // config error renders a gray 200 page and will NOT trigger onError; that is caught at verify
    // time via console + iframe-host checks, not here).
    if (current_latitude && current_longitude) {
      const bbox = `${current_longitude - 0.01},${current_latitude - 0.01},${current_longitude + 0.01},${current_latitude + 0.01}`
      return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${current_latitude},${current_longitude}`
    }
    return null
  }

  const handleMapError = () => {
    setUseGoogleMaps(false)
    setMapKey((k) => k + 1)
  }

  const STATUS_TEXT: Record<string, string> = {
    traveling: 'กำลังเดินทาง',
    arrived: 'ถึงแล้ว',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก',
  }
  const STATUS_COLOR: Record<string, string> = {
    traveling: 'text-bliss-600 bg-bliss-200 border-bliss-300',
    arrived: 'text-purple-600 bg-purple-100 border-purple-200',
    completed: 'text-green-600 bg-green-100 border-green-200',
    cancelled: 'text-red-600 bg-red-100 border-red-200',
  }

  if (isLoading && !journey) {
    return (
      <div className="bg-bliss-50 rounded-lg border border-bliss-200 p-6" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-bliss-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">กำลังโหลดแผนที่...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !journey) {
    return (
      <div className="bg-bliss-50 rounded-lg border border-bliss-200 p-6" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-red-600">
            <p className="mb-2 text-sm">ไม่สามารถโหลดแผนที่ได้</p>
            <p className="text-xs">{error}</p>
            <button
              onClick={fetchJourneyData}
              className="mt-3 bg-bliss-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-bliss-700 transition"
            >
              ลองใหม่
            </button>
          </div>
        </div>
      </div>
    )
  }

  const embedUrl = getMapEmbedUrl()

  return (
    <div className="bg-bliss-50 rounded-lg border border-bliss-200 overflow-hidden mt-2">
      {journey && (
        <div className="bg-bliss-600 text-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">ติดตามการเดินทาง</h4>
              {staffName && <p className="text-bliss-200 text-xs">{staffName}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                  STATUS_COLOR[journey.status] || 'text-gray-600 bg-gray-100 border-gray-200'
                }`}
              >
                {STATUS_TEXT[journey.status] || journey.status}
              </span>
              <button
                onClick={fetchJourneyData}
                disabled={isLoading}
                className="p-1 hover:bg-bliss-700 rounded transition"
                title="รีเฟรชแผนที่"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          {lastUpdate && <p className="text-bliss-200 text-[10px] mt-1">อัปเดตล่าสุด: {lastUpdate}</p>}
        </div>
      )}

      <div className="relative" style={{ height }}>
        {embedUrl ? (
          <iframe
            key={mapKey}
            src={embedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-full"
            onError={handleMapError}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center text-gray-500">
              <MapPin className="w-7 h-7 mx-auto mb-2" />
              <p className="text-sm">ยังไม่มีข้อมูลตำแหน่ง</p>
            </div>
          </div>
        )}

        {isLoading && journey && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 animate-spin text-bliss-600" />
          </div>
        )}
      </div>

      {journey && (
        <div className="p-3 bg-gray-50 border-t space-y-2">
          {journey.current_latitude && journey.current_longitude && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-700 font-medium text-xs">ตำแหน่งปัจจุบัน</span>
              </div>
              <p className="text-[11px] text-green-600 mt-1">
                พิกัด: {journey.current_latitude.toFixed(6)}, {journey.current_longitude.toFixed(6)}
              </p>
            </div>
          )}

          {destinationLat && destinationLng && (
            <div className="bg-bliss-100 border border-bliss-300 rounded-lg p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-bliss-600" />
                  <span className="text-bliss-600 font-medium text-xs">
                    ปลายทาง{destinationName ? `: ${destinationName}` : ''}
                  </span>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${destinationLat},${destinationLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-bliss-200 text-bliss-600 p-1.5 rounded hover:bg-bliss-300 transition"
                  title="นำทางด้วย Google Maps"
                >
                  <Navigation className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          <p className="text-[10px] text-gray-500 text-center">แผนที่อัปเดตอัตโนมัติทุก 5 นาที</p>
        </div>
      )}
    </div>
  )
}
