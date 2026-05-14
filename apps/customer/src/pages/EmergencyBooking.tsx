import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Clock,
  Phone,
  MessageCircle,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Users,
  Zap,
  Heart,
  Star,
  MapPin
} from 'lucide-react'
import { useTranslation } from '@bliss/i18n'

export default function EmergencyBooking() {
  const { t } = useTranslation('emergency')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [requestSent, setRequestSent] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleEmergencyRequest = (method: 'phone' | 'line' | 'whatsapp') => {
    setRequestSent(true)

    // Analytics tracking
    if (typeof gtag !== 'undefined') {
      gtag('event', 'emergency_booking_request', {
        method,
        timestamp: new Date().toISOString()
      })
    }

    switch (method) {
      case 'phone':
        window.open('tel:+66-XX-XXX-XXXX')
        break
      case 'line':
        const message = `🚨 ฉุกเฉิน - ต้องการนวดภายใน 30 นาที\n\nเวลาขณะนี้: ${currentTime.toLocaleTimeString('th-TH')}\nพื้ที่: กรุงเทพ\nประเภทบริการ: ไม่ระบุ`
        window.open(`https://line.me/ti/p/@blissathome?text=${encodeURIComponent(message)}`)
        break
      case 'whatsapp':
        const whatsappMessage = `🚨 URGENT - Need massage within 30 minutes!\n\nCurrent time: ${currentTime.toLocaleString()}\nArea: Bangkok\nService: Traditional Thai Massage`
        window.open(`https://wa.me/66XXXXXXXXX?text=${encodeURIComponent(whatsappMessage)}`)
        break
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 hover:bg-stone-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-stone-600" />
            </Link>
            <h1 className="text-xl font-bold text-stone-900">การจองฉุกเฉิน</h1>
            <div className="ml-auto">
              <div className="flex items-center gap-1 text-red-500 text-sm font-semibold">
                <Clock className="w-4 h-4 animate-pulse" />
                URGENT
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-xl">
              <Zap className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-ping">
              <AlertTriangle className="w-4 h-4 text-yellow-900" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-stone-900 mb-2">
            ต้องการนวดภายใน
          </h2>
          <div className="text-4xl font-black text-red-500 mb-4">
            30 นาทีนี้?
          </div>

          <p className="text-stone-600 text-lg leading-relaxed">
            ไม่ทันจองล่วงหน้า 3 ชั่วโมง?<br />
            <span className="font-semibold text-red-600">เราช่วยคุณได้เลย!</span>
          </p>
        </div>

        {/* Current Time Display */}
        <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-4 mb-6">
          <div className="text-center">
            <div className="text-stone-500 text-sm mb-1">เวลาขณะนี้</div>
            <div className="text-2xl font-mono font-bold text-stone-900">
              {currentTime.toLocaleTimeString('th-TH')}
            </div>
            <div className="text-red-500 text-sm font-semibold">
              ต้องการบริการ: {new Date(currentTime.getTime() + 30*60*1000).toLocaleTimeString('th-TH')}
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            เราจะช่วยคุณอย่างไร
          </h3>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold text-sm">1</span>
              </div>
              <div>
                <div className="font-semibold text-stone-900">ตรวจสอบคิวนักนวด</div>
                <div className="text-stone-600 text-sm">หาคนที่ใกล้คุณและว่างในขณะนี้</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-sm">2</span>
              </div>
              <div>
                <div className="font-semibold text-stone-900">จองทันที</div>
                <div className="text-stone-600 text-sm">ยืนยันการจองภายใน 5 นาที</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold text-sm">3</span>
              </div>
              <div>
                <div className="font-semibold text-stone-900">เริ่มบริการ</div>
                <div className="text-stone-600 text-sm">นักนวดมาถึงภายใน 30 นาที</div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Options */}
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-bold text-stone-900 text-center">
            📞 ติดต่อเราเลย
          </h3>

          <button
            onClick={() => handleEmergencyRequest('phone')}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <div className="font-bold text-xl mb-1">📞 โทรศัพท์</div>
                <div className="opacity-90 text-sm">ตอบรับทันที 24/7</div>
              </div>
              <Phone className="w-8 h-8" />
            </div>
          </button>

          <button
            onClick={() => handleEmergencyRequest('line')}
            className="w-full bg-gradient-to-r from-green-400 to-green-500 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <div className="font-bold text-xl mb-1">💬 LINE Chat</div>
                <div className="opacity-90 text-sm">ตอบภายใน 2 นาที</div>
              </div>
              <MessageCircle className="w-8 h-8" />
            </div>
          </button>

          <button
            onClick={() => handleEmergencyRequest('whatsapp')}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <div className="font-bold text-xl mb-1">📱 WhatsApp</div>
                <div className="opacity-90 text-sm">รวดเร็วที่สุด</div>
              </div>
              <MessageCircle className="w-8 h-8" />
            </div>
          </button>
        </div>

        {/* Guarantee */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 mb-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <Star className="w-6 h-6 text-yellow-900" />
            </div>
            <h3 className="font-bold text-stone-900 mb-2">รับประกันบริการ</h3>
            <p className="text-stone-700 text-sm">
              หากเราไม่สามารถจัดนักนวดให้คุณภายใน 30 นาทีได้
              <br />
              <span className="font-bold text-red-600">คืนเงิน 100% ทันที!</span>
            </p>
          </div>
        </div>

        {/* Success State */}
        {requestSent && (
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="font-bold text-green-800 mb-2">ส่งคำขอแล้ว!</h3>
            <p className="text-green-700 text-sm">
              เราจะติดต่อกลับภายใน 5 นาที
            </p>
          </div>
        )}

        {/* Social Proof */}
        <div className="text-center mt-8 text-stone-500">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">เราช่วยลูกค้าฉุกเฉิน <strong>50+ คน</strong> ต่อวัน</span>
          </div>
          <div className="flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            ))}
            <span className="ml-2 text-sm">4.9/5 จากลูกค้า 2,847 คน</span>
          </div>
        </div>
      </div>
    </div>
  )
}