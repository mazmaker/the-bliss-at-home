import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, Eye, Edit, Building, MapPin, Phone, Star, Check, X, Ban, AlertTriangle, Loader2, Key, Shield } from 'lucide-react'
import { HotelForm } from '../components/HotelForm'
import { useHotels, useTotalMonthlyRevenue } from '../hooks/useHotels'
import { updateHotelStatus } from '../lib/hotelQueries'

function Hotels() {
  const { hotels, loading, error, refetch } = useHotels()
  const { revenue: monthlyRevenue, loading: revenueLoading } = useTotalMonthlyRevenue()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive' | 'suspended' | 'banned'>('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingHotel, setEditingHotel] = useState<any>(null)
  const [resetPasswordHotel, setResetPasswordHotel] = useState<any>(null)
  const [isResettingPassword, setIsResettingPassword] = useState(false)

  const filteredHotels = hotels.filter((hotel) => {
    const matchesSearch =
      searchQuery === '' ||
      hotel.name_th.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hotel.name_en.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || hotel.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleApproveHotel = async (hotelId: string) => {
    try {
      await updateHotelStatus(hotelId, 'active')
      refetch()
    } catch (err) {
      console.error('Failed to approve hotel:', err)
      alert('เกิดข้อผิดพลาดในการอนุมัติโรงแรม')
    }
  }

  const handleRejectHotel = async (hotelId: string) => {
    try {
      await updateHotelStatus(hotelId, 'inactive')
      refetch()
    } catch (err) {
      console.error('Failed to reject hotel:', err)
      alert('เกิดข้อผิดพลาดในการปฏิเสธโรงแรม')
    }
  }

  const handleResetPassword = async (hotel: any) => {
    setIsResettingPassword(true)
    try {
      const response = await fetch('http://localhost:3000/api/hotels/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_ADMIN_API_TOKEN || 'admin-token'}`
        },
        body: JSON.stringify({
          hotelId: hotel.id
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน')
      }

      alert(`รีเซ็ตรหัสผ่านสำเร็จ!\n\nรหัสผ่านชั่วคราว: ${result.data.temporaryPassword}\n\nกรุณาส่งรหัสผ่านใหม่ให้กับโรงแรม "${hotel.name_th}"`)
      setResetPasswordHotel(null)
    } catch (error: any) {
      console.error('Reset password error:', error)
      alert(error.message || 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน')
    } finally {
      setIsResettingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-amber-700" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-600">เกิดข้อผิดพลาด: {error.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800"
        >
          ลองอีกครั้ง
        </button>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      inactive: 'bg-stone-100 text-stone-600',
      suspended: 'bg-orange-100 text-orange-700',
      banned: 'bg-red-100 text-red-700',
    }
    const labels = {
      active: 'ใช้งานอยู่',
      pending: 'รออนุมัติ',
      inactive: 'ไม่ใช้งาน',
      suspended: 'ระงับการใช้งาน',
      banned: 'ถูกแบน',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status as keyof typeof badges] || badges.inactive}`}>
        {labels[status as keyof typeof labels] || 'ไม่ทราบสถานะ'}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">จัดการโรงแรม</h1>
          <p className="text-stone-500">Hotel Partner Management</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition"
        >
          <Plus className="w-5 h-5" />
          เพิ่มโรงแรมใหม่
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">{hotels.length}</p>
              <p className="text-xs text-stone-500">โรงแรมทั้งหมด</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <p className="text-2xl font-bold text-green-600">
            {hotels.filter((h) => h.status === 'active').length}
          </p>
          <p className="text-xs text-stone-500">ใช้งานอยู่</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <p className="text-2xl font-bold text-amber-700">
            {hotels.filter((h) => h.status === 'pending').length}
          </p>
          <p className="text-xs text-stone-500">รออนุมัติ</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <p className="text-2xl font-bold text-stone-900">
            {revenueLoading ? (
              <Loader2 className="w-6 h-6 animate-spin inline-block" />
            ) : (
              `฿${monthlyRevenue.toLocaleString()}`
            )}
          </p>
          <p className="text-xs text-stone-500">รายได้ทั้งหมด</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-4 border border-stone-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อโรงแรม..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-100 border-0 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 bg-stone-100 border-0 rounded-xl focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="active">ใช้งานอยู่</option>
            <option value="pending">รออนุมัติ</option>
            <option value="inactive">ไม่ใช้งาน</option>
            <option value="suspended">ระงับการใช้งาน</option>
            <option value="banned">ถูกแบน</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="text-sm text-stone-500">
        พบ {filteredHotels.length} โรงแรม
      </div>

      {/* Hotels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredHotels.map((hotel) => (
          <div key={hotel.id} className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100 hover:shadow-xl transition">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-stone-700 to-stone-800 rounded-xl flex items-center justify-center">
                  <Building className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900">{hotel.name_th}</h3>
                  <p className="text-sm text-stone-500">{hotel.name_en}</p>
                </div>
              </div>
              {getStatusBadge(hotel.status)}
            </div>

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex items-center gap-2 text-stone-600">
                <span className="font-medium">ผู้ติดต่อ:</span>
                <span>{hotel.contact_person}</span>
              </div>
              <div className="flex items-center gap-2 text-stone-600">
                <Phone className="w-4 h-4" />
                <span>{hotel.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-stone-600">
                <MapPin className="w-4 h-4" />
                <span className="line-clamp-1">{hotel.address}</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 p-4 bg-stone-50 rounded-xl mb-4">
              <div className="text-center">
                <p className="text-lg font-bold text-stone-900">{(hotel as any).totalBookings ?? 0}</p>
                <p className="text-xs text-stone-500">การจอง</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-700">
                  ฿{((hotel as any).monthlyRevenue ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-stone-500">รายได้/เดือน</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-stone-900">{Number(hotel.commission_rate)}%</p>
                <p className="text-xs text-stone-500">คอมมิชชั่น</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-700">{Number((hotel as any).discount_rate || 0)}%</p>
                <p className="text-xs text-stone-500">ส่วนลด</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-sm font-medium text-stone-700">{Number(hotel.rating).toFixed(1)}</span>
              <span className="text-xs text-stone-400">คะแนน</span>
            </div>

            <div className="flex gap-2">
              <Link
                to={`/admin/hotels/${hotel.id}`}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-stone-100 text-stone-700 text-sm rounded-lg hover:bg-stone-200 transition"
              >
                <Eye className="w-4 h-4" />
                ดูรายละเอียด
              </Link>
              <button
                onClick={() => setEditingHotel(hotel)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-stone-100 text-stone-700 text-sm rounded-lg hover:bg-stone-200 transition"
              >
                <Edit className="w-4 h-4" />
                แก้ไข
              </button>
              <button
                onClick={() => setResetPasswordHotel(hotel)}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition"
                title="รีเซ็ตรหัสผ่าน"
              >
                <Key className="w-4 h-4" />
              </button>
              {hotel.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleApproveHotel(hotel.id)}
                    className="flex items-center justify-center px-3 py-2 bg-green-100 text-green-700 text-sm rounded-lg hover:bg-green-200 transition"
                    title="อนุมัติ"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRejectHotel(hotel.id)}
                    className="flex items-center justify-center px-3 py-2 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition"
                    title="ปฏิเสธ"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Hotel Modal */}
      <HotelForm
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false)
          refetch()
        }}
      />

      {/* Edit Hotel Modal */}
      <HotelForm
        isOpen={!!editingHotel}
        onClose={() => setEditingHotel(null)}
        onSuccess={() => {
          setEditingHotel(null)
          refetch()
        }}
        editData={editingHotel}
      />

      {/* Reset Password Confirmation Modal */}
      {resetPasswordHotel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-blue-100 rounded-full">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-stone-900">รีเซ็ตรหัสผ่าน</h3>
                <p className="text-stone-600 text-sm">
                  {resetPasswordHotel.name_th}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-800 text-sm">
                  <strong>คำเตือน:</strong> การรีเซ็ตรหัสผ่านจะสร้างรหัสผ่านชั่วคราวใหม่
                  และบังคับให้โรงแรมเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งถัดไป
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setResetPasswordHotel(null)}
                className="flex-1 px-4 py-2 text-stone-700 bg-stone-100 rounded-lg hover:bg-stone-200 transition"
                disabled={isResettingPassword}
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleResetPassword(resetPasswordHotel)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                disabled={isResettingPassword}
              >
                {isResettingPassword ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังรีเซ็ต...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Key className="w-4 h-4" />
                    รีเซ็ตรหัสผ่าน
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Hotels
