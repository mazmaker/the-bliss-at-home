import { useState, useMemo, useEffect } from 'react'
import {
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Building2,
  Copy,
  Check,
  Bell,
  BellRing,
} from 'lucide-react'
import {
  useEarningsSummary,
  useDailyEarnings,
  useServiceEarnings,
  usePayouts,
  type Payout,
  type PayoutStatus,
} from '@bliss/supabase'
import { NotificationSounds, isSoundEnabled } from '../utils/soundNotification'

type ViewPeriod = 'day' | 'week' | 'month'

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

function StaffEarnings() {
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [copiedRef, setCopiedRef] = useState<string | null>(null)
  const [showPayoutDetail, setShowPayoutDetail] = useState<Payout | null>(null)

  // Calculate date range based on view period
  const dateRange = useMemo(() => {
    const start = new Date(currentDate)
    const end = new Date(currentDate)

    if (viewPeriod === 'day') {
      // Just today
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
    } else if (viewPeriod === 'week') {
      // This week (Sunday to Saturday)
      const dayOfWeek = start.getDay()
      start.setDate(start.getDate() - dayOfWeek)
      start.setHours(0, 0, 0, 0)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
    } else {
      // This month
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(end.getMonth() + 1)
      end.setDate(0)
      end.setHours(23, 59, 59, 999)
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    }
  }, [currentDate, viewPeriod])

  // Fetch data
  const { summary, isLoading: isSummaryLoading } = useEarningsSummary()
  const { earnings: dailyEarnings, isLoading: isDailyLoading } = useDailyEarnings(
    dateRange.start,
    dateRange.end
  )
  const { services, isLoading: isServicesLoading } = useServiceEarnings(
    dateRange.start,
    dateRange.end
  )
  const { payouts, isLoading: isPayoutsLoading } = usePayouts(true)

  // Notify on new payout completion
  useEffect(() => {
    const completedPayout = payouts.find(
      (p) => p.status === 'completed' && p.transferred_at
    )
    if (completedPayout && isSoundEnabled()) {
      // Play notification for completed payout
      NotificationSounds.notification()
    }
  }, [payouts])

  // Navigation handlers
  const goToPrevious = () => {
    const newDate = new Date(currentDate)
    if (viewPeriod === 'day') newDate.setDate(newDate.getDate() - 1)
    else if (viewPeriod === 'week') newDate.setDate(newDate.getDate() - 7)
    else newDate.setMonth(newDate.getMonth() - 1)
    setCurrentDate(newDate)
  }

  const goToNext = () => {
    const newDate = new Date(currentDate)
    if (viewPeriod === 'day') newDate.setDate(newDate.getDate() + 1)
    else if (viewPeriod === 'week') newDate.setDate(newDate.getDate() + 7)
    else newDate.setMonth(newDate.getMonth() + 1)
    setCurrentDate(newDate)
  }

  // Format period label
  const getPeriodLabel = () => {
    if (viewPeriod === 'day') {
      return `${currentDate.getDate()} ${THAI_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear() + 543}`
    } else if (viewPeriod === 'week') {
      const weekStart = new Date(currentDate)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      return `${weekStart.getDate()} - ${weekEnd.getDate()} ${THAI_MONTHS[currentDate.getMonth()]}`
    } else {
      return `${THAI_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear() + 543}`
    }
  }

  // Get earnings for current period
  const periodEarnings = useMemo(() => {
    if (viewPeriod === 'day') {
      return {
        earnings: summary?.today_earnings || 0,
        jobs: summary?.today_jobs || 0,
        tips: summary?.today_tips || 0,
        hours: summary?.today_hours || 0,
      }
    } else if (viewPeriod === 'week') {
      return {
        earnings: summary?.week_earnings || 0,
        jobs: summary?.week_jobs || 0,
        tips: summary?.week_tips || 0,
        hours: summary?.week_hours || 0,
      }
    } else {
      return {
        earnings: summary?.month_earnings || 0,
        jobs: summary?.month_jobs || 0,
        tips: summary?.month_tips || 0,
        hours: summary?.month_hours || 0,
      }
    }
  }, [summary, viewPeriod])

  // Get payout status badge
  const getPayoutStatusBadge = (status: PayoutStatus) => {
    const styles: Record<PayoutStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
    }
    const labels: Record<PayoutStatus, string> = {
      pending: 'รอดำเนินการ',
      processing: 'กำลังโอน',
      completed: 'โอนแล้ว',
      failed: 'ไม่สำเร็จ',
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    )
  }

  // Copy reference number
  const copyReference = (ref: string) => {
    navigator.clipboard.writeText(ref)
    setCopiedRef(ref)
    setTimeout(() => setCopiedRef(null), 2000)
  }

  // Calculate max earnings for chart
  const maxDailyEarning = Math.max(...dailyEarnings.map((d) => d.earnings), 1)

  const isLoading = isSummaryLoading || isDailyLoading || isServicesLoading || isPayoutsLoading

  if (isLoading && !summary) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-amber-600 mx-auto" />
          <p className="text-gray-500 mt-3">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">รายได้</h1>
          <p className="text-stone-500 text-sm">Earnings</p>
        </div>
        <button className="p-2 bg-white rounded-lg shadow-sm border border-stone-200">
          <Download className="w-5 h-5 text-stone-600" />
        </button>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm">
        {[
          { key: 'day', label: 'วัน' },
          { key: 'week', label: 'สัปดาห์' },
          { key: 'month', label: 'เดือน' },
        ].map((period) => (
          <button
            key={period.key}
            onClick={() => setViewPeriod(period.key as ViewPeriod)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              viewPeriod === period.key
                ? 'bg-amber-700 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm p-3">
        <button onClick={goToPrevious} className="p-2 hover:bg-stone-100 rounded-lg transition">
          <ChevronLeft className="w-5 h-5 text-stone-600" />
        </button>
        <div className="text-center">
          <p className="font-semibold text-stone-900">{getPeriodLabel()}</p>
        </div>
        <button onClick={goToNext} className="p-2 hover:bg-stone-100 rounded-lg transition">
          <ChevronRight className="w-5 h-5 text-stone-600" />
        </button>
      </div>

      {/* Earnings Summary Card */}
      <div className="bg-gradient-to-br from-amber-700 to-amber-800 rounded-2xl shadow-lg p-4 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm opacity-90">รายได้{viewPeriod === 'day' ? 'วันนี้' : viewPeriod === 'week' ? 'สัปดาห์นี้' : 'เดือนนี้'}</p>
            <p className="text-3xl font-bold">฿{periodEarnings.earnings.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg font-bold">{periodEarnings.jobs}</p>
            <p className="text-xs opacity-80">งาน</p>
          </div>
          <div>
            <p className="text-lg font-bold">{periodEarnings.hours.toFixed(1)}</p>
            <p className="text-xs opacity-80">ชั่วโมง</p>
          </div>
          <div>
            <p className="text-lg font-bold">
              ฿{periodEarnings.jobs > 0 ? Math.round(periodEarnings.earnings / periodEarnings.jobs) : 0}
            </p>
            <p className="text-xs opacity-80">เฉลี่ย/งาน</p>
          </div>
          <div>
            <p className="text-lg font-bold">★{summary?.average_rating?.toFixed(1) || '0.0'}</p>
            <p className="text-xs opacity-80">คะแนน</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Tips */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">💰</span>
              <span className="text-sm text-stone-500">ทิปรวม</span>
            </div>
            {periodEarnings.tips > 0 && (
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-3 h-3" />
              </div>
            )}
          </div>
          <p className="text-xl font-bold text-yellow-600 mt-1">
            ฿{periodEarnings.tips.toLocaleString()}
          </p>
        </div>

        {/* Pending Payout */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-stone-500">รอโอน</span>
            </div>
          </div>
          <p className="text-xl font-bold text-amber-600 mt-1">
            ฿{(summary?.pending_payout || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Daily Earnings Chart */}
      {dailyEarnings.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-stone-900 mb-4">รายได้รายวัน</h3>
          <div className="flex items-end justify-between gap-1 h-32">
            {dailyEarnings.slice(0, 14).reverse().map((day) => {
              const dayDate = new Date(day.date)
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t-lg transition-all ${
                      day.earnings > 0
                        ? 'bg-gradient-to-t from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700'
                        : 'bg-stone-200'
                    }`}
                    style={{ height: `${Math.max((day.earnings / maxDailyEarning) * 100, 4)}%` }}
                    title={`${day.date}: ฿${day.earnings.toLocaleString()}`}
                  />
                  <span className="text-[10px] text-stone-500">{dayDate.getDate()}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Service Breakdown */}
      {services.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-stone-400" />
            <h3 className="font-semibold text-stone-900">แยกตามบริการ</h3>
          </div>
          <div className="space-y-3">
            {services.map((item) => (
              <div key={item.service_name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-stone-700">{item.service_name}</span>
                  <span className="text-sm text-stone-500">
                    {item.total_jobs} งาน • ฿{item.total_earnings.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-700 to-amber-600 rounded-full transition-all"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payout History */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-900">ประวัติการโอนเงิน</h3>
          {payouts.some((p) => p.status === 'completed' && !p.transfer_reference) && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <BellRing className="w-3 h-3" />
              มีรายการใหม่
            </span>
          )}
        </div>

        {payouts.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-500">ยังไม่มีประวัติการโอนเงิน</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payouts.map((payout) => (
              <button
                key={payout.id}
                onClick={() => setShowPayoutDetail(payout)}
                className="w-full flex items-center justify-between py-3 px-3 bg-stone-50 rounded-xl hover:bg-stone-100 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      payout.status === 'completed'
                        ? 'bg-green-100'
                        : payout.status === 'failed'
                        ? 'bg-red-100'
                        : 'bg-amber-100'
                    }`}
                  >
                    {payout.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : payout.status === 'failed' ? (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-stone-900">
                      {new Date(payout.period_start).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                      })}
                      {' - '}
                      {new Date(payout.period_end).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                    <p className="text-xs text-stone-500">
                      {payout.total_jobs} งาน
                      {payout.transfer_reference && ` • ${payout.transfer_reference}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-stone-900">
                    ฿{payout.net_amount.toLocaleString()}
                  </p>
                  {getPayoutStatusBadge(payout.status)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bank Account Info Link */}
      <a
        href="/staff/profile#bank"
        className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm hover:bg-stone-50 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-stone-900">บัญชีรับเงิน</p>
            <p className="text-xs text-stone-500">ตั้งค่าบัญชีธนาคารสำหรับรับชำระเงิน</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-stone-400" />
      </a>

      {/* Payout Detail Modal */}
      {showPayoutDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg text-stone-900">รายละเอียดการโอนเงิน</h3>
              <button
                onClick={() => setShowPayoutDetail(null)}
                className="p-2 hover:bg-stone-100 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-stone-500">สถานะ</span>
                {getPayoutStatusBadge(showPayoutDetail.status)}
              </div>

              {/* Period */}
              <div className="flex items-center justify-between">
                <span className="text-stone-500">ช่วงเวลา</span>
                <span className="font-medium">
                  {new Date(showPayoutDetail.period_start).toLocaleDateString('th-TH')}
                  {' - '}
                  {new Date(showPayoutDetail.period_end).toLocaleDateString('th-TH')}
                </span>
              </div>

              {/* Earnings breakdown */}
              <div className="bg-stone-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-600">รายได้รวม</span>
                  <span>฿{showPayoutDetail.gross_earnings.toLocaleString()}</span>
                </div>
                {showPayoutDetail.tip_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-stone-600">ทิป</span>
                    <span className="text-green-600">+฿{showPayoutDetail.tip_amount.toLocaleString()}</span>
                  </div>
                )}
                {showPayoutDetail.platform_fee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-stone-600">ค่าธรรมเนียมแพลตฟอร์ม</span>
                    <span className="text-red-600">-฿{showPayoutDetail.platform_fee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-stone-200 font-bold">
                  <span>ยอดโอน</span>
                  <span className="text-amber-700">฿{showPayoutDetail.net_amount.toLocaleString()}</span>
                </div>
              </div>

              {/* Jobs count */}
              <div className="flex items-center justify-between">
                <span className="text-stone-500">จำนวนงาน</span>
                <span className="font-medium">{showPayoutDetail.total_jobs} งาน</span>
              </div>

              {/* Transfer Reference */}
              {showPayoutDetail.transfer_reference && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">เลขที่อ้างอิง</span>
                  <button
                    onClick={() => copyReference(showPayoutDetail.transfer_reference!)}
                    className="flex items-center gap-2 font-mono text-sm bg-stone-100 px-3 py-1.5 rounded-lg"
                  >
                    {showPayoutDetail.transfer_reference}
                    {copiedRef === showPayoutDetail.transfer_reference ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-stone-400" />
                    )}
                  </button>
                </div>
              )}

              {/* Transfer date */}
              {showPayoutDetail.transferred_at && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">วันที่โอน</span>
                  <span className="font-medium">
                    {new Date(showPayoutDetail.transferred_at).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}

              {/* Transfer Slip */}
              {showPayoutDetail.transfer_slip_url && (
                <div>
                  <p className="text-stone-500 mb-2">สลิปการโอน</p>
                  <img
                    src={showPayoutDetail.transfer_slip_url}
                    alt="Transfer Slip"
                    className="w-full rounded-xl border border-stone-200"
                  />
                </div>
              )}

              {/* Notes */}
              {showPayoutDetail.notes && (
                <div>
                  <p className="text-stone-500 mb-1">หมายเหตุ</p>
                  <p className="text-sm text-stone-700 bg-stone-50 p-3 rounded-lg">
                    {showPayoutDetail.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS for animation */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default StaffEarnings
