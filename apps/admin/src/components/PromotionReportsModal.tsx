import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  X,
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Download,
  RefreshCw,
  AlertCircle,
  Eye,
  Star,
} from 'lucide-react'

interface PromotionStats {
  total_usage: number
  unique_users: number
  total_discount: number
  avg_discount: number
  usage_by_date: Array<{
    date: string
    count: number
    total_discount: number
  }>
}

interface PromotionUsage {
  id: string
  user_id: string
  discount_amount: number
  used_at: string
  profiles: {
    first_name: string
    last_name: string
    phone?: string
  }
}

interface PromotionReportsModalProps {
  isOpen: boolean
  onClose: () => void
  promotionId: string
  promotionName: string
  promotionCode: string
}

export function PromotionReportsModal({ isOpen, onClose, promotionId, promotionName, promotionCode }: PromotionReportsModalProps) {
  const [stats, setStats] = useState<PromotionStats | null>(null)
  const [usage, setUsage] = useState<PromotionUsage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'chart'>('overview')

  useEffect(() => {
    if (isOpen && promotionId) {
      fetchReports()
    }
  }, [isOpen, promotionId])

  const fetchReports = async () => {
    setIsLoading(true)
    try {
      // Fetch statistics
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_promotion_stats', { promotion_id_param: promotionId })

      if (statsError) throw statsError

      if (statsData && statsData.length > 0) {
        setStats(statsData[0])
      }

      // Fetch detailed usage
      const { data: usageData, error: usageError } = await supabase
        .from('promotion_usage')
        .select(`
          id,
          user_id,
          discount_amount,
          used_at,
          profiles:user_id (
            first_name,
            last_name,
            phone
          )
        `)
        .eq('promotion_id', promotionId)
        .order('used_at', { ascending: false })

      if (usageError) throw usageError

      setUsage(usageData || [])
    } catch (err) {
      console.error('Error fetching promotion reports:', err)
      setError('ไม่สามารถโหลดข้อมูลรายงานได้')
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = () => {
    if (!stats || !usage.length) return

    const csvData = [
      ['วันที่ใช้', 'ชื่อผู้ใช้', 'เบอร์โทร', 'จำนวนส่วนลด'],
      ...usage.map(u => [
        new Date(u.used_at).toLocaleDateString('th-TH'),
        `${u.profiles?.first_name || ''} ${u.profiles?.last_name || ''}`.trim(),
        u.profiles?.phone || '',
        u.discount_amount.toString()
      ])
    ]

    const csvContent = csvData.map(row =>
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `promotion-${promotionCode}-report.csv`
    link.click()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <div>
            <h2 className="text-xl font-bold text-stone-900">รายงานการใช้โปรโมชั่น</h2>
            <p className="text-sm text-stone-500 mt-1">
              {promotionName} ({promotionCode})
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stats && usage.length > 0 && (
              <button
                onClick={exportData}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-2" />
                <p className="text-gray-600">กำลังโหลดข้อมูลรายงาน...</p>
              </div>
            </div>
          )}

          {/* Content */}
          {!isLoading && stats && (
            <>
              {/* Tabs */}
              <div className="flex space-x-1 mb-6 bg-stone-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === 'overview'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  ภาพรวม
                </button>
                <button
                  onClick={() => setActiveTab('usage')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === 'usage'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  รายละเอียดการใช้
                </button>
                <button
                  onClick={() => setActiveTab('chart')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === 'chart'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  กราฟ
                </button>
              </div>

              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-blue-600">
                          <Users className="w-8 h-8" />
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-900">{stats.total_usage.toLocaleString()}</div>
                          <div className="text-sm text-blue-600">ครั้ง</div>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-blue-800">การใช้งานทั้งหมด</div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-green-600">
                          <Star className="w-8 h-8" />
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-900">{stats.unique_users.toLocaleString()}</div>
                          <div className="text-sm text-green-600">คน</div>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-green-800">ผู้ใช้ไม่ซ้ำ</div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-amber-600">
                          <DollarSign className="w-8 h-8" />
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-amber-900">{formatCurrency(stats.total_discount)}</div>
                          <div className="text-sm text-amber-600">รวม</div>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-amber-800">ส่วนลดรวม</div>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-purple-600">
                          <TrendingUp className="w-8 h-8" />
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-purple-900">{formatCurrency(stats.avg_discount)}</div>
                          <div className="text-sm text-purple-600">เฉลี่ย</div>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-purple-800">ส่วนลดเฉลี่ย</div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  {stats.usage_by_date && stats.usage_by_date.length > 0 && (
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-stone-900 mb-4">การใช้งานรายวัน (30 วันล่าสุด)</h3>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {stats.usage_by_date.map((day, index) => (
                          <div key={index} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg">
                            <div className="flex items-center gap-3">
                              <Calendar className="w-4 h-4 text-stone-400" />
                              <span className="text-sm font-medium">{new Date(day.date).toLocaleDateString('th-TH')}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold">{day.count} ครั้ง</div>
                              <div className="text-xs text-stone-500">{formatCurrency(day.total_discount)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Usage Details Tab */}
              {activeTab === 'usage' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-stone-900">รายละเอียดการใช้งาน ({usage.length} รายการ)</h3>
                    <button
                      onClick={fetchReports}
                      className="p-2 text-stone-600 hover:text-stone-800 rounded-lg transition"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>

                  {usage.length === 0 ? (
                    <div className="text-center py-12 text-stone-500">
                      <Eye className="w-12 h-12 mx-auto mb-4 text-stone-400" />
                      <p className="text-lg font-medium mb-2">ยังไม่มีการใช้งาน</p>
                      <p className="text-sm">โปรโมชั่นนี้ยังไม่ได้ถูกใช้งาน</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-stone-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">วันที่ใช้</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">ผู้ใช้</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">เบอร์โทร</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase">ส่วนลด</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-200">
                            {usage.map((item, index) => (
                              <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-stone-50'}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">
                                  {formatDate(item.used_at)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900">
                                  {item.profiles ?
                                    `${item.profiles.first_name || ''} ${item.profiles.last_name || ''}`.trim() || 'ไม่ทราบชื่อ'
                                    : 'ไม่ทราบชื่อ'
                                  }
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                                  {item.profiles?.phone || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-900 text-right font-medium">
                                  {formatCurrency(item.discount_amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Chart Tab */}
              {activeTab === 'chart' && (
                <div>
                  <h3 className="text-lg font-semibold text-stone-900 mb-6">กราฟการใช้งานรายวัน</h3>

                  {stats.usage_by_date && stats.usage_by_date.length > 0 ? (
                    <div className="bg-white border border-stone-200 rounded-xl p-6">
                      <div className="space-y-4">
                        {stats.usage_by_date.map((day, index) => {
                          const maxUsage = Math.max(...stats.usage_by_date.map(d => d.count))
                          const widthPercent = maxUsage > 0 ? (day.count / maxUsage) * 100 : 0

                          return (
                            <div key={index} className="flex items-center space-x-4">
                              <div className="w-24 text-sm text-stone-600 flex-shrink-0">
                                {new Date(day.date).toLocaleDateString('th-TH', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                              <div className="flex-1 bg-stone-100 rounded-full h-6 relative">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                                  style={{ width: `${Math.max(widthPercent, 5)}%` }}
                                >
                                  {widthPercent > 15 && `${day.count} ครั้ง`}
                                </div>
                              </div>
                              <div className="w-20 text-sm text-stone-900 text-right flex-shrink-0">
                                {day.count} ครั้ง
                              </div>
                              <div className="w-24 text-sm text-stone-600 text-right flex-shrink-0">
                                {formatCurrency(day.total_discount)}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-stone-500">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 text-stone-400" />
                      <p className="text-lg font-medium mb-2">ไม่มีข้อมูลสำหรับสร้างกราฟ</p>
                      <p className="text-sm">เมื่อมีการใช้งานโปรโมชั่น กราฟจะแสดงที่นี่</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* No Data State */}
          {!isLoading && !stats && !error && (
            <div className="text-center py-12 text-stone-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-stone-400" />
              <p className="text-lg font-medium mb-2">ยังไม่มีข้อมูลการใช้งาน</p>
              <p className="text-sm">โปรโมชั่นนี้ยังไม่ได้ถูกใช้งาน</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end mt-6 pt-4 border-t border-stone-200">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-stone-600 text-white rounded-xl font-medium hover:bg-stone-700 transition"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}