import { Link } from 'react-router-dom'
import { Star, ChevronRight, Clock } from 'lucide-react'
import { useCustomerPoints, useLoyaltySettings, useNearestExpiry } from '@bliss/supabase/hooks/useLoyalty'
import { useTranslation } from '@bliss/i18n'

interface PointsWidgetProps {
  customerId: string
}

export function PointsWidget({ customerId }: PointsWidgetProps) {
  const { t } = useTranslation()
  const { data: points } = useCustomerPoints(customerId)
  const { data: settings } = useLoyaltySettings()
  const { data: nearestExpiry } = useNearestExpiry(customerId)

  if (!settings?.loyalty_enabled) return null

  const totalPoints = points?.total_points || 0
  const pointsValue = settings ? Math.floor(totalPoints / settings.points_to_baht) : 0

  return (
    <div className="bg-bliss-600 rounded-2xl p-5 text-white mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5" />
          <span className="font-semibold">{t('home:pointsWidget.title')}</span>
        </div>
        <Link
          to="/points"
          className="flex items-center gap-1 text-sm text-bliss-200 hover:text-white transition"
        >
          {t('home:pointsWidget.viewHistory')}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-bold">{totalPoints.toLocaleString()}</span>
        <span className="text-bliss-300">{t('home:pointsWidget.pointsUnit')}</span>
      </div>

      <p className="text-bliss-300 text-sm">{t('home:pointsWidget.valueLabel')}{pointsValue.toLocaleString()}</p>

      {nearestExpiry && (
        <div className="flex items-center gap-1 mt-3 text-xs text-bliss-300 bg-bliss-700/30 rounded-lg px-3 py-1.5">
          <Clock className="w-3 h-3" />
          <span>
            {nearestExpiry.points} {t('home:pointsWidget.expiringLabel')}{' '}
            {new Date(nearestExpiry.expires_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      )}
    </div>
  )
}
