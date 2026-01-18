import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, User, MapPin, CreditCard, Check } from 'lucide-react'

function BookForGuest() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [bookingData, setBookingData] = useState({
    roomNumber: '',
    guestName: '',
    service: '',
    date: '',
    time: '',
    notes: '',
  })

  const services = [
    { id: 'SVC001', name: 'Thai Massage (2 hours)', nameTh: 'นวดไทย (2 ชม.)', price: 640, duration: 120 },
    { id: 'SVC002', name: 'Oil Massage (2 hours)', nameTh: 'นวดน้ำมัน (2 ชม.)', price: 800, duration: 120 },
    { id: 'SVC003', name: 'Gel Manicure', nameTh: 'เล็บเจล', price: 360, duration: 60 },
    { id: 'SVC004', name: 'Luxury Spa Package', nameTh: 'แพ็กเกจสปาหรู', price: 2000, duration: 150 },
    { id: 'SVC005', name: 'Foot Massage', nameTh: 'นวดเท้า (1 ชม.)', price: 320, duration: 60 },
    { id: 'SVC006', name: 'Facial Treatment', nameTh: 'ทรีตเมนท์หน้า', price: 960, duration: 90 },
  ]

  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  ]

  const today = new Date().toISOString().split('T')[0]

  const handleSubmit = () => {
    console.log('Booking submitted:', bookingData)
    navigate('/hotel/guests')
  }

  const selectedService = services.find((s) => s.id === bookingData.service)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">จองบริการให้แขก</h1>
        <p className="text-stone-500">Book for Guest</p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-medium ${
                  step >= s
                    ? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white'
                    : 'bg-stone-100 text-stone-500'
                }`}
              >
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-1 mx-2 ${step > s ? 'bg-amber-700' : 'bg-stone-200'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-stone-500">
          <span className="flex-1 text-center">ข้อมูลแขก</span>
          <span className="flex-1 text-center">เลือกบริการ</span>
          <span className="flex-1 text-center">เวลา & ยืนยัน</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Booking Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Guest Information */}
          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
              <h2 className="text-lg font-semibold text-stone-900 mb-4">ข้อมูลแขก</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">เลขห้อง</label>
                  <input
                    type="text"
                    value={bookingData.roomNumber}
                    onChange={(e) => setBookingData({ ...bookingData, roomNumber: e.target.value })}
                    placeholder="เช่น 1505"
                    className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">ชื่อแขก</label>
                  <input
                    type="text"
                    value={bookingData.guestName}
                    onChange={(e) => setBookingData({ ...bookingData, guestName: e.target.value })}
                    placeholder="เช่น John Smith"
                    className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Select Service */}
          {step === 2 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
              <h2 className="text-lg font-semibold text-stone-900 mb-4">เลือกบริการ</h2>
              <div className="space-y-3">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setBookingData({ ...bookingData, service: service.id })}
                    className={`w-full p-4 rounded-xl border-2 text-left transition ${
                      bookingData.service === service.id
                        ? 'border-amber-700 bg-amber-50'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-stone-900">{service.nameTh}</p>
                        <p className="text-sm text-stone-500">{service.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-700">฿{service.price}</p>
                        <p className="text-xs text-stone-400">{service.duration} นาที</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Date & Time */}
          {step === 3 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
              <h2 className="text-lg font-semibold text-stone-900 mb-4">เลือกวันและเวลา</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">วันที่</label>
                  <input
                    type="date"
                    value={bookingData.date}
                    onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                    min={today}
                    className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">เวลา</label>
                  <div className="grid grid-cols-5 gap-2">
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => setBookingData({ ...bookingData, time })}
                        className={`py-2 px-3 rounded-xl text-sm font-medium transition ${
                          bookingData.time === time
                            ? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">หมายเหตุ</label>
                  <textarea
                    value={bookingData.notes}
                    onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                    placeholder="ระบุความต้องการพิเศษ..."
                    rows={3}
                    className="w-full px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-2 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition"
              >
                ย้อนกลับ
              </button>
            ) : (
              <div />
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && (!bookingData.roomNumber || !bookingData.guestName)) ||
                  (step === 2 && !bookingData.service)
                }
                className="px-6 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ถัดไป
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!bookingData.date || !bookingData.time}
                className="px-6 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ยืนยันการจอง
              </button>
            )}
          </div>
        </div>

        {/* Booking Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100 sticky top-4">
            <h3 className="font-semibold text-stone-900 mb-4">สรุปการจอง</h3>

            <div className="space-y-4">
              {bookingData.roomNumber && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-stone-100 rounded-lg">
                    <MapPin className="w-4 h-4 text-stone-600" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">ห้อง</p>
                    <p className="text-sm font-medium text-stone-900">#{bookingData.roomNumber}</p>
                  </div>
                </div>
              )}

              {bookingData.guestName && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-stone-100 rounded-lg">
                    <User className="w-4 h-4 text-stone-600" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">แขก</p>
                    <p className="text-sm font-medium text-stone-900">{bookingData.guestName}</p>
                  </div>
                </div>
              )}

              {selectedService && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-stone-100 rounded-lg">
                      <CreditCard className="w-4 h-4 text-stone-600" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-500">บริการ</p>
                      <p className="text-sm font-medium text-stone-900">{selectedService.nameTh}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-stone-100 rounded-lg">
                      <Clock className="w-4 h-4 text-stone-600" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-500">ระยะเวลา</p>
                      <p className="text-sm font-medium text-stone-900">{selectedService.duration} นาที</p>
                    </div>
                  </div>
                </>
              )}

              {bookingData.date && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-stone-100 rounded-lg">
                    <Calendar className="w-4 h-4 text-stone-600" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">วันที่</p>
                    <p className="text-sm font-medium text-stone-900">{bookingData.date}</p>
                  </div>
                </div>
              )}

              {bookingData.time && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-stone-100 rounded-lg">
                    <Clock className="w-4 h-4 text-stone-600" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">เวลา</p>
                    <p className="text-sm font-medium text-stone-900">{bookingData.time}</p>
                  </div>
                </div>
              )}
            </div>

            {selectedService && (
              <div className="mt-6 pt-4 border-t border-stone-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-stone-500">ราคาปกติ</span>
                  <span className="text-sm text-stone-400 line-through">฿{selectedService.price * 1.25}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-stone-500">ส่วนลดโรงแรม (20%)</span>
                  <span className="text-sm text-green-600">-฿{selectedService.price * 0.25}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-stone-900">ยอดรวม</span>
                  <span className="text-lg font-bold text-amber-700">฿{selectedService.price}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookForGuest
