import { TrendingUp, Users, DollarSign, RefreshCw, UserCheck } from 'lucide-react'
import { useCustomerStatistics } from '../hooks/useCustomers'

function CustomerStats() {
  const { stats, loading, error } = useCustomerStatistics()

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700 mx-auto mb-2" />
            <p className="text-sm text-stone-600">กำลังโหลดสถิติ...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-red-800">เกิดข้อผิดพลาด: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-stone-900">สถิติพฤติกรรมลูกค้า</h3>
        <p className="text-sm text-stone-500">Customer Behavior Analytics</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-stone-500">ลูกค้าทั้งหมด</p>
              <p className="text-2xl font-bold text-stone-900">{stats.total.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
              Active: {stats.active}
            </span>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
              Suspended: {stats.suspended}
            </span>
            <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
              Banned: {stats.banned}
            </span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-stone-500">รายได้รวมทั้งหมด</p>
              <p className="text-2xl font-bold text-green-600">
                ฿{stats.total_revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
          <p className="text-xs text-stone-600">
            จากลูกค้าทั้งหมด {stats.total.toLocaleString()} คน
          </p>
        </div>

        {/* Repeat Customers */}
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-stone-500">ลูกค้าจองซ้ำ</p>
              <p className="text-2xl font-bold text-purple-600">
                {stats.repeat_customers.toLocaleString()}
              </p>
            </div>
          </div>
          <p className="text-xs text-stone-600">
            จาก {stats.total.toLocaleString()} คนทั้งหมด
          </p>
        </div>

        {/* Repeat Booking Rate */}
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-stone-500">อัตราการจองซ้ำ</p>
              <p className="text-2xl font-bold text-amber-600">
                {stats.repeat_rate.toFixed(1)}%
              </p>
            </div>
          </div>
          <p className="text-xs text-stone-600">
            Repeat Booking Rate
          </p>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Average Lifetime Value */}
        <div className="bg-gradient-to-br from-amber-700 to-amber-800 rounded-xl shadow p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm opacity-90">Customer Lifetime Value</p>
              <p className="text-xs opacity-75">มูลค่าเฉลี่ยต่อลูกค้า 1 คน</p>
            </div>
          </div>
          <p className="text-4xl font-bold mb-2">
            ฿{stats.average_lifetime_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-sm opacity-90">
            ค่าใช้จ่ายเฉลี่ยของลูกค้าแต่ละคนตลอดอายุการใช้บริการ
          </p>
        </div>

        {/* Insights */}
        <div className="bg-white rounded-xl shadow p-6 border border-stone-100">
          <h4 className="font-semibold text-stone-900 mb-4">ข้อมูลเชิงลึก (Insights)</h4>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
              <div>
                <p className="text-sm font-medium text-stone-900">
                  {((stats.active / stats.total) * 100).toFixed(1)}% ของลูกค้าเป็น Active
                </p>
                <p className="text-xs text-stone-500">
                  ลูกค้าส่วนใหญ่ยังคงใช้บริการอยู่
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
              <div>
                <p className="text-sm font-medium text-stone-900">
                  {stats.repeat_rate.toFixed(1)}% อัตราการจองซ้ำ
                </p>
                <p className="text-xs text-stone-500">
                  {stats.repeat_rate > 50
                    ? 'ลูกค้ามีความพึงพอใจสูง มีการกลับมาใช้บริการซ้ำเป็นจำนวนมาก'
                    : 'ควรปรับปรุงการบริการเพื่อเพิ่มอัตราการกลับมาใช้บริการซ้ำ'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5" />
              <div>
                <p className="text-sm font-medium text-stone-900">
                  CLV เฉลี่ย ฿{stats.average_lifetime_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-stone-500">
                  สามารถใช้เป็นข้อมูลในการวางแผนการตลาดและโปรโมชั่น
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerStats
