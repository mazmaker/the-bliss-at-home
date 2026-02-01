import { useState } from 'react'
import { Search, Eye, Edit, Phone, Mail, Calendar, Download } from 'lucide-react'
import { useCustomers } from '../hooks/useCustomers'
import { Customer, CustomerStatus } from '../lib/customerQueries'
import { exportToCSV, exportToExcel } from '../utils/exportUtils'
import CustomerDetailModal from '../components/CustomerDetailModal'
import CustomerEditModal from '../components/CustomerEditModal'
import CustomerStats from '../components/CustomerStats'

function Customers() {
  const { customers, loading, error } = useCustomers()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | CustomerStatus>('all')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      searchQuery === '' ||
      customer.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery)
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleExportCSV = () => {
    const data = filteredCustomers.map((c) => ({
      'รหัสลูกค้า': c.id,
      'ชื่อ': c.full_name,
      'อีเมล': c.email || '',
      'เบอร์โทร': c.phone,
      'สถานะ': c.status,
      'จำนวนการจอง': c.total_bookings,
      'ยอดใช้จ่ายรวม': c.total_spent,
      'จองล่าสุด': c.last_booking_date || '',
      'วันที่สมัคร': new Date(c.created_at).toLocaleDateString('th-TH'),
    }))
    exportToCSV(data, 'customers')
  }

  const handleExportExcel = () => {
    const data = filteredCustomers.map((c) => ({
      'รหัสลูกค้า': c.id,
      'ชื่อ': c.full_name,
      'อีเมล': c.email || '',
      'เบอร์โทร': c.phone,
      'สถานะ': c.status,
      'จำนวนการจอง': c.total_bookings,
      'ยอดใช้จ่ายรวม': c.total_spent,
      'จองล่าสุด': c.last_booking_date || '',
      'วันที่สมัคร': new Date(c.created_at).toLocaleDateString('th-TH'),
    }))
    exportToExcel(data, 'customers')
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusBadge = (status: CustomerStatus) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      suspended: 'bg-yellow-100 text-yellow-700',
      banned: 'bg-red-100 text-red-700',
    }
    const labels = {
      active: 'ใช้งานอยู่',
      suspended: 'ระงับชั่วคราว',
      banned: 'ระงับถาวร',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 mx-auto mb-4" />
          <p className="text-stone-600">กำลังโหลดข้อมูลลูกค้า...</p>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">จัดการลูกค้า</h1>
          <p className="text-stone-500">Customer Management</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white border border-stone-300 rounded-xl text-stone-700 hover:bg-stone-50 transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-amber-700 text-white rounded-xl hover:bg-amber-800 transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Customer Statistics */}
      <CustomerStats />

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
            <option value="suspended">ระงับชั่วคราว</option>
            <option value="banned">ระงับถาวร</option>
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
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">วันที่สมัคร</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">สถานะ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-700 to-amber-800 rounded-full flex items-center justify-center text-white font-semibold">
                        {customer.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-stone-900">{customer.full_name}</p>
                        <p className="text-xs text-stone-500">{customer.id.substring(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-1 text-stone-600">
                        <Mail className="w-3 h-3" />
                        {customer.email || '-'}
                      </div>
                      <div className="flex items-center gap-1 text-stone-600">
                        <Phone className="w-3 h-3" />
                        {customer.phone}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-stone-600">{customer.total_bookings} ครั้ง</td>
                  <td className="py-3 px-4 text-sm font-medium text-amber-700">
                    ฿{Number(customer.total_spent).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-sm text-stone-600">
                      <Calendar className="w-3 h-3" />
                      {formatDate(customer.created_at)}
                    </div>
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(customer.status)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedCustomer(customer)}
                        className="p-2 hover:bg-stone-100 rounded-lg transition"
                        title="ดูรายละเอียด"
                      >
                        <Eye className="w-4 h-4 text-stone-600" />
                      </button>
                      <button
                        onClick={() => setEditingCustomer(customer)}
                        className="p-2 hover:bg-stone-100 rounded-lg transition"
                        title="แก้ไข"
                      >
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

      {/* Modals */}
      {selectedCustomer && (
        <CustomerDetailModal
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          customer={selectedCustomer}
        />
      )}

      {editingCustomer && (
        <CustomerEditModal
          isOpen={!!editingCustomer}
          onClose={() => setEditingCustomer(null)}
          customer={editingCustomer}
          onSuccess={() => window.location.reload()}
        />
      )}
    </div>
  )
}

export default Customers
