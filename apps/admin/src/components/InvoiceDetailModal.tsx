import { X, Calendar, FileText, DollarSign, TrendingUp, CheckCircle, AlertTriangle, Download, Printer } from 'lucide-react'
import type { HotelInvoice } from '../lib/hotelQueries'

interface InvoiceDetailModalProps {
  isOpen: boolean
  onClose: () => void
  invoice: HotelInvoice | null
  hotelName?: string
}

export function InvoiceDetailModal({ isOpen, onClose, invoice, hotelName }: InvoiceDetailModalProps) {
  if (!isOpen || !invoice) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getStatusBadge = (status: HotelInvoice['status']) => {
    const badges = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'ร่าง', icon: FileText },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'รอชำระ', icon: AlertTriangle },
      paid: { bg: 'bg-green-100', text: 'text-green-700', label: 'จ่ายแล้ว', icon: CheckCircle },
      overdue: { bg: 'bg-red-100', text: 'text-red-700', label: 'เกินกำหนด', icon: AlertTriangle },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'ยกเลิก', icon: X },
    }
    const badge = badges[status]
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="h-4 w-4" />
        {badge.label}
      </span>
    )
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    // This will be handled by the parent component
    alert('ดาวน์โหลด PDF: ' + invoice.invoice_number)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">รายละเอียดบิล/ใบแจ้งหนี้</h2>
              <p className="text-sm text-gray-500">{invoice.invoice_number}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Invoice Header */}
            <div className="mb-6 grid grid-cols-2 gap-6">
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-500">ข้อมูลโรงแรม</h3>
                <p className="text-lg font-semibold text-gray-900">{hotelName || 'โรงแรม'}</p>
              </div>
              <div className="text-right">
                <h3 className="mb-2 text-sm font-medium text-gray-500">สถานะ</h3>
                {getStatusBadge(invoice.status)}
              </div>
            </div>

            {/* Invoice Details */}
            <div className="mb-6 rounded-lg bg-gray-50 p-6">
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>ช่วงเวลา</span>
                  </div>
                  <p className="mt-1 font-medium text-gray-900">
                    {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                  </p>
                  <p className="text-xs text-gray-500">
                    ({invoice.period_type === 'weekly' ? 'รายสัปดาห์' : 'รายเดือน'})
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <FileText className="h-4 w-4" />
                    <span>วันที่ออกบิล</span>
                  </div>
                  <p className="mt-1 font-medium text-gray-900">{formatDate(invoice.issued_date)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>วันครบกำหนด</span>
                  </div>
                  <p className="mt-1 font-medium text-gray-900">{formatDate(invoice.due_date)}</p>
                  {invoice.paid_date && (
                    <p className="text-xs text-green-600">จ่าย: {formatDate(invoice.paid_date)}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="mb-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">สรุปยอด</h3>

              <div className="rounded-lg border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-3">
                  <span className="text-gray-600">จำนวนการจองทั้งหมด</span>
                  <span className="text-lg font-semibold text-gray-900">{invoice.total_bookings} รายการ</span>
                </div>

                <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-3">
                  <span className="text-gray-600">รายได้รวม</span>
                  <span className="text-lg font-semibold text-gray-900">
                    ฿{Number(invoice.total_revenue).toLocaleString()}
                  </span>
                </div>

                <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-3">
                  <span className="text-gray-600">อัตราคอมมิชชั่น</span>
                  <span className="text-lg font-semibold text-blue-600">{Number(invoice.commission_rate)}%</span>
                </div>

                <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                  <span className="text-lg font-semibold text-blue-900">คอมมิชชั่นที่ต้องชำระ</span>
                  <span className="text-2xl font-bold text-blue-700">
                    ฿{Number(invoice.commission_amount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Calculation Details */}
            <div className="rounded-lg bg-gray-50 p-4">
              <h4 className="mb-2 text-sm font-medium text-gray-700">การคำนวณ</h4>
              <p className="text-sm text-gray-600">
                คอมมิชชั่น = รายได้รวม × อัตราคอมมิชชั่น
              </p>
              <p className="text-sm text-gray-600">
                = ฿{Number(invoice.total_revenue).toLocaleString()} × {Number(invoice.commission_rate)}%
              </p>
              <p className="text-sm font-semibold text-gray-900">
                = ฿{Number(invoice.commission_amount).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ปิด
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Printer className="h-4 w-4" />
              พิมพ์
            </button>
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              ดาวน์โหลด PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
