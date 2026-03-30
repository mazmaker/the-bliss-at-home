import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@bliss/supabase/auth'
import { ChevronLeft, ChevronRight, CalendarClock, X, Mail, Loader2 } from 'lucide-react'

interface HotelCredit {
  id: string
  name_th: string
  name_en: string
  email: string | null
  credit_days: number
  credit_cycle_day: number
  credit_start_date: string
}

interface PendingBill {
  id: string
  hotel_id: string
  bill_number: string
  total_amount: number
  total_discount: number
  status: string
}

interface DayData {
  date: number
  hotels: (HotelCredit & { totalOutstanding: number; billCount: number; status: 'paid' | 'upcoming' | 'overdue' })[]
}

const MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

const DAY_NAMES = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

export default function CreditCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null)

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  // Fetch hotels with credit settings
  const { data: hotels = [], isLoading: hotelsLoading } = useQuery({
    queryKey: ['credit-calendar-hotels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotels')
        .select('id, name_th, name_en, email, credit_days, credit_cycle_day, credit_start_date')
        .not('credit_cycle_day', 'is', null)
        .not('credit_start_date', 'is', null)
        .eq('status', 'active')

      if (error) throw error
      return (data || []) as HotelCredit[]
    },
  })

  // Fetch pending bills for all hotels
  const { data: pendingBills = [] } = useQuery({
    queryKey: ['credit-calendar-bills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_bills')
        .select('id, hotel_id, bill_number, total_amount, total_discount, status')
        .eq('status', 'pending')

      if (error) throw error
      return (data || []) as PendingBill[]
    },
  })

  // Build calendar data
  const calendarData = useMemo(() => {
    const today = new Date()
    const firstDay = new Date(currentYear, currentMonth, 1).getDay()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    const days: (DayData | null)[] = []

    // Fill empty days before month start
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    // Fill each day
    for (let day = 1; day <= daysInMonth; day++) {
      const dayHotels = hotels
        .filter(h => h.credit_cycle_day === day)
        .map(hotel => {
          const hotelBills = pendingBills.filter(b => b.hotel_id === hotel.id)
          const totalOutstanding = hotelBills.reduce((sum, b) => sum + (b.total_amount - (b.total_discount || 0)), 0)

          const dueDate = new Date(currentYear, currentMonth, day)
          let status: 'paid' | 'upcoming' | 'overdue'
          if (totalOutstanding === 0) {
            status = 'paid'
          } else if (dueDate < today) {
            status = 'overdue'
          } else {
            status = 'upcoming'
          }

          return { ...hotel, totalOutstanding, billCount: hotelBills.length, status }
        })

      days.push({ date: day, hotels: dayHotels })
    }

    return days
  }, [hotels, pendingBills, currentYear, currentMonth])

  // Summary stats
  const stats = useMemo(() => {
    const allHotelsInMonth = calendarData
      .filter((d): d is DayData => d !== null)
      .flatMap(d => d.hotels)

    return {
      total: hotels.length,
      dueThisMonth: allHotelsInMonth.length,
      overdue: allHotelsInMonth.filter(h => h.status === 'overdue').length,
      upcoming: allHotelsInMonth.filter(h => h.status === 'upcoming').length,
      paid: allHotelsInMonth.filter(h => h.status === 'paid').length,
      totalOutstanding: allHotelsInMonth.reduce((sum, h) => sum + h.totalOutstanding, 0),
    }
  }, [calendarData, hotels])

  const goToPrevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  const goToNextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  const goToToday = () => setCurrentDate(new Date())

  const today = new Date()
  const isToday = (day: number) =>
    day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()

  const getStatusColor = (status: 'paid' | 'upcoming' | 'overdue') => {
    switch (status) {
      case 'paid': return 'bg-emerald-500'
      case 'upcoming': return 'bg-amber-500'
      case 'overdue': return 'bg-red-500'
    }
  }

  const getStatusLabel = (status: 'paid' | 'upcoming' | 'overdue') => {
    switch (status) {
      case 'paid': return 'จ่ายแล้ว'
      case 'upcoming': return 'ใกล้ครบกำหนด'
      case 'overdue': return 'เลยกำหนด'
    }
  }

  const getStatusBadgeClass = (status: 'paid' | 'upcoming' | 'overdue') => {
    switch (status) {
      case 'paid': return 'bg-emerald-100 text-emerald-700'
      case 'upcoming': return 'bg-amber-100 text-amber-700'
      case 'overdue': return 'bg-red-100 text-red-700'
    }
  }

  if (hotelsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">ปฏิทินเครดิต</h1>
        <p className="text-stone-500">Credit Calendar — แสดงรอบเครดิตและกำหนดชำระของทุกโรงแรม</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-sm text-stone-500">โรงแรมที่ตั้งค่าเครดิต</p>
          <p className="text-2xl font-bold text-stone-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-sm text-stone-500">ครบกำหนดเดือนนี้</p>
          <p className="text-2xl font-bold text-amber-600">{stats.dueThisMonth}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-sm text-stone-500">เลยกำหนด</p>
          <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-sm text-stone-500">ยอดค้างชำระรวม</p>
          <p className="text-2xl font-bold text-stone-900">฿{stats.totalOutstanding.toLocaleString()}</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <CalendarClock className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-stone-900">
              {MONTH_NAMES[currentMonth]} {currentYear + 543}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm bg-stone-100 hover:bg-stone-200 rounded-lg transition"
            >
              วันนี้
            </button>
            <button onClick={goToPrevMonth} className="p-1.5 hover:bg-stone-100 rounded-lg transition">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={goToNextMonth} className="p-1.5 hover:bg-stone-100 rounded-lg transition">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-4 py-2 border-b border-stone-50 bg-stone-50 text-xs">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> จ่ายแล้ว</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> ใกล้ครบกำหนด</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> เลยกำหนด</span>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 border-b border-stone-100">
          {DAY_NAMES.map(day => (
            <div key={day} className="py-2 text-center text-xs font-medium text-stone-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarData.map((day, idx) => (
            <div
              key={idx}
              className={`min-h-[80px] border-b border-r border-stone-100 p-1.5 transition ${
                day ? 'hover:bg-stone-50 cursor-pointer' : 'bg-stone-50/50'
              } ${day && isToday(day.date) ? 'bg-amber-50' : ''}`}
              onClick={() => day && day.hotels.length > 0 && setSelectedDay(day)}
            >
              {day && (
                <>
                  <div className={`text-xs font-medium mb-1 ${isToday(day.date) ? 'text-amber-700 font-bold' : 'text-stone-600'}`}>
                    {day.date}
                  </div>
                  {day.hotels.length > 0 && (
                    <div className="space-y-0.5">
                      {day.hotels.slice(0, 3).map(hotel => (
                        <div
                          key={hotel.id}
                          className={`flex items-center gap-1 px-1 py-0.5 rounded text-[10px] leading-tight truncate ${
                            hotel.status === 'overdue'
                              ? 'bg-red-100 text-red-700'
                              : hotel.status === 'upcoming'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusColor(hotel.status)}`} />
                          <span className="truncate">{hotel.name_th}</span>
                        </div>
                      ))}
                      {day.hotels.length > 3 && (
                        <div className="text-[10px] text-stone-400 px-1">
                          +{day.hotels.length - 3} อื่นๆ
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Selected Day Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDay(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-stone-100">
              <div>
                <h3 className="font-semibold text-stone-900">
                  วันที่ {selectedDay.date} {MONTH_NAMES[currentMonth]} {currentYear + 543}
                </h3>
                <p className="text-sm text-stone-500">{selectedDay.hotels.length} โรงแรมครบกำหนด</p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="p-1 hover:bg-stone-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
              {selectedDay.hotels.map(hotel => (
                <div key={hotel.id} className="border border-stone-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-stone-900">{hotel.name_th}</h4>
                      <p className="text-xs text-stone-500">{hotel.name_en}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(hotel.status)}`}>
                      {getStatusLabel(hotel.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-500">ยอดค้างชำระ</span>
                    <span className={`font-bold ${hotel.totalOutstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      ฿{hotel.totalOutstanding.toLocaleString()}
                    </span>
                  </div>
                  {hotel.billCount > 0 && (
                    <p className="text-xs text-stone-400 mt-1">{hotel.billCount} บิลที่รอชำระ</p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <a
                      href={`/admin/hotels/${hotel.id}/billing`}
                      className="flex-1 text-center px-3 py-1.5 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700 transition"
                    >
                      ดูบิล
                    </a>
                    {hotel.email && (
                      <a
                        href={`mailto:${hotel.email}`}
                        className="flex items-center gap-1 px-3 py-1.5 border border-stone-200 text-xs rounded-lg hover:bg-stone-50 transition"
                      >
                        <Mail className="w-3 h-3" />
                        ส่งอีเมล
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
