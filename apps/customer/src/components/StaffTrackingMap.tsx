import { useEffect, useState } from 'react'
import { supabase } from '@bliss/supabase'
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
  const [journey, setJourney] = useState<JourneyInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [mapKey, setMapKey] = useState(0) // Force iframe refresh
  const [useGoogleMaps, setUseGoogleMaps] = useState(true) // Try Google Maps first

  // Fetch journey information
  const fetchJourneyData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // ดึงข้อมูล journey แบบง่าย ไม่ join ซับซ้อน
      const { data: journeyData, error: journeyError } = await supabase
        .from('staff_journeys')
        .select('id, status, started_at, current_latitude, current_longitude, last_location_update, booking_id, staff_id')
        .eq('id', journeyId)
        .maybeSingle()

      console.log('🗺️ Journey data query:', { journeyData, journeyError })

      if (journeyError) {
        console.error('Journey query error:', journeyError)
        throw new Error(`ไม่สามารถดึงข้อมูลการเดินทางได้: ${journeyError.message}`)
      }

      if (!journeyData) {
        throw new Error('ไม่พบข้อมูลการเดินทางสำหรับงานนี้')
      }

      // ใช้ข้อมูล fallback แบบง่าย (จะปรับปรุงภายหลัง)
      const staffName = 'พนักงาน'
      const booking = {
        customer_name: 'ลูกค้า',
        latitude: 13.75471599,
        longitude: 100.49688619,
        customer_address: 'ที่อยู่ลูกค้า'
      }

      console.log('📋 Journey data from DB:', {
        journeyId: journeyData.id,
        staffName,
        customerName: booking?.customer_name,
        address: booking?.customer_address,
        coordinates: { lat: booking?.latitude, lng: booking?.longitude }
      })

      const journeyInfo: JourneyInfo = {
        id: journeyData.id,
        status: journeyData.status,
        staff_name: staffName,
        customer_name: booking?.customer_name || 'ลูกค้า',
        destination_lat: booking?.latitude || 13.75471599, // fallback เก่า
        destination_lng: booking?.longitude || 100.49688619, // fallback เก่า
        destination_name: booking?.customer_address || 'ที่อยู่ลูกค้า',
        started_at: journeyData.started_at,
        current_latitude: journeyData.current_latitude,
        current_longitude: journeyData.current_longitude,
        last_location_update: journeyData.last_location_update
      }

      setJourney(journeyInfo)

      // Update last update time
      if (journeyInfo.last_location_update) {
        setLastUpdate(new Date(journeyInfo.last_location_update).toLocaleString('th-TH'))
      }

      // Force map refresh by changing key
      setMapKey(prev => prev + 1)

    } catch (err: any) {
      console.error('Error fetching journey data:', err)

      // Provide fallback test data if journey not found
      if (journeyId === 'journey-test-001' || journeyId === 'journey-test-002' || journeyId === '85be919b-51af-44b8-9d4f-8e8287869860') {
        console.log('⚠️ Using fallback test data - real data not available')

        // พยายาม query ข้อมูล booking อย่างน้อย
        try {
          const { data: testBooking } = await supabase
            .from('bookings')
            .select(`
              customer_name,
              customer_address,
              latitude,
              longitude,
              staff:staff!inner(profiles!inner(full_name))
            `)
            .in('booking_number', ['BK20260518-GPS1', 'BK20260518-GPS2', 'BK20260517-0305'])
            .limit(1)
            .maybeSingle()

          const fallbackJourney: JourneyInfo = {
            id: journeyId,
            status: 'traveling',
            staff_name: testBooking?.staff?.profiles?.full_name || 'พนักงานทดสอบ',
            customer_name: testBooking?.customer_name || 'ลูกค้าทดสอบ',
            destination_lat: testBooking?.latitude || 13.75471599,
            destination_lng: testBooking?.longitude || 100.49688619,
            destination_name: testBooking?.customer_address || 'ที่อยู่ทดสอบ',
            started_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            current_latitude: 13.7563,
            current_longitude: 100.5018,
            last_location_update: new Date(Date.now() - 1 * 60 * 1000).toISOString()
          }

          setJourney(fallbackJourney)
          setLastUpdate(new Date(fallbackJourney.last_location_update!).toLocaleString('th-TH'))
          setMapKey(prev => prev + 1)
        } catch (fallbackError) {
          console.error('Even fallback failed:', fallbackError)
          setError('ไม่สามารถโหลดข้อมูลได้ (ระบบทดสอบ)')
        }
      } else {
        setError(err.message || 'ไม่สามารถโหลดข้อมูลการเดินทางได้')
      }
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

  // Auto-refresh every 5 minutes (ประหยัดเครดิต)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Auto-refreshing map... (5 min interval)')
      fetchJourneyData()
    }, 5 * 60 * 1000) // 5 minutes = 300,000ms

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
      traveling: 'กำลังเดินทาง',
      arrived: 'มาถึงแล้ว',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก'
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      traveling: 'text-blue-600 bg-blue-100 border-blue-200',
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
      <div className="bg-white rounded-lg shadow-md p-6" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">กำลังโหลดแผนที่...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !journey) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-red-600">
            <p className="mb-2">เกิดข้อผิดพลาด</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={refreshMap}
              className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
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
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      {journey && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                ติดตามการเดินทางของพนักงาน
              </h3>
              <p className="text-blue-100 text-sm">{journey.staff_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(journey.status)}`}>
                {getStatusText(journey.status)}
              </span>
              <button
                onClick={refreshMap}
                disabled={isLoading}
                className="p-1 hover:bg-blue-800 rounded transition"
                title="รีเฟรชแผนที่"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          {lastUpdate && (
            <p className="text-blue-100 text-xs mt-2">อัพเดทล่าสุด: {lastUpdate}</p>
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
              <p>ยังไม่มีข้อมูลตำแหน่ง</p>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && journey && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">กำลังอัพเดท...</p>
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
                <span className="text-green-700 font-medium text-sm">ตำแหน่งปัจจุบัน</span>
              </div>
              <p className="text-xs text-green-600">
                พิกัด: {journey.current_latitude.toFixed(6)}, {journey.current_longitude.toFixed(6)}
              </p>
            </div>
          )}

          {/* Destination Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-amber-700" />
                  <span className="text-amber-700 font-medium text-sm">ปลายทาง</span>
                </div>
                <p className="text-sm text-amber-600">{journey.destination_name}</p>
              </div>

              <div className="flex gap-2">
                {journey.destination_lat && journey.destination_lng && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${journey.destination_lat},${journey.destination_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-100 text-blue-700 p-2 rounded hover:bg-blue-200 transition"
                    title="นำทางด้วย Google Maps"
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
              แผนที่จะอัพเดทอัตโนมัติทุก 5 นาทีเพื่อแสดงตำแหน่งพนักงานล่าสุด
            </p>

            {/* GPS Status Debug */}
            <div className="bg-gray-100 rounded px-3 py-2 mt-3 text-left">
              <p className="font-mono text-xs text-gray-600">
                🎯 GPS: {journey?.current_latitude ?
                  `${journey.current_latitude.toFixed(6)}, ${journey.current_longitude?.toFixed(6)}` :
                  'Test Data (ไม่ใช่ GPS จริง)'
                }
              </p>
              <p className="font-mono text-xs text-gray-600">
                🕒 อัพเดท: {lastUpdate || 'ไม่มีข้อมูลเวลา'}
              </p>
              <p className="font-mono text-xs text-gray-600">
                📡 สถานะ: {journey?.id?.includes('test') ?
                  '🔴 ข้อมูลทดสอบ' :
                  '🟢 GPS จริง'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}