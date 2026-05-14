import { useState, useEffect } from 'react'
import { Phone, MessageCircle, Clock, X, Sparkles, Star } from 'lucide-react'

interface EmergencyBookingBannerProps {
  onContactAdmin?: (method: 'phone' | 'line' | 'chat') => void
}

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
    <div className="relative bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 rounded-xl my-3 shadow-lg">

      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
            <Sparkles className="w-4 h-4 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-stone-800 mb-1">
              ต้องการนวดภายใน 30 นาที?
            </h3>
            <p className="text-xs text-stone-600 mb-3">
              ไม่ทันจองล่วงหน้า 3 ชั่วโมง? เรามีทีมพิเศษคอยช่วยเหลือ
            </p>

            {/* Compact contact buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleContact('phone')}
                className="flex items-center gap-1 bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-amber-600 transition-colors"
              >
                <Phone className="w-3 h-3" />
                โทร
              </button>

              <button
                onClick={() => handleContact('line')}
                className="flex items-center gap-1 bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-600 transition-colors"
              >
                <MessageCircle className="w-3 h-3" />
                LINE
              </button>

              <button
                onClick={() => handleContact('chat')}
                className="flex items-center gap-1 bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-600 transition-colors"
              >
                <MessageCircle className="w-3 h-3" />
                WhatsApp
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}