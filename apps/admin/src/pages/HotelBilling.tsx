import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Download,
  Filter,
  FileText,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Mail,
  Printer,
  Eye,
  Plus,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react'
import { exportToCSV, exportToExcel, exportToPDF, formatInvoicesForExport } from '../utils/exportUtils'
import { useHotel, useHotelInvoices, useHotelBookings } from '../hooks/useHotels'
import { InvoiceForm } from '../components/InvoiceForm'
import { InvoiceDetailModal } from '../components/InvoiceDetailModal'
import type { HotelInvoice } from '../lib/hotelQueries'


export default function HotelBilling() {
  const { id } = useParams<{ id: string }>()
  const [periodFilter, setPeriodFilter] = useState<'all' | 'weekly' | 'monthly'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled'>('all')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<HotelInvoice | null>(null)

  const { hotel } = useHotel(id)
  const { invoices, loading, error, refetch } = useHotelInvoices(id)
  const { bookings } = useHotelBookings(id)

  const filteredInvoices = (invoices || []).filter((inv) => {
    const matchesPeriod = periodFilter === 'all' || inv.period_type === periodFilter
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter
    return matchesPeriod && matchesStatus
  })

  const getStatusBadge = (status: HotelInvoice['status']) => {
    const badges = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'ร่าง', icon: FileText },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'รอชำระ', icon: AlertTriangle },
      paid: { bg: 'bg-green-100', text: 'text-green-700', label: 'จ่ายแล้ว', icon: CheckCircle },
      overdue: { bg: 'bg-red-100', text: 'text-red-700', label: 'เกินกำหนด', icon: XCircle },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'ยกเลิก', icon: XCircle },
    }
    const badge = badges[status]
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="h-3 w-3" />
        {badge.label}
      </span>
    )
  }

  const getPeriodLabel = (type: 'weekly' | 'monthly') => {
    return type === 'weekly' ? 'รายสัปดาห์' : 'รายเดือน'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + Number(inv.total_revenue), 0)
  const totalCommission = filteredInvoices.reduce((sum, inv) => sum + Number(inv.commission_amount), 0)
  const paidAmount = filteredInvoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.commission_amount), 0)
  const pendingAmount = filteredInvoices
    .filter((inv) => inv.status === 'pending')
    .reduce((sum, inv) => sum + Number(inv.commission_amount), 0)

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const formattedData = formatInvoicesForExport(filteredInvoices)
    const filename = `invoices-hotel-${id}-${new Date().toISOString().split('T')[0]}`

    switch (format) {
      case 'csv':
        exportToCSV(formattedData, filename)
        break
      case 'excel':
        exportToExcel(formattedData, filename, 'Invoices')
        break
      case 'pdf':
        exportToPDF(formattedData, filename, 'รายงานบิล/ใบแจ้งหนี้')
        break
    }
    setShowExportMenu(false)
  }

  const handleViewInvoice = (invoice: HotelInvoice) => {
    setSelectedInvoice(invoice)
  }

  const handleDownloadInvoicePDF = (invoice: HotelInvoice) => {
    const data = formatInvoicesForExport([invoice])
    const filename = `invoice-${invoice.invoice_number}`
    exportToPDF(data, filename, 'ใบแจ้งหนี้')
  }

  const handlePrintInvoice = (invoice: HotelInvoice) => {
    // Open detail modal and trigger print
    setSelectedInvoice(invoice)
    setTimeout(() => {
      window.print()
    }, 300)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/admin/hotels/${id}`}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">บิล/ใบแจ้งหนี้</h1>
            <p className="text-gray-600">รวมบิลรายสัปดาห์และรายเดือน</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50">
            <Mail className="h-4 w-4" />
            ส่งอีเมล
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border bg-white shadow-lg z-10">
                <button
                  onClick={() => handleExport('csv')}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <FileText className="h-4 w-4" />
                  Export to CSV
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export to Excel
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <Printer className="h-4 w-4" />
                  Export to PDF
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            สร้างบิลใหม่
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">รายได้ทั้งหมด</p>
              <p className="text-2xl font-bold text-gray-900">
                ฿{totalRevenue.toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-10 w-10 text-blue-600" />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">คอมมิชชั่นทั้งหมด</p>
              <p className="text-2xl font-bold text-blue-600">
                ฿{totalCommission.toLocaleString()}
              </p>
            </div>
            <FileText className="h-10 w-10 text-blue-600" />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">จ่ายแล้ว</p>
              <p className="text-2xl font-bold text-green-600">
                ฿{paidAmount.toLocaleString()}
              </p>
            </div>
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">รอชำระ</p>
              <p className="text-2xl font-bold text-yellow-600">
                ฿{pendingAmount.toLocaleString()}
              </p>
            </div>
            <AlertTriangle className="h-10 w-10 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-lg bg-white p-4 shadow md:flex-row">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">กรองข้อมูล:</span>
        </div>
        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value as any)}
          className="rounded-lg border px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">ช่วงเวลาทั้งหมด</option>
          <option value="weekly">รายสัปดาห์</option>
          <option value="monthly">รายเดือน</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rounded-lg border px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">สถานะทั้งหมด</option>
          <option value="draft">ร่าง</option>
          <option value="pending">รอชำระ</option>
          <option value="paid">จ่ายแล้ว</option>
          <option value="overdue">เกินกำหนด</option>
          <option value="cancelled">ยกเลิก</option>
        </select>
      </div>

      {/* Invoices Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">เลขที่บิล</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">ช่วงเวลา</th>
                <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">ประเภท</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">จำนวนการจอง</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">รายได้</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">คอมมิชชั่น</th>
                <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">สถานะ</th>
                <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">วันที่ครบกำหนด</th>
                <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">การกระทำ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-gray-500">ไม่พบข้อมูลบิล</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{invoice.invoice_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                        {getPeriodLabel(invoice.period_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      {invoice.total_bookings}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      ฿{Number(invoice.total_revenue).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-blue-600">
                      ฿{Number(invoice.commission_amount).toLocaleString()}
                      <span className="ml-1 text-xs text-gray-500">({Number(invoice.commission_rate)}%)</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {formatDate(invoice.due_date)}
                      {invoice.paid_date && (
                        <div className="text-xs text-green-600">จ่าย: {formatDate(invoice.paid_date)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleViewInvoice(invoice)}
                          className="rounded p-1 text-blue-600 hover:bg-blue-50"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadInvoicePDF(invoice)}
                          className="rounded p-1 text-gray-600 hover:bg-gray-100"
                          title="ดาวน์โหลด PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handlePrintInvoice(invoice)}
                          className="rounded p-1 text-gray-600 hover:bg-gray-100"
                          title="พิมพ์"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Form Modal */}
      {hotel && (
        <InvoiceForm
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          onSuccess={() => {
            setIsInvoiceModalOpen(false)
            refetch()
          }}
          hotelId={id!}
          commissionRate={Number(hotel.commission_rate)}
          invoices={invoices || []}
          bookings={bookings || []}
        />
      )}

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        hotelName={hotel?.name_th}
      />
    </div>
  )
}
