import { useEffect, useRef, useState } from 'react'
import { MapPin, Loader2, AlertCircle, ExternalLink } from 'lucide-react'

interface HotelMapDisplayProps {
  latitude?: number | null
  longitude?: number | null
  hotelName?: string
  hotelAddress?: string
  className?: string
  height?: string
}

declare global {
  interface Window {
    google: any
    initMap: () => void
  }
}

export function HotelMapDisplay({
  latitude,
  longitude,
  hotelName = 'โรงแรม',
  hotelAddress = '',
  className = '',
  height = '300px'
}: HotelMapDisplayProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Show placeholder if no coordinates
  if (!latitude || !longitude) {
    return (
      <div className={`bg-stone-50 border-2 border-dashed border-stone-200 rounded-xl p-8 text-center ${className}`} style={{ height }}>
        <MapPin className="w-12 h-12 text-stone-400 mx-auto mb-4" />
        <h3 className="font-medium text-stone-600 mb-2">ยังไม่ได้ระบุตำแหน่งโรงแรม</h3>
        <p className="text-sm text-stone-500 mb-4">
          {hotelAddress ? `ที่อยู่: ${hotelAddress}` : 'กรุณาติดต่อ Admin เพื่อเพิ่มตำแหน่งบนแผนที่'}
        </p>
        <div className="inline-flex items-center gap-2 text-xs text-stone-400">
          <AlertCircle className="w-4 h-4" />
          <span>ต้องการ latitude/longitude จาก Admin</span>
        </div>
      </div>
    )
  }

  const center = {
    lat: latitude,
    lng: longitude,
  }

  useEffect(() => {
    // Check if Google Maps API is already loaded
    if (window.google && window.google.maps) {
      initializeMap()
      return
    }

    // Load Google Maps API
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setError('Google Maps API Key ไม่ถูกตั้งค่า')
      setIsLoading(false)
      return
    }

    // Create script element
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`
    script.async = true
    script.defer = true

    // Set up callback
    window.initMap = initializeMap

    script.onload = () => {
      // Script loaded, initMap will be called automatically
    }

    script.onerror = () => {
      setError('ไม่สามารถโหลด Google Maps API ได้')
      setIsLoading(false)
    }

    document.head.appendChild(script)

    // Cleanup function
    return () => {
      // Remove the callback
      delete window.initMap

      // Remove script if it exists
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`)
      if (existingScript && existingScript.parentNode) {
        existingScript.parentNode.removeChild(existingScript)
      }
    }
  }, [latitude, longitude])

  const initializeMap = () => {
    if (!mapRef.current || !window.google) {
      setError('ไม่สามารถเริ่มต้นแผนที่ได้')
      setIsLoading(false)
      return
    }

    try {
      // Initialize map
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center: center,
        zoom: 16,
        mapTypeId: 'roadmap',
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        mapTypeControl: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'simplified' }]
          }
        ]
      })

      // Add hotel marker
      markerRef.current = new window.google.maps.Marker({
        position: center,
        map: googleMapRef.current,
        title: hotelName,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0C7.163 0 0 7.163 0 16C0 24.837 16 40 16 40C16 40 32 24.837 32 16C32 7.163 24.837 0 16 0Z" fill="#B45309"/>
              <circle cx="16" cy="16" r="8" fill="white"/>
              <circle cx="16" cy="16" r="4" fill="#B45309"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 40),
          anchor: new window.google.maps.Point(16, 40)
        }
      })

      // Add info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 250px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">
              ${hotelName}
            </h3>
            ${hotelAddress ? `
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; line-height: 1.4;">
                📍 ${hotelAddress}
              </p>
            ` : ''}
            <div style="margin-top: 8px; font-size: 12px; color: #9ca3af;">
              📍 ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
            </div>
          </div>
        `
      })

      // Show info window on marker click
      markerRef.current.addListener('click', () => {
        infoWindow.open(googleMapRef.current, markerRef.current)
      })

      setIsLoading(false)
      setError('')
    } catch (error) {
      console.error('Error initializing map:', error)
      setError('เกิดข้อผิดพลาดในการโหลดแผนที่')
      setIsLoading(false)
    }
  }

  // Generate Google Maps link for external navigation
  const getGoogleMapsLink = () => {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
  }

  const openInGoogleMaps = () => {
    window.open(getGoogleMapsLink(), '_blank')
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-xl p-6 text-center ${className}`} style={{ height }}>
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <h3 className="font-medium text-red-700 mb-2">ไม่สามารถโหลดแผนที่ได้</h3>
        <p className="text-sm text-red-600 mb-4">{error}</p>
        {latitude && longitude && (
          <button
            onClick={openInGoogleMaps}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm transition"
          >
            <ExternalLink className="w-4 h-4" />
            เปิดใน Google Maps
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`relative bg-white rounded-xl overflow-hidden border border-stone-200 ${className}`} style={{ height }}>
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-3" />
            <p className="text-sm text-stone-600">กำลังโหลดแผนที่...</p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* External Link Button */}
      {!isLoading && !error && (
        <button
          onClick={openInGoogleMaps}
          className="absolute top-3 right-3 bg-white shadow-lg rounded-lg p-2 hover:bg-stone-50 transition z-10"
          title="เปิดใน Google Maps"
        >
          <ExternalLink className="w-4 h-4 text-stone-600" />
        </button>
      )}

      {/* Hotel Info Overlay */}
      {!isLoading && !error && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="text-white">
            <h3 className="font-semibold text-lg mb-1">{hotelName}</h3>
            {hotelAddress && (
              <p className="text-sm text-white/90">{hotelAddress}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}