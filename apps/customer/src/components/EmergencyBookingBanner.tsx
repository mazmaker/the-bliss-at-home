import { useState, useEffect } from 'react'
import { Phone, MessageCircle, Clock, X, Sparkles, Star } from 'lucide-react'

interface EmergencyBookingBannerProps {
  onContactAdmin?: (method: 'phone' | 'line' | 'chat') => void
}

// Force customer app redeploy - CORS fix 2026-05-22 15:15

export default function EmergencyBookingBanner({ onContactAdmin }: EmergencyBookingBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [currentStats, setCurrentStats] = useState(42)

  // Gentle animation for engagement
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStats(prev => prev + Math.floor(Math.random() * 2))
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  if (!isVisible) return null

  const handleContact = (method: 'phone' | 'line' | 'chat') => {
    onContactAdmin?.(method)

    switch (method) {
      case 'phone':
        window.open('tel:+66-XX-XXX-XXXX')
        break
      case 'line':
        window.open('https://line.me/ti/p/@blissathome')
        break
      case 'chat':
        window.open('https://wa.me/66XXXXXXXXX?text=ต้องการนวดด่วนภายใน 30 นาที')
        break
    }
  }

  return (
    <div className="relative rounded-xl my-3 shadow-lg overflow-hidden" style={{ backgroundColor: '#D29B25' }}>

      <div className="relative p-6 text-center">
        {/* White badge */}
        <div className="inline-block bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-amber-800 text-sm font-medium mb-4">
          บริการฉุกเฉิน
        </div>

        {/* Main heading */}
        <h3 className="text-xl font-semibold text-white mb-2">
          ต้องการนวดภายใน 30 นาที?
        </h3>

        {/* Subtitle */}
        <p className="text-white/90 text-sm mb-6">
          ไม่ทันจองล่วงหน้า 3 ชั่วโมง? เรามีทีมพิเศษคอยช่วยเหลือ
        </p>

        {/* Contact buttons */}
        <div className="flex justify-center gap-3">
          <button
            onClick={() => handleContact('phone')}
            className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm hover:bg-white/30 transition-all border border-white/20"
          >
            <Phone className="w-4 h-4" />
            โทร
          </button>

          <button
            onClick={() => handleContact('line')}
            className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm hover:bg-white/30 transition-all border border-white/20"
          >
            <MessageCircle className="w-4 h-4" />
            LINE
          </button>

          <button
            onClick={() => handleContact('chat')}
            className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm hover:bg-white/30 transition-all border border-white/20"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}