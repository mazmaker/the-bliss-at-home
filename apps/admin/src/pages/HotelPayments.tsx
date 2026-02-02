import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  DollarSign,
  CreditCard,
  Calendar,
  TrendingUp,
  Download,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Eye,
  Receipt,
  FileText,
  FileSpreadsheet,
  Printer,
  Loader2,
  Plus,
} from 'lucide-react'
import { exportToCSV, exportToExcel, exportToPDF, formatPaymentsForExport } from '../utils/exportUtils'
import { useHotelPayments, useHotelInvoices } from '../hooks/useHotels'
import { PaymentForm } from '../components/PaymentForm'
import type { HotelPayment } from '../lib/hotelQueries'


export default function HotelPayments() {
  const { id } = useParams<{ id: string }>()
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'failed' | 'refunded'>('all')
  const [methodFilter, setMethodFilter] = useState<'all' | 'bank_transfer' | 'cash' | 'cheque' | 'online'>('all')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

  const { payments, loading, error, refetch } = useHotelPayments(id)
  const { invoices } = useHotelInvoices(id)

  const filteredPayments = (payments || []).filter((payment) => {
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter
    const matchesMethod = methodFilter === 'all' || payment.payment_method === methodFilter
    return matchesStatus && matchesMethod
  })

  const getStatusBadge = (status: HotelPayment['status']) => {
    const badges = {
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'สำเร็จ', icon: CheckCircle },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'รอตรวจสอบ', icon: Clock },
      failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'ล้มเหลว', icon: XCircle },
      refunded: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'คืนเงิน', icon: AlertTriangle },
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

  const getPaymentMethodLabel = (method: HotelPayment['payment_method']) => {
    const labels = {
      bank_transfer: 'โอนผ่านธนาคาร',
      cash: 'เงินสด',
      cheque: 'เช็ค',
      online: 'ชำระออนไลน์',
    }
    return labels[method] || method
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const totalPaid = filteredPayments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const pendingAmount = filteredPayments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const totalTransactions = filteredPayments.length
  const completedCount = filteredPayments.filter((p) => p.status === 'completed').length

  // Calculate payment methods from real data
  const paymentMethodsSummary = [
    {
      type: 'bank_transfer' as const,
      label: 'โอนผ่านธนาคาร',
      icon: CreditCard,
      count: filteredPayments.filter(p => p.payment_method === 'bank_transfer').length,
      total: filteredPayments.filter(p => p.payment_method === 'bank_transfer').reduce((sum, p) => sum + Number(p.amount), 0),
    },
    {
      type: 'cash' as const,
      label: 'เงินสด',
      icon: DollarSign,
      count: filteredPayments.filter(p => p.payment_method === 'cash').length,
      total: filteredPayments.filter(p => p.payment_method === 'cash').reduce((sum, p) => sum + Number(p.amount), 0),
    },
    {
      type: 'cheque' as const,
      label: 'เช็ค',
      icon: Receipt,
      count: filteredPayments.filter(p => p.payment_method === 'cheque').length,
      total: filteredPayments.filter(p => p.payment_method === 'cheque').reduce((sum, p) => sum + Number(p.amount), 0),
    },
    {
      type: 'online' as const,
      label: 'ชำระออนไลน์',
      icon: CreditCard,
      count: filteredPayments.filter(p => p.payment_method === 'online').length,
      total: filteredPayments.filter(p => p.payment_method === 'online').reduce((sum, p) => sum + Number(p.amount), 0),
    },
  ]

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const formattedData = formatPaymentsForExport(filteredPayments)
    const filename = `payments-hotel-${id}-${new Date().toISOString().split('T')[0]}`

    switch (format) {
      case 'csv':
        exportToCSV(formattedData, filename)
        break
      case 'excel':
        exportToExcel(formattedData, filename, 'Payments')
        break
      case 'pdf':
        exportToPDF(formattedData, filename, 'รายงานประวัติการชำระเงิน')
        break
    }
    setShowExportMenu(false)
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
            <h1 className="text-2xl font-bold text-gray-900">ประวัติการชำระเงิน</h1>
            <p className="text-gray-600">สรุปค่าบริการและการชำระเงินของโรงแรม</p>
          </div>
        </div>
        <div className="flex gap-3">
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
            onClick={() => setIsPaymentModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-700 to-amber-800 px-4 py-2 text-white hover:from-amber-800 hover:to-amber-900"
          >
            <Plus className="h-4 w-4" />
            บันทึกการชำระเงิน
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">ยอดชำระแล้ว</p>
              <p className="text-3xl font-bold">฿{totalPaid.toLocaleString()}</p>
            </div>
            <CheckCircle className="h-12 w-12 opacity-50" />
          </div>
        </div>

        <div className="rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 text-white shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">รอตรวจสอบ</p>
              <p className="text-3xl font-bold">฿{pendingAmount.toLocaleString()}</p>
            </div>
            <Clock className="h-12 w-12 opacity-50" />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">จำนวนธุรกรรม</p>
              <p className="text-2xl font-bold text-gray-900">{totalTransactions}</p>
            </div>
            <TrendingUp className="h-10 w-10 text-blue-600" />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">สำเร็จ</p>
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            </div>
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </div>
      </div>

      {/* Payment Methods Summary */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">ช่องทางการชำระเงิน</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {paymentMethodsSummary.map((method) => {
            const Icon = method.icon
            return (
              <div key={method.type} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">{method.label}</span>
                </div>
                <p className="text-xl font-bold text-gray-900">฿{method.total.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{method.count} ธุรกรรม</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-lg bg-white p-4 shadow md:flex-row">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">กรองข้อมูล:</span>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rounded-lg border px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">สถานะทั้งหมด</option>
          <option value="completed">สำเร็จ</option>
          <option value="pending">รอตรวจสอบ</option>
          <option value="failed">ล้มเหลว</option>
          <option value="refunded">คืนเงิน</option>
        </select>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value as any)}
          className="rounded-lg border px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">ช่องทางทั้งหมด</option>
          <option value="bank_transfer">โอนผ่านธนาคาร</option>
          <option value="cash">เงินสด</option>
          <option value="cheque">เช็ค</option>
          <option value="online">ชำระออนไลน์</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">รหัสธุรกรรม</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">เลขที่บิล</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">จำนวนเงิน</th>
                <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">ช่องทางชำระเงิน</th>
                <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">สถานะ</th>
                <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">วันที่ชำระ</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">ผู้ตรวจสอบ</th>
                <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">การกระทำ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-gray-500">ไม่พบข้อมูลการชำระเงิน</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-medium font-mono text-sm text-gray-900">{payment.transaction_ref}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/admin/hotels/${id}/billing`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {payment.invoice_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      ฿{Number(payment.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {getPaymentMethodLabel(payment.payment_method)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {payment.verified_by || '-'}
                      {payment.verified_date && (
                        <div className="text-xs text-gray-400">{formatDate(payment.verified_date)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          className="rounded p-1 text-blue-600 hover:bg-blue-50"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded p-1 text-gray-600 hover:bg-gray-100"
                          title="ดาวน์โหลดใบเสร็จ"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Notes Section */}
        {filteredPayments.some((p) => p.notes) && (
          <div className="border-t p-4">
            <h3 className="mb-2 text-sm font-medium text-gray-700">หมายเหตุ</h3>
            {filteredPayments
              .filter((p) => p.notes)
              .map((payment) => (
                <div key={payment.id} className="mb-2 text-sm text-gray-600">
                  <span className="font-medium">{payment.transaction_ref}:</span> {payment.notes}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Payment Form Modal */}
      <PaymentForm
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => {
          setIsPaymentModalOpen(false)
          refetch()
        }}
        hotelId={id!}
        invoices={invoices || []}
      />
    </div>
  )
}
