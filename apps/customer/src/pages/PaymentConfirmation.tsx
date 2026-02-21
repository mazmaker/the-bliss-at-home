import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle, Download, ArrowRight, Home, Mail, Loader2 } from 'lucide-react'
import { downloadReceipt } from '../utils/receiptPdfGenerator'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface ReceiptData {
  transaction_id: string
  receipt_number: string
  transaction_number: string
  amount: number
  currency: string
  payment_method: string
  card_brand?: string
  card_last_digits?: string
  status: string
  transaction_date: string
  booking_number: string
  booking_date: string
  booking_time: string
  service_name: string
  service_name_en?: string
  service_price?: number
  final_price?: number
  addons: { name: string; price: number }[]
  customer_name: string
  customer_phone: string
  customer_email?: string
  customer_id?: string
  company: {
    companyName: string
    companyNameTh: string
    companyTaxId: string
    companyLogoUrl: string
    companyEmail: string
    companyAddress: string
    companyPhone: string
  }
}

function PaymentConfirmation() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const bookingId = searchParams.get('booking_id')

  useEffect(() => {
    const transactionId = searchParams.get('transaction_id')

    if (!bookingId || !transactionId) {
      navigate('/bookings')
      return
    }

    fetchReceiptData(transactionId)
  }, [searchParams, navigate, bookingId])

  const fetchReceiptData = async (transactionId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/receipts/${transactionId}`)
      const result = await response.json()

      if (result.success && result.data) {
        setReceiptData(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch receipt data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadReceipt = () => {
    if (!receiptData) return

    downloadReceipt({
      receiptNumber: receiptData.receipt_number,
      transactionDate: formatDate(receiptData.transaction_date),
      bookingNumber: receiptData.booking_number,
      serviceName: receiptData.service_name,
      serviceNameEn: receiptData.service_name_en,
      bookingDate: formatDate(receiptData.booking_date),
      bookingTime: receiptData.booking_time,
      amount: receiptData.amount,
      servicePrice: receiptData.service_price,
      paymentMethod: receiptData.payment_method,
      cardBrand: receiptData.card_brand,
      cardLastDigits: receiptData.card_last_digits,
      customerName: receiptData.customer_name,
      addons: receiptData.addons,
      company: {
        name: receiptData.company.companyName,
        nameTh: receiptData.company.companyNameTh,
        address: receiptData.company.companyAddress,
        phone: receiptData.company.companyPhone,
        email: receiptData.company.companyEmail,
        taxId: receiptData.company.companyTaxId,
      },
    })
  }

  const handleEmailReceipt = async () => {
    if (!receiptData) return

    setEmailSending(true)
    try {
      const response = await fetch(`${API_URL}/api/receipts/${receiptData.transaction_id}/send-email`, {
        method: 'POST',
      })
      const result = await response.json()

      if (result.success) {
        setEmailSent(true)
      } else {
        alert(result.error || 'ไม่สามารถส่งอีเมลได้')
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการส่งอีเมล')
    } finally {
      setEmailSending(false)
    }
  }

  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const formatPaymentMethod = (method: string, cardLastDigits?: string): string => {
    if (method === 'credit_card') return `บัตรเครดิต${cardLastDigits ? ` •••• ${cardLastDigits}` : ''}`
    if (method === 'promptpay') return 'พร้อมเพย์'
    if (method === 'internet_banking') return 'โอนผ่านธนาคาร'
    return method
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-amber-700 mb-4"></div>
          <p className="text-stone-600">กำลังโหลดข้อมูลการชำระเงิน...</p>
        </div>
      </div>
    )
  }

  if (!receiptData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-stone-600 mb-4">ไม่พบข้อมูลการชำระเงิน</p>
          <Link
            to="/bookings"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800"
          >
            ไปที่รายการจอง
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4 animate-in zoom-in duration-300">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">ชำระเงินสำเร็จ!</h1>
          <p className="text-stone-600">การจองของคุณได้รับการยืนยันแล้ว</p>
        </div>

        {/* Payment Details Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-stone-900 mb-6">รายละเอียดการชำระเงิน</h2>

          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b border-stone-100">
              <span className="text-stone-600">บริการ</span>
              <span className="font-medium text-stone-900">{receiptData.service_name}</span>
            </div>

            <div className="flex justify-between py-3 border-b border-stone-100">
              <span className="text-stone-600">ยอดชำระ</span>
              <span className="text-xl font-bold text-amber-700">฿{receiptData.amount.toLocaleString()}</span>
            </div>

            <div className="flex justify-between py-3 border-b border-stone-100">
              <span className="text-stone-600">วิธีการชำระ</span>
              <span className="font-medium text-stone-900">
                {formatPaymentMethod(receiptData.payment_method, receiptData.card_last_digits)}
              </span>
            </div>

            <div className="flex justify-between py-3 border-b border-stone-100">
              <span className="text-stone-600">เลขที่ใบเสร็จ</span>
              <span className="font-medium text-stone-900">{receiptData.receipt_number}</span>
            </div>

            <div className="flex justify-between py-3">
              <span className="text-stone-600">วันที่</span>
              <span className="font-medium text-stone-900">
                {formatDate(receiptData.transaction_date)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <button
            onClick={handleDownloadReceipt}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-stone-200 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition"
          >
            <Download className="w-5 h-5" />
            ดาวน์โหลดใบเสร็จ
          </button>

          <button
            onClick={handleEmailReceipt}
            disabled={emailSending || emailSent}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-stone-200 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition disabled:opacity-50"
          >
            {emailSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : emailSent ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Mail className="w-5 h-5" />
            )}
            {emailSending ? 'กำลังส่ง...' : emailSent ? 'ส่งอีเมลแล้ว' : 'ส่งใบเสร็จทางอีเมล'}
          </button>
        </div>

        {/* Navigation Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link
            to={`/bookings/${bookingId}`}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition"
          >
            ดูรายละเอียดการจอง
            <ArrowRight className="w-5 h-5" />
          </Link>

          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-stone-200 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition"
          >
            <Home className="w-5 h-5" />
            กลับหน้าหลัก
          </Link>
        </div>

        {/* Additional Info */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          <p className="font-medium mb-1">ขั้นตอนต่อไป</p>
          <ul className="list-disc list-inside space-y-1">
            <li>ใบเสร็จรับเงินถูกส่งไปยังอีเมลของคุณแล้ว</li>
            <li>พนักงานของเราจะติดต่อคุณ 1 วันก่อนวันนัดหมาย</li>
            <li>คุณสามารถดูหรือยกเลิกการจองได้ที่หน้ารายการจอง</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default PaymentConfirmation
