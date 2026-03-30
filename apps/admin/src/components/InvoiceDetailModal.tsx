import { useState } from 'react'
import { X, Calendar, FileText, DollarSign, TrendingUp, CheckCircle, AlertTriangle, Download, Printer, Mail, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import type { HotelInvoice } from '../lib/hotelQueries'
import { downloadInvoicePDF, generateInvoicePDFBase64 } from '../utils/invoicePdfGenerator'

interface InvoiceDetailModalProps {
  isOpen: boolean
  onClose: () => void
  invoice: HotelInvoice | null
  hotelName?: string
}

export function InvoiceDetailModal({ isOpen, onClose, invoice, hotelName }: InvoiceDetailModalProps) {
  const [emailSending, setEmailSending] = useState(false)

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
    // Build print-friendly HTML with only invoice content
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>ใบแจ้งหนี้ ${invoice.bill_number}</title>
          <style>
            @page { size: A4; margin: 2cm; }
            body { font-family: 'Sarabun', 'TH Sarabun New', sans-serif; font-size: 14px; color: #333; }
            h1 { text-align: center; margin-bottom: 5px; }
            .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; font-size: 16px; border-bottom: 2px solid #4472C4; padding-bottom: 5px; margin-bottom: 10px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .info-item label { color: #666; font-size: 12px; display: block; }
            .info-item span { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #4472C4; color: white; padding: 8px; text-align: left; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .summary-highlight { background: #EBF5FF; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; font-weight: bold; color: #1E40AF; font-size: 18px; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; }
          </style>
        </head>
        <body>
          <h1>ใบแจ้งหนี้ / Invoice</h1>
          <p class="subtitle">${invoice.bill_number}</p>

          <div class="section">
            <div class="info-grid">
              <div class="info-item"><label>โรงแรม</label><span>${hotelName || 'โรงแรม'}</span></div>
              <div class="info-item"><label>สถานะ</label><span>${invoice.status === 'pending' ? 'รอชำระ' : invoice.status === 'paid' ? 'จ่ายแล้ว' : invoice.status}</span></div>
              <div class="info-item"><label>ช่วงเวลา</label><span>${formatDate(invoice.period_start)} - ${formatDate(invoice.period_end)}</span></div>
              <div class="info-item"><label>วันครบกำหนด</label><span>${formatDate(invoice.due_date)}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">สรุปยอด</div>
            <div class="summary-row"><span>จำนวนการจอง</span><span>${invoice.total_bookings} รายการ</span></div>
            <div class="summary-highlight"><span>ยอดเรียกเก็บรวม</span><span>฿${(Number(invoice.total_amount) || 0).toLocaleString()}</span></div>
          </div>

          <div class="footer">
            <p>สร้างโดยระบบ The Bliss Massage at Home</p>
          </div>
        </body>
      </html>
    `
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => printWindow.print(), 300)
    }
  }

  const handleDownloadPDF = () => {
    downloadInvoicePDF(invoice, hotelName || 'โรงแรม')
  }

  const handleSendEmail = async () => {
    setEmailSending(true)
    try {
      const pdfBase64 = generateInvoicePDFBase64(invoice, hotelName || 'โรงแรม')
      const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app/api' : 'http://localhost:3000/api')
      const response = await fetch(`${API_URL}/invoices/${invoice.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64 }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(`ส่งใบแจ้งหนี้ไปยัง ${result.sentTo} เรียบร้อย`)
      } else {
        toast.error(result.error || 'ไม่สามารถส่งอีเมลได้')
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการส่งอีเมล')
    } finally {
      setEmailSending(false)
    }
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
              <p className="text-sm text-gray-500">{invoice.bill_number}</p>
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
                    (เดือน {invoice.month}/{invoice.year})
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <FileText className="h-4 w-4" />
                    <span>วันที่ออกบิล</span>
                  </div>
                  <p className="mt-1 font-medium text-gray-900">{formatDate(invoice.created_at)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>วันครบกำหนด</span>
                  </div>
                  <p className="mt-1 font-medium text-gray-900">{formatDate(invoice.due_date)}</p>
                  {invoice.paid_at && (
                    <p className="text-xs text-green-600">จ่าย: {formatDate(invoice.paid_at)}</p>
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
                  <span className="text-gray-600">ยอดเรียกเก็บรวม</span>
                  <span className="text-lg font-semibold text-gray-900">
                    ฿{(Number(invoice.total_amount) || 0).toLocaleString()}
                  </span>
                </div>


                <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                  <span className="text-lg font-semibold text-green-900">ยอดสุทธิ</span>
                  <span className="text-2xl font-bold text-green-700">
                    ฿{(Number(invoice.total_amount) || 0).toLocaleString()}
                  </span>
                </div>
              </div>
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
              onClick={handleSendEmail}
              disabled={emailSending}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {emailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {emailSending ? 'กำลังส่ง...' : 'ส่งอีเมล'}
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
