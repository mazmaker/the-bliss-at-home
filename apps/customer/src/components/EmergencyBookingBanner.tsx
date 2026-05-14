import { useState, useEffect } from 'react'
import { Phone, MessageCircle, Clock, AlertTriangle, CheckCircle, Users } from 'lucide-react'

interface EmergencyBookingBannerProps {
  onContactAdmin?: (method: 'phone' | 'line' | 'chat') => void
}

export default function EmergencyBookingBanner({ onContactAdmin }: EmergencyBookingBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [currentStats, setCurrentStats] = useState(42) // Dynamic number

  // Animate stats every few seconds for engagement
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStats(prev => prev + Math.floor(Math.random() * 3))
    }, 5000)
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
        // Open chat widget or WhatsApp
        window.open('https://wa.me/66XXXXXXXXX?text=ต้องการนวดด่วนภายใน 30 นาที')
        break
    }
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-2xl shadow-2xl mx-4 my-6">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full animate-ping delay-1000"></div>
        <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-white rounded-full animate-bounce delay-500"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 p-6">
        {/* Close button */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
        >
          <AlertTriangle className="w-4 h-4" />
        </button>

        {/* Header with urgency indicator */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Clock className="w-8 h-8 text-white animate-pulse" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              🚨 ต้องการนวดภายใน 30 นาทีนี้?
            </h2>
            <p className="text-red-100 text-sm font-medium">
              URGENT BOOKING • ไม่ทันจองล่วงหน้า? เราช่วยได้!
            </p>
          </div>
        </div>

        {/* Value proposition */}
        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-300 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-white font-semibold mb-2">เราจะช่วยคุณ:</h3>
              <ul className="text-red-100 text-sm space-y-1">
                <li>✅ ตรวจสอบคิวนักนวดที่ใกล้คุณที่สุด</li>
                <li>✅ จัดการจองพิเศษให้ภายใน 5 นาที</li>
                <li>✅ รับประกันบริการหรือคืนเงิน 100%</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact methods */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => handleContact('phone')}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl p-4 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <Phone className="w-6 h-6 text-white mx-auto mb-2" />
            <div className="text-white text-sm font-semibold">โทรเลย</div>
            <div className="text-red-100 text-xs">ตอบรับ 24/7</div>
          </button>

          <button
            onClick={() => handleContact('line')}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl p-4 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <div className="w-6 h-6 mx-auto mb-2 text-white font-bold">LINE</div>
            <div className="text-white text-sm font-semibold">แชทเลย</div>
            <div className="text-red-100 text-xs">ตอบใน 2 นาที</div>
          </button>

          <button
            onClick={() => handleContact('chat')}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl p-4 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <MessageCircle className="w-6 h-6 text-white mx-auto mb-2" />
            <div className="text-white text-sm font-semibold">WhatsApp</div>
            <div className="text-red-100 text-xs">รวดเร็วที่สุด</div>
          </button>
        </div>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-2 text-red-100">
          <Users className="w-4 h-4" />
          <span className="text-sm">
            💚 เราช่วยลูกค้าฉุกเฉิน{' '}
            <span className="font-bold text-white">{currentStats}+</span> คนต่อวัน
          </span>
        </div>

        {/* Urgency timer effect */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full text-sm font-semibold animate-pulse">
            <Clock className="w-4 h-4" />
            ตอบกลับภายใน 5 นาที หรือฟรี!
          </div>
        </div>
      </div>
    </div>
  )
}