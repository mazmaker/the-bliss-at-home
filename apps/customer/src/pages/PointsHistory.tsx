import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, Plus, Minus, Clock, Gift, Undo, Settings, TrendingUp, ArrowDownLeft, ArrowUpRight, ChevronLeft } from 'lucide-react'
import { useCurrentCustomer } from '@bliss/supabase/hooks/useCustomer'
import { useCustomerPoints, useLoyaltySettings, usePointTransactions } from '@bliss/supabase/hooks/useLoyalty'
import type { PointTransaction } from '@bliss/supabase/hooks/useLoyalty'

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Plus; color: string }> = {
  earn: { label: 'ได้รับจากการจอง', icon: ArrowDownLeft, color: 'text-green-600 bg-green-100' },
  bonus: { label: 'โบนัส', icon: Gift, color: 'text-purple-600 bg-purple-100' },
  redeem: { label: 'แลกส่วนลด', icon: ArrowUpRight, color: 'text-blue-600 bg-blue-100' },
  refund: { label: 'คืนแต้ม', icon: Undo, color: 'text-amber-600 bg-amber-100' },
  expire: { label: 'หมดอายุ', icon: Clock, color: 'text-red-600 bg-red-100' },
  admin_adjust: { label: 'ปรับปรุงโดยแอดมิน', icon: Settings, color: 'text-stone-600 bg-stone-100' },
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'earn', label: 'ได้รับ' },
  { value: 'redeem', label: 'ใช้แต้ม' },
  { value: 'expire', label: 'หมดอายุ' },
]

function PointsHistory() {
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
      <div key={tx.id} className="flex items-center gap-4 py-4 border-b border-stone-100 last:border-0">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-stone-900">{config.label}</p>
          {tx.description && <p className="text-sm text-stone-500 truncate">{tx.description}</p>}
          <p className="text-xs text-stone-400 mt-0.5">{formatDate(tx.created_at)}</p>
        </div>
        <div className={`text-right font-bold text-lg ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
          {isPositive ? '+' : ''}{tx.points.toLocaleString()}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link to="/profile" className="inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-800 font-medium mb-3 transition">
            <ChevronLeft className="w-4 h-4" />
            กลับไปหน้าโปรไฟล์
          </Link>
          <h1 className="text-2xl font-bold text-stone-900 mb-2">แต้มสะสม</h1>
          <p className="text-stone-600">ดูยอดแต้มสะสมและประวัติการได้รับ/ใช้แต้มของคุณ</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-stone-500">คงเหลือ</span>
            </div>
            <p className="text-3xl font-bold text-amber-700">{totalPoints.toLocaleString()}</p>
            <p className="text-sm text-stone-500 mt-1">มูลค่า ฿{pointsValue.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm text-stone-500">สะสมทั้งหมด</span>
            </div>
            <p className="text-3xl font-bold text-stone-900">{(points?.lifetime_earned || 0).toLocaleString()}</p>
            <p className="text-sm text-stone-500 mt-1">แต้ม</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-stone-500">ใช้ไปแล้ว</span>
            </div>
            <p className="text-3xl font-bold text-stone-900">{(points?.lifetime_redeemed || 0).toLocaleString()}</p>
            <p className="text-sm text-stone-500 mt-1">แต้ม</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-red-500" />
              <span className="text-sm text-stone-500">หมดอายุ</span>
            </div>
            <p className="text-3xl font-bold text-stone-900">{(points?.lifetime_expired || 0).toLocaleString()}</p>
            <p className="text-sm text-stone-500 mt-1">แต้ม</p>
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
                  ? 'bg-amber-700 text-white'
                  : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-900">ประวัติแต้ม</h3>
          </div>
          <div className="px-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700 mx-auto mb-3" />
                <p className="text-sm text-stone-500">กำลังโหลด...</p>
              </div>
            ) : txData?.transactions && txData.transactions.length > 0 ? (
              <div>{txData.transactions.map(renderTransaction)}</div>
            ) : (
              <div className="text-center py-12">
                <Star className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500 font-medium">ยังไม่มีประวัติแต้ม</p>
                <p className="text-sm text-stone-400 mt-1">เมื่อจองบริการเสร็จสมบูรณ์ คุณจะได้รับแต้มสะสมที่นี่</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PointsHistory
