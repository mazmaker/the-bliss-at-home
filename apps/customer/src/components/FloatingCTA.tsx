import { useState } from 'react'
import { Phone, MessageCircle, X } from 'lucide-react'

interface FloatingCTAProps {
  onContactAdmin?: (method: 'phone' | 'line' | 'facebook') => void
  phoneNumber?: string
  lineId?: string
  facebookUrl?: string
  colors?: {
    phone?: string
    line?: string
    facebook?: string
    main?: string
  }
}

export default function FloatingCTA({
  onContactAdmin,
  phoneNumber = '+66-XX-XXX-XXXX',
  lineId = '@blissathome',
  facebookUrl = 'your-facebook-page',
  colors = {}
}: FloatingCTAProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Default colors that can be overridden
  const buttonColors = {
    phone: colors.phone || 'bg-amber-500 hover:bg-amber-600',
    line: colors.line || 'bg-green-500 hover:bg-green-600',
    facebook: colors.facebook || 'bg-blue-600 hover:bg-blue-700',
    main: colors.main || 'bg-gradient-to-r from-amber-500 to-orange-600'
  }

  const handleContact = (method: 'phone' | 'line' | 'facebook') => {
    onContactAdmin?.(method)

    switch (method) {
      case 'phone':
        window.open(`tel:${phoneNumber}`)
        break
      case 'line':
        window.open(`https://line.me/ti/p/${lineId}`)
        break
      case 'facebook':
        window.open(`https://m.me/${facebookUrl}`)
        break
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Expanded options */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 space-y-3 animate-in slide-in-from-bottom-2 duration-200">
          {/* Facebook */}
          <button
            onClick={() => handleContact('facebook')}
            className={`flex items-center gap-3 ${buttonColors.facebook} text-white px-4 py-3 rounded-full shadow-lg transition-all duration-300 hover:scale-105`}
          >
            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">f</span>
            </div>
            <span className="text-sm font-medium">Facebook</span>
          </button>

          {/* LINE */}
          <button
            onClick={() => handleContact('line')}
            className={`flex items-center gap-3 ${buttonColors.line} text-white px-4 py-3 rounded-full shadow-lg transition-all duration-300 hover:scale-105`}
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-sm font-medium">LINE</span>
          </button>

          {/* Phone */}
          <button
            onClick={() => handleContact('phone')}
            className={`flex items-center gap-3 ${buttonColors.phone} text-white px-4 py-3 rounded-full shadow-lg transition-all duration-300 hover:scale-105`}
          >
            <Phone className="w-6 h-6" />
            <span className="text-sm font-medium">โทร</span>
          </button>
        </div>
      )}

      {/* Main CTA button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-14 h-14 ${buttonColors.main} text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center`}
      >
        {isExpanded ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>
    </div>
  )
}