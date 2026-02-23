import { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin, Loader2, LocateFixed } from 'lucide-react'

interface GoogleMapsPickerProps {
  latitude?: number | null
  longitude?: number | null
  onLocationChange: (lat: number, lng: number) => void
  className?: string
}

declare global {
  interface Window {
    google: any
    initMap: () => void
  }
}

export function GoogleMapsPicker({
  latitude,
  longitude,
  onLocationChange,
  className = '',
}: GoogleMapsPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLocating, setIsLocating] = useState(false)
  const [error, setError] = useState('')

  // Default center (Bangkok)
  const defaultCenter = {
    lat: latitude || 13.7563,
    lng: longitude || 100.5018,
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

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=th`
    script.async = true
    script.defer = true
    script.onerror = () => {
      setError('ไม่สามารถโหลด Google Maps API ได้')
      setIsLoading(false)
    }
    script.onload = () => {
      initializeMap()
    }

    document.head.appendChild(script)

    return () => {
      // Cleanup
      if (script.parentNode) {
        document.head.removeChild(script)
      }
    }
  }, [])

  // Update marker when latitude/longitude props change
  useEffect(() => {
    if (googleMapRef.current && markerRef.current && latitude && longitude) {
      const newPosition = { lat: latitude, lng: longitude }
      markerRef.current.setPosition(newPosition)
      googleMapRef.current.setCenter(newPosition)
    }
  }, [latitude, longitude])

  const initializeMap = () => {
    if (!mapRef.current) return

    try {
      const mapOptions = {
        center: defaultCenter,
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        gestureHandling: 'cooperative', // Better mobile support
      }

      // Create map
      const map = new window.google.maps.Map(mapRef.current, mapOptions)
      googleMapRef.current = map

      // Create marker
      const marker = new window.google.maps.Marker({
        position: defaultCenter,
        map: map,
        draggable: true, // Allow dragging marker
        animation: window.google.maps.Animation.DROP,
        title: 'ตำแหน่งที่อยู่',
      })
      markerRef.current = marker

      // Update location when marker is dragged
      marker.addListener('dragend', () => {
        const position = marker.getPosition()
        if (position) {
          onLocationChange(position.lat(), position.lng())
        }
      })

      // Update location when map is clicked
      map.addListener('click', (event: any) => {
        const lat = event.latLng.lat()
        const lng = event.latLng.lng()

        marker.setPosition({ lat, lng })
        onLocationChange(lat, lng)
      })

      // Add search box for easy location finding
      const input = document.createElement('input')
      input.type = 'text'
      input.placeholder = 'ค้นหาสถานที่...'
      input.className = 'w-80 px-4 py-2 mt-2 ml-2 bg-white rounded-lg shadow-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500'

      const searchBox = new window.google.maps.places.SearchBox(input)
      map.controls[window.google.maps.ControlPosition.TOP_LEFT].push(input)

      // Bias search results to current map bounds
      map.addListener('bounds_changed', () => {
        searchBox.setBounds(map.getBounds())
      })

      // When user selects a place from search
      searchBox.addListener('places_changed', () => {
        const places = searchBox.getPlaces()
        if (places.length === 0) return

        const place = places[0]
        if (!place.geometry || !place.geometry.location) return

        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()

        marker.setPosition({ lat, lng })
        map.setCenter({ lat, lng })
        map.setZoom(17)

        onLocationChange(lat, lng)
      })

      setIsLoading(false)
    } catch (err) {
      console.error('Error initializing map:', err)
      setError('เกิดข้อผิดพลาดในการโหลดแผนที่')
      setIsLoading(false)
    }
  }

  const locateCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) return

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        if (googleMapRef.current && markerRef.current) {
          const pos = { lat, lng }
          markerRef.current.setPosition(pos)
          googleMapRef.current.setCenter(pos)
          googleMapRef.current.setZoom(17)
        }

        onLocationChange(lat, lng)
        setIsLocating(false)
      },
      () => {
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [onLocationChange])

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-100 rounded-lg p-8 ${className}`}>
        <MapPin className="w-12 h-12 text-red-500 mb-3" />
        <p className="text-red-600 text-sm font-medium">{error}</p>
        <p className="text-gray-500 text-xs mt-2">
          กรุณาตรวจสอบ Google Maps API Key ใน .env
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">กำลังโหลดแผนที่...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full min-h-[400px]" />
        {/* Current location button */}
        {!isLoading && !error && (
          <button
            type="button"
            onClick={locateCurrentPosition}
            disabled={isLocating}
            className="absolute bottom-4 right-4 z-10 flex items-center gap-2 px-4 py-2.5 bg-white rounded-lg shadow-lg border border-stone-200 text-sm font-medium text-stone-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition disabled:opacity-60"
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LocateFixed className="w-4 h-4" />
            )}
            {isLocating ? 'กำลังค้นหา...' : 'ตำแหน่งปัจจุบัน'}
          </button>
        )}
      </div>

      <div className="flex items-start gap-2 text-xs text-gray-600 bg-amber-50 p-3 rounded-lg">
        <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-900 mb-1">วิธีใช้งาน:</p>
          <ul className="space-y-1 text-amber-700">
            <li>• กดปุ่ม "ตำแหน่งปัจจุบัน" เพื่อใช้ตำแหน่งของคุณ</li>
            <li>• คลิกบนแผนที่เพื่อกำหนดตำแหน่ง</li>
            <li>• ลากหมุดสีแดงเพื่อปรับตำแหน่ง</li>
            <li>• ค้นหาสถานที่ด้วยช่องค้นหาด้านบนแผนที่</li>
          </ul>
        </div>
      </div>

      {latitude && longitude && (
        <div className="flex gap-2 text-xs">
          <div className="flex-1 bg-gray-50 p-2 rounded border border-gray-200">
            <span className="text-gray-500">Latitude:</span>{' '}
            <span className="font-mono font-medium text-gray-900">{latitude.toFixed(6)}</span>
          </div>
          <div className="flex-1 bg-gray-50 p-2 rounded border border-gray-200">
            <span className="text-gray-500">Longitude:</span>{' '}
            <span className="font-mono font-medium text-gray-900">{longitude.toFixed(6)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
