import { useState } from 'react'
import { Download, Calendar, CreditCard, FileText, Check } from 'lucide-react'

function MonthlyBill() {
  const [selectedMonth, setSelectedMonth] = useState('2026-01')

  // Mock bill data
  const billData = {
    hotelName: 'โรงแรมฮิลตัน อยุธยา',
    hotelNameEn: 'Hilton Bangkok',
    month: 'มกราคม 2026',
    period: '1 - 31 มกราคม 2026',
    billNumber: 'BL-HIL-2026-01',
    dueDate: '15 กุมภาพันธ์ 2026',
    status: 'pending',
  }

  const bookings = [
    {
      id: 'BK001',
      date: '2026-01-15',
      guestName: 'John Smith',
      roomNumber: '1505',
      service: 'Thai Massage (2 hours)',
      regularPrice: 800,
      hotelPrice: 640,
      discount: 160,
    },
    {
      id: 'BK002',
      date: '2026-01-15',
      guestName: 'Jane Doe',
      roomNumber: '1203',
      service: 'Gel Manicure',
      regularPrice: 450,
      hotelPrice: 360,
      discount: 90,
    },
    {
      id: 'BK003',
      date: '2026-01-14',
      guestName: 'Robert Chen',
      roomNumber: '1802',
      service: 'Oil Massage (2 hours)',
      regularPrice: 1000,
      hotelPrice: 800,
      discount: 200,
    },
    {
      id: 'BK004',
      date: '2026-01-14',
      guestName: 'Michael Brown',
      roomNumber: '707',
      service: 'Luxury Spa Package',
      regularPrice: 2500,
      hotelPrice: 2000,
      discount: 500,
    },
    {
      id: 'BK005',
      date: '2026-01-13',
      guestName: 'Sarah Wilson',
      roomNumber: '901',
      service: 'Facial Treatment',
      regularPrice: 1200,
      hotelPrice: 960,
      discount: 240,
    },
    {
      id: 'BK006',
      date: '2026-01-13',
      guestName: 'Emily Davis',
      roomNumber: '404',
      service: 'Foot Massage',
      regularPrice: 400,
      hotelPrice: 320,
      discount: 80,
    },
    {
      id: 'BK007',
      date: '2026-01-12',
      guestName: 'David Lee',
      roomNumber: '505',
      service: 'Thai Massage (2 hours)',
      regularPrice: 800,
      hotelPrice: 640,
      discount: 160,
    },
    {
      id: 'BK008',
      date: '2026-01-12',
      guestName: 'Lisa Anderson',
      roomNumber: '606',
      service: 'Gel Manicure',
      regularPrice: 450,
      hotelPrice: 360,
      discount: 90,
    },
  ]

  // Calculate totals
  const totalRegularPrice = bookings.reduce((sum, b) => sum + b.regularPrice, 0)
  const totalHotelPrice = bookings.reduce((sum, b) => sum + b.hotelPrice, 0)
  const totalSavings = bookings.reduce((sum, b) => sum + b.discount, 0)
  const totalBookings = bookings.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">บิลรายเดือน</h1>
          <p className="text-stone-500">Monthly Bill</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition">
            <Download className="w-5 h-5" />
            ดาวน์โหลด PDF
          </button>
        </div>
      </div>

      {/* Bill Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-stone-900 mb-1">{billData.hotelName}</h2>
            <p className="text-stone-500">{billData.hotelNameEn}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-stone-500">เลขที่บิล</p>
            <p className="font-mono font-medium text-stone-900">{billData.billNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-xs text-stone-500">รอบบิล</p>
            <p className="text-sm font-medium text-stone-900">{billData.period}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">จำนวนการจอง</p>
            <p className="text-sm font-medium text-stone-900">{totalBookings} ครั้ง</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">วันครบกำหนดชำระ</p>
            <p className="text-sm font-medium text-stone-900">{billData.dueDate}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">สถานะ</p>
            {billData.status === 'pending' ? (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                รอชำระ
              </span>
            ) : (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                ชำระแล้ว
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm opacity-90">มูลค่ารวมปกติ</p>
              <p className="text-2xl font-bold">฿{totalRegularPrice.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm opacity-90">ส่วนลดโรงแรม</p>
              <p className="text-2xl font-bold">-฿{totalSavings.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-700 to-amber-800 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm opacity-90">ยอดชำระสุทธิ</p>
              <p className="text-2xl font-bold">฿{totalHotelPrice.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Details */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-stone-100">
        <div className="p-6 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900">รายละเอียดการจอง</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">วันที่</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">แขก</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">ห้อง</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">บริการ</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-stone-700">ราคาปกติ</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-stone-700">ส่วนลด</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-stone-700">ราคาจ่ายจริง</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="py-3 px-4 text-sm text-stone-600">{booking.date}</td>
                  <td className="py-3 px-4 text-sm font-medium text-stone-900">{booking.guestName}</td>
                  <td className="py-3 px-4 text-sm text-amber-700">#{booking.roomNumber}</td>
                  <td className="py-3 px-4 text-sm text-stone-600">{booking.service}</td>
                  <td className="py-3 px-4 text-sm text-stone-400 text-right line-through">
                    ฿{booking.regularPrice}
                  </td>
                  <td className="py-3 px-4 text-sm text-green-600 text-right">-฿{booking.discount}</td>
                  <td className="py-3 px-4 text-sm font-bold text-amber-700 text-right">
                    ฿{booking.hotelPrice}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-stone-50 border-t border-stone-200">
              <tr>
                <td colSpan={4} className="py-4 px-4 text-right font-semibold text-stone-900">
                  รวมทั้งสิ้น
                </td>
                <td className="py-4 px-4 text-right text-sm text-stone-400 line-through">
                  ฿{totalRegularPrice.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-right text-sm text-green-600">
                  -฿{totalSavings.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-right text-lg font-bold text-amber-700">
                  ฿{totalHotelPrice.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payment Info */}
      <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl shadow-lg p-6 text-white">
        <h3 className="font-semibold mb-4">ข้อมูลการชำระเงิน</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-stone-400 mb-1">ชื่อบัญชี</p>
            <p className="font-medium">บริษัท เดอะ บลิส มาสสาจ แอท โฮม จำกัด</p>
          </div>
          <div>
            <p className="text-stone-400 mb-1">ธนาคาร</p>
            <p className="font-medium">ธนาคารกสิกรไทย</p>
          </div>
          <div>
            <p className="text-stone-400 mb-1">เลขที่บัญชี</p>
            <p className="font-mono text-lg">012-3-45678-9</p>
          </div>
          <div>
            <p className="text-stone-400 mb-1">สาขา</p>
            <p className="font-medium">สาขาสุขุมวิท</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-stone-400">
          กรุณาแนบหลักฐานการโอนเงินและส่งอีเมลมาที่ billing@bliss.com หรือแจ้งผ่าน LINE OA: @blissathome
        </p>
      </div>
    </div>
  )
}

export default MonthlyBill
