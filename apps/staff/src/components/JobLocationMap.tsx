import { useEffect, useState } from 'react'
import { MapPin, Navigation, Loader2, AlertTriangle } from 'lucide-react'

interface JobLocationMapProps {
  jobId: string
  destinationLat?: number
  destinationLng?: number
  destinationName?: string
  customerPhone?: string
  showMap?: boolean // เพิ่ม prop เพื่อควบคุมการแสดง map
  currentLat?: number
  currentLng?: number
}

export default function JobLocationMap({
  jobId,
  destinationLat,
  destinationLng,
  destinationName,
  customerPhone,
  showMap = false,
  currentLat,
  currentLng
}: JobLocationMapProps) {
  const [isMapLoading, setIsMapLoading] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  // Generate Google Maps URLs
  const destinationUrl = destinationLat && destinationLng
    ? `https://www.google.com/maps/search/?api=1&query=${destinationLat},${destinationLng}`
    : destinationName
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinationName)}`
    : null

  const navigationUrl = destinationLat && destinationLng
    ? `https://www.google.com/maps/dir/?api=1&destination=${destinationLat},${destinationLng}`
    : destinationName
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationName)}`
    : null

  const currentLocationUrl = currentLat && currentLng
    ? `https://www.google.com/maps/search/?api=1&query=${currentLat},${currentLng}`
    : null

  if (!showMap) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-amber-800">ตำแหน่งปลายทาง</p>
            <p className="text-sm text-amber-600 mt-1">{destinationName}</p>
          </div>
          <div className="flex gap-2">
            {customerPhone && (
              <a
                href={`tel:${customerPhone}`}
                className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                title="โทรหาลูกค้า"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                </svg>
              </a>
            )}
            {navigationUrl && (
              <a
                href={navigationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                title="นำทางด้วย Google Maps"
              >
                <Navigation className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow border border-stone-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <h3 className="font-semibold flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          แผนที่และการนำทาง
        </h3>
        <p className="text-blue-100 text-sm mt-1">ตำแหน่งปัจจุบันและปลายทาง</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Current Location */}
        {currentLat && currentLng && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-700 font-medium text-sm">ตำแหน่งปัจจุบัน</span>
            </div>
            <p className="text-xs text-green-600 mb-2">
              พิกัด: {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
            </p>
            <div className="flex gap-2">
              {currentLocationUrl && (
                <a
                  href={currentLocationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 transition"
                >
                  ดูบน Google Maps
                </a>
              )}
            </div>
          </div>
        )}

        {/* Destination */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-amber-700" />
            <span className="text-amber-700 font-medium text-sm">ปลายทาง</span>
          </div>
          <p className="text-sm text-amber-600 mb-3">{destinationName}</p>
          {destinationLat && destinationLng && (
            <p className="text-xs text-amber-500 mb-2">
              พิกัด: {destinationLat.toFixed(6)}, {destinationLng.toFixed(6)}
            </p>
          )}

          <div className="flex gap-2">
            {destinationUrl && (
              <a
                href={destinationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded hover:bg-amber-200 transition flex items-center gap-1"
              >
                <MapPin className="w-3 h-3" />
                ดูตำแหน่ง
              </a>
            )}
            {navigationUrl && (
              <a
                href={navigationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition flex items-center gap-1"
              >
                <Navigation className="w-3 h-3" />
                นำทาง
              </a>
            )}
            {customerPhone && (
              <a
                href={`tel:${customerPhone}`}
                className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 transition flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                </svg>
                โทร
              </a>
            )}
          </div>
        </div>

        {/* Distance & ETA (placeholder for future enhancement) */}
        {currentLat && currentLng && destinationLat && destinationLng && (
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
            <p className="text-xs text-stone-500 mb-1">ข้อมูลเพิ่มเติม</p>
            <p className="text-sm text-stone-700">
              💡 เพื่อประสบการณ์ที่ดีที่สุด ควรใช้แอป Google Maps สำหรับการนำทาง
            </p>
          </div>
        )}
      </div>
    </div>
  )
}