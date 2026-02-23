import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Building,
  Phone,
  Mail,
  MapPin,
  Globe,
  DollarSign,
  CreditCard,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  Calendar,
  TrendingUp,
  FileText,
  Download,
  User,
  Percent,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { HotelForm } from '../components/HotelForm'
import { useHotel, useHotelInvoices } from '../hooks/useHotels'
import { updateHotelStatus } from '../lib/hotelQueries'
import type { Hotel } from '../lib/hotelQueries'


export default function HotelDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const { hotel, loading, error, refetch } = useHotel(id)
  const { invoices, loading: invoicesLoading } = useHotelInvoices(id)

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'ใช้งานอยู่', icon: CheckCircle },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'รออนุมัติ', icon: AlertTriangle },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'ไม่ใช้งาน', icon: XCircle },
      suspended: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'ระงับการใช้งาน', icon: Ban },
      banned: { bg: 'bg-red-100', text: 'text-red-700', label: 'ถูกแบน', icon: XCircle },
    }
    const badge = badges[status as keyof typeof badges] || badges.inactive
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="h-4 w-4" />
        {badge.label}
      </span>
    )
  }

  const handleStatusChange = async (newStatus: Hotel['status']) => {
    if (!hotel) return

    try {
      await updateHotelStatus(hotel.id, newStatus)
      refetch()
    } catch (err) {
      console.error('Error updating hotel status:', err)
      alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะโรงแรม')
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-amber-700" />
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-16 w-16 text-red-500" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">เกิดข้อผิดพลาด</h3>
          <p className="mt-2 text-gray-600">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-lg bg-amber-700 px-4 py-2 text-white hover:bg-amber-800"
          >
            ลองอีกครั้ง
          </button>
        </div>
      </div>
    )
  }

  if (!hotel) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Building className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">ไม่พบข้อมูลโรงแรม</h3>
          <Link to="/admin/hotels" className="mt-4 inline-block text-blue-600 hover:underline">
            ← กลับไปหน้ารายการโรงแรม
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/hotels')}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{hotel.name_th}</h1>
            <p className="text-gray-600">{hotel.name_en}</p>
          </div>
          {getStatusBadge(hotel.status)}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Edit className="h-4 w-4" />
            แก้ไขข้อมูล
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Hotel Information */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic Info Card */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Building className="h-5 w-5" />
              ข้อมูลพื้นฐาน
            </h2>
            {hotel.description && (
              <p className="mb-4 text-gray-600">{hotel.description}</p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">ชื่อภาษาไทย</p>
                <p className="font-medium">{hotel.name_th}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">ชื่อภาษาอังกฤษ</p>
                <p className="font-medium">{hotel.name_en}</p>
              </div>
              {hotel.website && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">เว็บไซต์</p>
                  <a
                    href={hotel.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-medium text-blue-600 hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    {hotel.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Contact Info Card */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <User className="h-5 w-5" />
              ข้อมูลการติดต่อ
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">ผู้ติดต่อ</p>
                  <p className="font-medium">{hotel.contact_person}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">เบอร์โทรศัพท์</p>
                  <a href={`tel:${hotel.phone}`} className="font-medium text-blue-600 hover:underline">
                    {hotel.phone}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">อีเมล</p>
                  <a href={`mailto:${hotel.email}`} className="font-medium text-blue-600 hover:underline">
                    {hotel.email}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Location Card with Google Maps */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <MapPin className="h-5 w-5" />
              ที่ตั้ง
            </h2>
            <p className="mb-4 text-gray-700">{hotel.address}</p>

            {/* Google Maps */}
            {hotel.latitude && hotel.longitude ? (
              <div className="overflow-hidden rounded-lg border">
                <iframe
                  width="100%"
                  height="300"
                  frameBorder="0"
                  style={{ border: 0 }}
                  src={`https://www.google.com/maps?q=${hotel.latitude},${hotel.longitude}&output=embed`}
                  allowFullScreen
                  title="Hotel Location"
                ></iframe>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg bg-gray-100">
                <p className="text-gray-500">ไม่มีข้อมูลตำแหน่งบนแผนที่</p>
              </div>
            )}

            {hotel.latitude && hotel.longitude && (
              <div className="mt-2 text-sm text-gray-500">
                พิกัด: {hotel.latitude}, {hotel.longitude}
              </div>
            )}
          </div>

          {/* Payment Information Card */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <CreditCard className="h-5 w-5" />
              ข้อมูลการชำระเงิน
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {hotel.bank_name && (
                <div>
                  <p className="text-sm text-gray-500">ธนาคาร</p>
                  <p className="font-medium">{hotel.bank_name}</p>
                </div>
              )}
              {hotel.bank_account_number && (
                <div>
                  <p className="text-sm text-gray-500">เลขที่บัญชี</p>
                  <p className="font-medium font-mono">{hotel.bank_account_number}</p>
                </div>
              )}
              {hotel.bank_account_name && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">ชื่อบัญชี</p>
                  <p className="font-medium">{hotel.bank_account_name}</p>
                </div>
              )}
              {hotel.tax_id && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">เลขประจำตัวผู้เสียภาษี</p>
                  <p className="font-medium font-mono">{hotel.tax_id}</p>
                </div>
              )}
              {!hotel.bank_name && !hotel.bank_account_number && (
                <div className="md:col-span-2">
                  <p className="text-gray-500">ยังไม่มีข้อมูลการชำระเงิน</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Stats & Actions */}
        <div className="space-y-6">
          {/* Stats Cards - 4 Columns */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="grid grid-cols-4 gap-4">
              {/* การจอง */}
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {hotel.total_bookings || 0}
                </div>
                <p className="text-sm text-gray-500">การจอง</p>
              </div>

              {/* รายได้/เดือน */}
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  ฿{hotel.monthly_revenue?.toLocaleString() || 0}
                </div>
                <p className="text-sm text-gray-500">รายได้/เดือน</p>
              </div>

              {/* คอมมิชชั่น */}
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {hotel.commission_rate}%
                </div>
                <p className="text-sm text-gray-500">คอมมิชชั่น</p>
              </div>

              {/* ส่วนลด */}
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {hotel.discount_rate || 0}%
                </div>
                <p className="text-sm text-gray-500">ส่วนลด</p>
              </div>
            </div>
          </div>

          {/* Status Management */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 font-semibold text-gray-900">จัดการสถานะ</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleStatusChange('active')}
                className="flex w-full items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-green-700 hover:bg-green-100"
                disabled={hotel.status === 'active'}
              >
                <CheckCircle className="h-4 w-4" />
                เปิดใช้งาน
              </button>
              <button
                onClick={() => handleStatusChange('suspended')}
                className="flex w-full items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-orange-700 hover:bg-orange-100"
                disabled={hotel.status === 'suspended'}
              >
                <AlertTriangle className="h-4 w-4" />
                ระงับการใช้งาน
              </button>
              <button
                onClick={() => handleStatusChange('banned')}
                className="flex w-full items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700 hover:bg-red-100"
                disabled={hotel.status === 'banned'}
              >
                <Ban className="h-4 w-4" />
                แบนถาวร
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 font-semibold text-gray-900">ลิงก์ด่วน</h3>
            <div className="space-y-2">
              <Link
                to={`/admin/hotels/${hotel.id}/billing`}
                className="flex items-center gap-2 rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                <FileText className="h-4 w-4" />
                ดูบิล/ใบแจ้งหนี้
              </Link>
              <Link
                to={`/admin/hotels/${hotel.id}/payments`}
                className="flex items-center gap-2 rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                <DollarSign className="h-4 w-4" />
                ประวัติการชำระเงิน
              </Link>
              <Link
                to={`/admin/hotels/${hotel.id}/bookings`}
                className="flex items-center gap-2 rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                <Calendar className="h-4 w-4" />
                รายการจองของโรงแรม
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Section */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <FileText className="h-5 w-5" />
            บิล/ใบแจ้งหนี้ล่าสุด
          </h2>
          <Link
            to={`/admin/hotels/${hotel.id}/billing`}
            className="text-sm text-blue-600 hover:underline"
          >
            ดูทั้งหมด →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">เลขที่บิล</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ช่วงเวลา</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">ยอดรวม</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">คอมมิชชั่น</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">สถานะ</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">วันที่จ่าย</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">การกระทำ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoicesLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-700" />
                  </td>
                </tr>
              ) : invoices && invoices.length > 0 ? (
                invoices.slice(0, 5).map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{invoice.invoice_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(invoice.period_start).toLocaleDateString('th-TH')} - {new Date(invoice.period_end).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      ฿{Number(invoice.total_revenue).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-blue-600">
                      ฿{Number(invoice.commission_amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {invoice.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                          <CheckCircle className="h-3 w-3" />
                          จ่ายแล้ว
                        </span>
                      ) : invoice.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                          <AlertTriangle className="h-3 w-3" />
                          รอชำระ
                        </span>
                      ) : invoice.status === 'overdue' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                          <XCircle className="h-3 w-3" />
                          เกินกำหนด
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                          {invoice.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {invoice.paid_date ? new Date(invoice.paid_date).toLocaleDateString('th-TH') : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                        <Download className="h-4 w-4" />
                        ดาวน์โหลด
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    ยังไม่มีบิล/ใบแจ้งหนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <HotelForm
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          refetch()
          setIsEditModalOpen(false)
        }}
        editData={hotel || undefined}
      />
    </div>
  )
}
