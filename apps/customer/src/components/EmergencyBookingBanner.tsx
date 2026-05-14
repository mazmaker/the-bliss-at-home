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
    <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 border-2 border-amber-200 rounded-2xl shadow-lg mx-4 my-6">
      {/* Subtle animated background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-orange-300 to-amber-300 rounded-full transform -translate-x-1/2 translate-y-1/2"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 p-6">
        {/* Elegant close button */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors p-1 hover:bg-white rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Premium header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-light text-stone-800 mb-2">
            บริการพิเศษ
          </h2>
          <p className="text-lg text-stone-700 font-medium">
            ต้องการนวดภายใน 30 นาทีนี้?
          </p>
          <p className="text-stone-600 text-sm mt-1">
            ไม่ทันจองล่วงหน้า 3 ชั่วโมง? เรามีทีมพิเศษคอยช่วยเหลือ
          </p>
        </div>

        {/* Elegant value proposition */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200/50 p-5 mb-6">
          <h3 className="text-stone-800 font-medium mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            บริการด่วนพิเศษ
          </h3>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-start gap-2 text-sm">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></div>
              <span className="text-stone-700">ตรวจสอบคิวนักนวดที่พร้อมให้บริการ</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></div>
              <span className="text-stone-700">จัดการจองพิเศษภายใน 5 นาที</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></div>
              <span className="text-stone-700">รับประกันคุณภาพเหมือนการจองปกติ</span>
            </div>
          </div>
        </div>

        {/* Premium contact methods */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => handleContact('phone')}
            className="bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white p-4 rounded-xl transition-all duration-300 hover:shadow-lg group"
          >
            <Phone className="w-5 h-5 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-sm font-medium">โทรเลย</div>
            <div className="text-xs opacity-90">24/7</div>
          </button>

          <button
            onClick={() => handleContact('line')}
            className="bg-gradient-to-b from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white p-4 rounded-xl transition-all duration-300 hover:shadow-lg group"
          >
            <div className="w-5 h-5 mx-auto mb-2 text-sm font-bold group-hover:scale-110 transition-transform">LINE</div>
            <div className="text-sm font-medium">แชทเลย</div>
            <div className="text-xs opacity-90">2 นาที</div>
          </button>

          <button
            onClick={() => handleContact('chat')}
            className="bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white p-4 rounded-xl transition-all duration-300 hover:shadow-lg group"
          >
            <MessageCircle className="w-5 h-5 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-sm font-medium">WhatsApp</div>
            <div className="text-xs opacity-90">รวดเร็ว</div>
          </button>
        </div>

        {/* Elegant social proof */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm">
            <Clock className="w-4 h-4" />
            <span>เราช่วยลูกค้าด่วน <strong>{currentStats}+ คน</strong> ต่อวัน</span>
          </div>
        </div>
      </div>
    </div>
  )
}