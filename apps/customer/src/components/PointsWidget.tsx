import { Link } from 'react-router-dom'
import { Star, ChevronRight, Clock } from 'lucide-react'
import { useCustomerPoints, useLoyaltySettings, useNearestExpiry } from '@bliss/supabase/hooks/useLoyalty'

interface PointsWidgetProps {
  customerId: string
}

export function PointsWidget({ customerId }: PointsWidgetProps) {
  const { data: points } = useCustomerPoints(customerId)
  const { data: settings } = useLoyaltySettings()
  const { data: nearestExpiry } = useNearestExpiry(customerId)

  if (!settings?.loyalty_enabled) return null

  const totalPoints = points?.total_points || 0
  const pointsValue = settings ? Math.floor(totalPoints / settings.points_to_baht) : 0

  return (
    <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-2xl p-5 text-white mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5" />
          <span className="font-semibold">แต้มสะสม</span>
        </div>
        <Link
          to="/points"
          className="flex items-center gap-1 text-sm text-amber-100 hover:text-white transition"
        >
          ดูประวัติ
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-bold">{totalPoints.toLocaleString()}</span>
        <span className="text-amber-200">แต้ม</span>
      </div>

      <p className="text-amber-200 text-sm">มูลค่า ฿{pointsValue.toLocaleString()}</p>

      {nearestExpiry && (
        <div className="flex items-center gap-1 mt-3 text-xs text-amber-200 bg-amber-800/30 rounded-lg px-3 py-1.5">
          <Clock className="w-3 h-3" />
          <span>
            {nearestExpiry.points} แต้มหมดอายุ{' '}
            {new Date(nearestExpiry.expires_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      )}
    </div>
  )
}
