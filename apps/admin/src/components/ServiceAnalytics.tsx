import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart3,
  TrendingUp,
  Star,
  Clock,
  DollarSign,
  Users,
  Calendar,
  Award,
  Activity,
  RefreshCw,
  AlertCircle
} from 'lucide-react'

interface ServiceAnalytics {
  id: string
  name_th: string
  name_en: string
  category: string
  total_bookings: number
  total_revenue: number
  average_rating: number
  avg_duration: number
  peak_hour: string
  commission_earned: number
  growth_rate: number
  last_7_days: number
  popularity_rank: number
}

interface ServiceAnalyticsProps {
  serviceId?: string // If provided, show analytics for specific service
  className?: string
}

export function ServiceAnalytics({ serviceId, className = '' }: ServiceAnalyticsProps) {
  const [analytics, setAnalytics] = useState<ServiceAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [sortBy, setSortBy] = useState<'bookings' | 'revenue' | 'rating'>('bookings')

  // Fetch service analytics data
  const fetchAnalytics = async () => {
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.rpc('get_service_analytics', {
        days_range: parseInt(timeRange.replace('d', '')),
        service_filter: serviceId || null
      })

      if (error) throw error

      // Sort and rank services
      const sortedData = data
        ?.map((item: any, index: number) => ({
          ...item,
          popularity_rank: index + 1
        }))
        .sort((a: ServiceAnalytics, b: ServiceAnalytics) => {
          switch (sortBy) {
            case 'revenue':
              return b.total_revenue - a.total_revenue
            case 'rating':
              return b.average_rating - a.average_rating
            default:
              return b.total_bookings - a.total_bookings
          }
        })

      setAnalytics(sortedData || [])
    } catch (err) {
      console.error('Error fetching service analytics:', err)
      setError('ไม่สามารถโหลดข้อมูลสถิติได้')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [serviceId, timeRange, sortBy])

  const formatCurrency = (amount: number) => `฿${amount.toLocaleString()}`
  const formatRating = (rating: number) => rating.toFixed(1)

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">กำลังโหลดสถิติ...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-600" />
              {serviceId ? 'สถิติบริการ' : 'สถิติบริการทั้งหมด'}
            </h3>
            <p className="text-sm text-stone-600 mt-1">
              วิเคราะห์ประสิทธิภาพและยอดนิยมของบริการ
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
              className="px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="7d">7 วันล่าสุด</option>
              <option value="30d">30 วันล่าสุด</option>
              <option value="90d">90 วันล่าสุด</option>
            </select>

            {/* Sort By Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'bookings' | 'revenue' | 'rating')}
              className="px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="bookings">เรียงตามการจอง</option>
              <option value="revenue">เรียงตามรายได้</option>
              <option value="rating">เรียงตามคะแนน</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={fetchAnalytics}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              รีเฟรช
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      {analytics.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium">ยังไม่มีข้อมูลสถิติ</p>
          <p className="text-gray-500 text-sm mt-1">
            ข้อมูลจะแสดงเมื่อมีการจองบริการเกิดขึ้น
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {analytics.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden hover:shadow-md transition"
            >
              {/* Service Header */}
              <div className="p-4 border-b border-stone-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-stone-900 truncate">
                      {service.name_th}
                    </h4>
                    <p className="text-sm text-stone-500 truncate">
                      {service.name_en}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                    <Award className="w-3 h-3" />
                    #{service.popularity_rank}
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="p-4 space-y-4">
                {/* Primary Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-700">การจอง</span>
                    </div>
                    <p className="text-lg font-bold text-blue-900">
                      {service.total_bookings.toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-600">
                      {service.last_7_days} รายการ (7 วัน)
                    </p>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-green-700">รายได้</span>
                    </div>
                    <p className="text-lg font-bold text-green-900">
                      {formatCurrency(service.total_revenue)}
                    </p>
                    <p className="text-xs text-green-600">
                      {service.growth_rate > 0 ? '↗' : '↘'} {Math.abs(service.growth_rate)}%
                    </p>
                  </div>
                </div>

                {/* Secondary Metrics */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
                      <Star className="w-3 h-3" />
                      <span>{formatRating(service.average_rating)}</span>
                    </div>
                    <p className="text-stone-600">คะแนน</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                      <Clock className="w-3 h-3" />
                      <span>{service.avg_duration}m</span>
                    </div>
                    <p className="text-stone-600">เฉลี่ย</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-orange-600 mb-1">
                      <Users className="w-3 h-3" />
                      <span>{service.peak_hour}</span>
                    </div>
                    <p className="text-stone-600">ช่วงยอดนิยม</p>
                  </div>
                </div>

                {/* Commission Info */}
                <div className="border-t border-stone-100 pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-600">คอมมิชชั่น Staff:</span>
                    <span className="font-semibold text-stone-900">
                      {formatCurrency(service.commission_earned)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {analytics.length > 0 && !serviceId && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <h4 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-600" />
            สรุปภาพรวม
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-stone-900">
                {analytics.reduce((sum, s) => sum + s.total_bookings, 0).toLocaleString()}
              </p>
              <p className="text-sm text-stone-600">การจองทั้งหมด</p>
            </div>

            <div className="text-center">
              <p className="text-2xl font-bold text-stone-900">
                {formatCurrency(analytics.reduce((sum, s) => sum + s.total_revenue, 0))}
              </p>
              <p className="text-sm text-stone-600">รายได้รวม</p>
            </div>

            <div className="text-center">
              <p className="text-2xl font-bold text-stone-900">
                {formatRating(analytics.reduce((sum, s) => sum + s.average_rating, 0) / analytics.length)}
              </p>
              <p className="text-sm text-stone-600">คะแนนเฉลี่ย</p>
            </div>

            <div className="text-center">
              <p className="text-2xl font-bold text-stone-900">
                {formatCurrency(analytics.reduce((sum, s) => sum + s.commission_earned, 0))}
              </p>
              <p className="text-sm text-stone-600">คอมมิชชั่นรวม</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}