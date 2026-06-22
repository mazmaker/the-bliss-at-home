import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { LINE_CONTACT_URL, FACEBOOK_CONTACT_URL } from '../config/contact'

interface FloatingCTAProps {
  onContactAdmin?: (method: 'line' | 'facebook') => void
  /** Optional legacy override for a specific LINE id; defaults to the OA contact link. */
  lineId?: string
  colors?: {
    line?: string
    facebook?: string
    main?: string
  }
}

export default function FloatingCTA({
  onContactAdmin,
  lineId = '@blissathome',
  colors = {}
}: FloatingCTAProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Default colors that can be overridden
  const buttonColors = {
    line: colors.line || 'bg-green-500 hover:bg-green-600',
    facebook: colors.facebook || 'bg-blue-600 hover:bg-blue-700',
    main: colors.main || 'bg-bliss-600'
  }

  const handleContact = (method: 'line' | 'facebook') => {
    onContactAdmin?.(method)

    switch (method) {
      case 'line':
        // Canonical customer LINE OA contact link (single source). lineId kept for back-compat.
        window.open(lineId && lineId !== '@blissathome' ? `https://line.me/ti/p/${lineId}` : LINE_CONTACT_URL, '_blank', 'noopener,noreferrer')
        break
      case 'facebook':
        window.open(FACEBOOK_CONTACT_URL, '_blank', 'noopener,noreferrer')
        break
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Expanded options — LINE + Facebook (single-source URLs from config/contact) */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 space-y-3 animate-in slide-in-from-bottom-2 duration-200">
          {/* Facebook */}
          <button
            onClick={() => handleContact('facebook')}
            className={`flex items-center gap-3 ${buttonColors.facebook} text-white px-4 py-3 rounded-full shadow-lg transition-all duration-300 hover:scale-105`}
          >
            <div className="w-6 h-6 bg-bliss-50 rounded-full flex items-center justify-center">
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
