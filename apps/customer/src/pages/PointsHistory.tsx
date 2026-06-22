import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '@bliss/i18n'
import { Star, Plus, Minus, Clock, Gift, Undo, Settings, TrendingUp, ArrowDownLeft, ArrowUpRight, ChevronLeft } from 'lucide-react'
import { useCurrentCustomer } from '@bliss/supabase/hooks/useCustomer'
import { useCustomerPoints, useLoyaltySettings, usePointTransactions } from '@bliss/supabase/hooks/useLoyalty'
import type { PointTransaction } from '@bliss/supabase/hooks/useLoyalty'

const TYPE_CONFIG: Record<string, { labelKey: string; icon: typeof Plus; color: string }> = {
  earn: { labelKey: 'booking:transactionTypes.earn', icon: ArrowDownLeft, color: 'text-green-600 bg-green-100' },
  bonus: { labelKey: 'booking:transactionTypes.bonus', icon: Gift, color: 'text-purple-600 bg-purple-100' },
  redeem: { labelKey: 'booking:transactionTypes.redeem', icon: ArrowUpRight, color: 'text-blue-600 bg-blue-100' },
  refund: { labelKey: 'booking:transactionTypes.refund', icon: Undo, color: 'text-bliss-600 bg-bliss-200' },
  expire: { labelKey: 'booking:transactionTypes.expire', icon: Clock, color: 'text-red-600 bg-red-100' },
  admin_adjust: { labelKey: 'booking:transactionTypes.adminAdjust', icon: Settings, color: 'text-bliss-700 bg-bliss-100' },
}

const FILTER_OPTIONS = [
  { value: 'all', labelKey: 'booking:pointsFilter.all' },
  { value: 'earn', labelKey: 'booking:pointsFilter.earned' },
  { value: 'redeem', labelKey: 'booking:pointsFilter.redeemed' },
  { value: 'expire', labelKey: 'booking:pointsFilter.expired' },
]

function PointsHistory() {
  const { t } = useTranslation()
  const { data: customer } = useCurrentCustomer()
  const { data: points } = useCustomerPoints(customer?.id)
  const { data: settings } = useLoyaltySettings()
  const [filter, setFilter] = useState('all')

  const { data: txData, isLoading } = usePointTransactions(customer?.id, {
    type: filter,
    limit: 50,
  })

  const totalPoints = points?.total_points || 0
  const pointsValue = settings ? Math.floor(totalPoints / settings.points_to_baht) : 0

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderTransaction = (tx: PointTransaction) => {
    const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.earn
    const Icon = config.icon
    const isPositive = tx.points > 0

    return (
      <div key={tx.id} className="flex items-center gap-4 py-4 border-b border-bliss-100 last:border-0">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-bliss-900">{t(config.labelKey)}</p>
          {tx.description && <p className="text-sm text-bliss-500 truncate">{tx.description}</p>}
          <p className="text-xs text-bliss-400 mt-0.5">{formatDate(tx.created_at)}</p>
        </div>
        <div className={`text-right font-bold text-lg ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
          {isPositive ? '+' : ''}{tx.points.toLocaleString()}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bliss-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link to="/profile" className="inline-flex items-center gap-1 text-sm text-bliss-600 hover:text-bliss-700 font-medium mb-3 transition">
            <ChevronLeft className="w-4 h-4" />
            {t('profile:pointsHistory.backToProfile')}
          </Link>
          <h1 className="text-2xl font-bold text-bliss-900 mb-2">{t('profile:pointsHistory.title')}</h1>
          <p className="text-bliss-700">{t('profile:pointsHistory.subtitle')}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-bliss-100 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-bliss-600" />
              <span className="text-sm text-bliss-500">{t('profile:pointsHistory.card.remaining')}</span>
            </div>
            <p className="text-3xl font-bold text-bliss-600">{totalPoints.toLocaleString()}</p>
            <p className="text-sm text-bliss-500 mt-1">{t('profile:pointsHistory.card.value')} ฿{pointsValue.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-bliss-100 p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm text-bliss-500">{t('profile:pointsHistory.card.totalEarned')}</span>
            </div>
            <p className="text-3xl font-bold text-bliss-900">{(points?.lifetime_earned || 0).toLocaleString()}</p>
            <p className="text-sm text-bliss-500 mt-1">{t('profile:pointsHistory.card.points')}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-bliss-100 p-5">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-bliss-500">{t('profile:pointsHistory.card.redeemed')}</span>
            </div>
            <p className="text-3xl font-bold text-bliss-900">{(points?.lifetime_redeemed || 0).toLocaleString()}</p>
            <p className="text-sm text-bliss-500 mt-1">{t('profile:pointsHistory.card.pointsLabel')}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-bliss-100 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-red-500" />
              <span className="text-sm text-bliss-500">{t('profile:pointsHistory.card.expired')}</span>
            </div>
            <p className="text-3xl font-bold text-bliss-900">{(points?.lifetime_expired || 0).toLocaleString()}</p>
            <p className="text-sm text-bliss-500 mt-1">{t('profile:pointsHistory.card.pointsLabelExpired')}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-4 py-2 rounded-full font-medium text-sm transition whitespace-nowrap ${
                filter === opt.value
                  ? 'bg-bliss-600 text-white'
                  : 'bg-bliss-50 text-bliss-700 hover:bg-bliss-100 border border-bliss-200'
              }`}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-2xl shadow-sm border border-bliss-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-bliss-100">
            <h3 className="font-semibold text-bliss-900">{t('profile:pointsHistory.section.title')}</h3>
          </div>
          <div className="px-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bliss-600 mx-auto mb-3" />
                <p className="text-sm text-bliss-500">{t('profile:pointsHistory.loading')}</p>
              </div>
            ) : txData?.transactions && txData.transactions.length > 0 ? (
              <div>{txData.transactions.map(renderTransaction)}</div>
            ) : (
              <div className="text-center py-12">
                <Star className="w-12 h-12 text-bliss-300 mx-auto mb-3" />
                <p className="text-bliss-500 font-medium">{t('profile:pointsHistory.empty.title')}</p>
                <p className="text-sm text-bliss-400 mt-1">{t('profile:pointsHistory.empty.description')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PointsHistory
