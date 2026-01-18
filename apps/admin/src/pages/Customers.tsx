import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Eye, Edit, Trash2, MapPin, Phone, Mail, Calendar, ChevronRight } from 'lucide-react'

const customers = [
  {
    id: 'CUST001',
    name: 'สมชาย ใจดี',
    email: 'somchai@email.com',
    phone: '081-234-5678',
    totalBookings: 15,
    totalSpent: 24500,
    lastBooking: '2026-01-14',
    status: 'active',
  },
  {
    id: 'CUST002',
    name: 'วิภาดา สุขสันต์',
    email: 'wipada@email.com',
    phone: '082-345-6789',
    totalBookings: 8,
    totalSpent: 12800,
    lastBooking: '2026-01-10',
    status: 'active',
  },
  {
    id: 'CUST003',
    name: 'กิตติ เก่งการค้า',
    email: 'kitti@email.com',
    phone: '083-456-7890',
    totalBookings: 23,
    totalSpent: 45600,
    lastBooking: '2026-01-15',
    status: 'active',
  },
  {
    id: 'CUST004',
    name: 'มานี มีตา',
    email: 'manee@email.com',
    phone: '084-567-8901',
    totalBookings: 3,
    totalSpent: 3600,
    lastBooking: '2025-12-20',
    status: 'inactive',
  },
  {
    id: 'CUST005',
    name: 'ประยุทธ์ มั่งมี',
    email: 'prayut@email.com',
    phone: '085-678-9012',
    totalBookings: 31,
    totalSpent: 67800,
    lastBooking: '2026-01-13',
    status: 'active',
  },
]

function Customers() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      searchQuery === '' ||
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery)
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">จัดการลูกค้า</h1>
          <p className="text-stone-500">Customer Management</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <p className="text-2xl font-bold text-stone-900">{customers.length}</p>
          <p className="text-xs text-stone-500">ลูกค้าทั้งหมด</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <p className="text-2xl font-bold text-green-600">
            {customers.filter((c) => c.status === 'active').length}
          </p>
          <p className="text-xs text-stone-500">ลูกค้าที่ใช้งานอยู่</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <p className="text-2xl font-bold text-amber-700">
            ฿{customers.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString()}
          </p>
          <p className="text-xs text-stone-500">ยอดซื้อรวม</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-4 border border-stone-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร..."
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
            <option value="inactive">ไม่ใช้งาน</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="text-sm text-stone-500">
        พบ {filteredCustomers.length} ลูกค้า
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-stone-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">ลูกค้า</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">ติดต่อ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">การจอง</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">ยอดซื้อ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">จองล่าสุด</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-700 to-amber-800 rounded-full flex items-center justify-center text-white font-semibold">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-stone-900">{customer.name}</p>
                        <p className="text-xs text-stone-500">{customer.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-1 text-stone-600">
                        <Mail className="w-3 h-3" />
                        {customer.email}
                      </div>
                      <div className="flex items-center gap-1 text-stone-600">
                        <Phone className="w-3 h-3" />
                        {customer.phone}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-stone-600">{customer.totalBookings} ครั้ง</td>
                  <td className="py-3 px-4 text-sm font-medium text-amber-700">
                    ฿{customer.totalSpent.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-stone-600">{customer.lastBooking}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-stone-100 rounded-lg transition" title="ดูรายละเอียด">
                        <Eye className="w-4 h-4 text-stone-600" />
                      </button>
                      <button className="p-2 hover:bg-stone-100 rounded-lg transition" title="แก้ไข">
                        <Edit className="w-4 h-4 text-stone-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Customers
