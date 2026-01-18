import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, Eye, Edit, Building, MapPin, Phone, Star, Check, X } from 'lucide-react'

const hotels = [
  {
    id: 'HTL001',
    name: 'โรงแรมฮิลตัน อยุธยา',
    nameEn: 'Hilton Bangkok',
    contactPerson: 'สมศรี มั่งมี',
    email: 'reservations@hilton.com',
    phone: '02-123-4567',
    address: '123 ถนนสุขุมวิทท่าพระยา เขตปทุมวัน',
    totalBookings: 156,
    monthlyRevenue: 245000,
    commission: 20,
    status: 'active',
    rating: 4.8,
  },
  {
    id: 'HTL002',
    name: 'รีสอร์ทในฝัน',
    nameEn: 'Nimman Resort',
    contactPerson: 'วิชัย รวยมั่ง',
    email: 'booking@nimman.com',
    phone: '053-123-456',
    address: '456 ถนนนิมมาเหมือง เชียงใหม่',
    totalBookings: 89,
    monthlyRevenue: 156000,
    commission: 15,
    status: 'active',
    rating: 4.9,
  },
  {
    id: 'HTL003',
    name: 'โรงแรมดุสิต ธานี',
    nameEn: 'Dusit Thani',
    contactPerson: 'สมหมาย ร่ำรวย',
    email: 'info@dusit.com',
    phone: '02-987-6543',
    address: '789 ถนะราชดำเนินงาน ปทุมวัน',
    totalBookings: 234,
    monthlyRevenue: 378000,
    commission: 25,
    status: 'active',
    rating: 4.7,
  },
  {
    id: 'HTL004',
    name: 'เซ็นทรัล พลาซ่า',
    nameEn: 'Central Plaza',
    contactPerson: 'กานดา บริการดี',
    email: 'booking@centralplaza.com',
    phone: '02-456-7890',
    address: '321 ถนนพหลโยธิน ลาดพร้าว',
    totalBookings: 45,
    monthlyRevenue: 78000,
    commission: 18,
    status: 'pending',
    rating: 4.5,
  },
]

function Hotels() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all')

  const filteredHotels = hotels.filter((hotel) => {
    const matchesSearch =
      searchQuery === '' ||
      hotel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hotel.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || hotel.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      inactive: 'bg-stone-100 text-stone-600',
    }
    const labels = {
      active: 'ใช้งานอยู่',
      pending: 'รออนุมัติ',
      inactive: 'ระงับ',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
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
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition">
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
            ฿{hotels.reduce((sum, h) => sum + h.monthlyRevenue, 0).toLocaleString()}
          </p>
          <p className="text-xs text-stone-500">รายได้ต่อเดือน</p>
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
            <option value="inactive">ระงับ</option>
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
                  <h3 className="font-semibold text-stone-900">{hotel.name}</h3>
                  <p className="text-sm text-stone-500">{hotel.nameEn}</p>
                </div>
              </div>
              {getStatusBadge(hotel.status)}
            </div>

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex items-center gap-2 text-stone-600">
                <span className="font-medium">ผู้ติดต่อ:</span>
                <span>{hotel.contactPerson}</span>
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

            <div className="grid grid-cols-3 gap-4 p-4 bg-stone-50 rounded-xl mb-4">
              <div className="text-center">
                <p className="text-lg font-bold text-stone-900">{hotel.totalBookings}</p>
                <p className="text-xs text-stone-500">การจอง</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-700">
                  ฿{hotel.monthlyRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-stone-500">รายได้/เดือน</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-stone-900">{hotel.commission}%</p>
                <p className="text-xs text-stone-500">ส่วนลด</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-sm font-medium text-stone-700">{hotel.rating}</span>
              <span className="text-xs text-stone-400">คะแนน</span>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-stone-100 text-stone-700 text-sm rounded-lg hover:bg-stone-200 transition">
                <Eye className="w-4 h-4" />
                ดูรายละเอียด
              </button>
              <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-stone-100 text-stone-700 text-sm rounded-lg hover:bg-stone-200 transition">
                <Edit className="w-4 h-4" />
                แก้ไข
              </button>
              {hotel.status === 'pending' && (
                <>
                  <button className="flex items-center justify-center px-3 py-2 bg-green-100 text-green-700 text-sm rounded-lg hover:bg-green-200 transition">
                    <Check className="w-4 h-4" />
                  </button>
                  <button className="flex items-center justify-center px-3 py-2 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition">
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Hotels
