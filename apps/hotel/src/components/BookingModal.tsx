import { useState } from 'react'
import { Calendar, Clock, CreditCard, Check, X, User, MapPin, Phone, Users } from 'lucide-react'

interface Service {
  id: string
  name_th: string
  name_en: string
  description_th?: string | null
  description_en?: string | null
  category: 'massage' | 'nail' | 'spa' | 'facial'
  duration: number
  duration_options?: number[] | null
  base_price: number
  hotel_price: number
  image_url?: string | null
  is_active: boolean | null
  sort_order?: number | null
  created_at: string | null
  updated_at: string | null
}

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  service: Service
}

interface BookingData {
  guestName: string
  roomNumber: string
  phoneNumber: string
  numberOfGuests: number
  selectedDuration: number
  date: string
  time: string
  notes: string
}

function BookingModal({ isOpen, onClose, service }: BookingModalProps) {
  const [step, setStep] = useState(1)
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [bookingData, setBookingData] = useState<BookingData>({
    guestName: '',
    roomNumber: '',
    phoneNumber: '',
    numberOfGuests: 1,
    selectedDuration: service.duration,
    date: '',
    time: '',
    notes: '',
  })

  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  ]

  const today = new Date().toISOString().split('T')[0]

  // Get available duration options for the service
  const durationOptions = service.duration_options && Array.isArray(service.duration_options) && service.duration_options.length > 0
    ? [...service.duration_options].sort((a, b) => a - b)
    : [service.duration]

  const handleSubmit = () => {
    setAttemptedSubmit(true)

    if (!bookingData.date || !bookingData.time) {
      return // Don't submit if validation fails
    }

    console.log('Booking submitted:', {
      service: service.id,
      serviceName: service.name_th,
      ...bookingData
    })
    // Here you would normally send the booking to your backend
    alert('การจองสำเร็จ!')
    onClose()
    resetForm()
  }

  const resetForm = () => {
    setStep(1)
    setAttemptedSubmit(false)
    setBookingData({
      guestName: '',
      roomNumber: '',
      phoneNumber: '',
      numberOfGuests: 1,
      selectedDuration: service.duration,
      date: '',
      time: '',
      notes: '',
    })
  }

  const handleNextStep = () => {
    setAttemptedSubmit(true)

    // Check validation for current step
    if (step === 1) {
      if (bookingData.guestName.trim() && bookingData.roomNumber.trim() && bookingData.phoneNumber.trim()) {
        setStep(step + 1)
        setAttemptedSubmit(false) // Reset for next step
      }
    } else if (step === 2) {
      if (bookingData.selectedDuration) {
        setStep(step + 1)
        setAttemptedSubmit(false) // Reset for next step
      }
    }
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-100">
          <div>
            <h2 className="text-xl font-bold text-stone-900">จองบริการให้แขก</h2>
            <p className="text-stone-500">{service.name_th}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-stone-50">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    step >= s
                      ? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white'
                      : 'bg-stone-200 text-stone-500'
                  }`}
                >
                  {step > s ? <Check className="w-4 h-4" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-12 h-1 mx-2 ${step > s ? 'bg-amber-700' : 'bg-stone-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-stone-500 max-w-md mx-auto">
            <span className="flex-1 text-center">ข้อมูลแขก</span>
            <span className="flex-1 text-center">เลือกระยะเวลา</span>
            <span className="flex-1 text-center">เวลา & ยืนยัน</span>
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: Guest Information */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold text-stone-900 mb-4">ข้อมูลแขก</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    ชื่อแขก <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bookingData.guestName}
                    onChange={(e) => setBookingData({ ...bookingData, guestName: e.target.value })}
                    placeholder="เช่น John Smith"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 transition ${
                      attemptedSubmit && !bookingData.guestName.trim()
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-stone-300 focus:ring-amber-500 focus:border-amber-500'
                    }`}
                  />
                  {attemptedSubmit && !bookingData.guestName.trim() && (
                    <p className="mt-1 text-xs text-red-500">กรุณากรอกชื่อแขก</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    เลขห้อง <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bookingData.roomNumber}
                    onChange={(e) => setBookingData({ ...bookingData, roomNumber: e.target.value })}
                    placeholder="เช่น 1505"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 transition ${
                      attemptedSubmit && !bookingData.roomNumber.trim()
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-stone-300 focus:ring-amber-500 focus:border-amber-500'
                    }`}
                  />
                  {attemptedSubmit && !bookingData.roomNumber.trim() && (
                    <p className="mt-1 text-xs text-red-500">กรุณากรอกเลขห้อง</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={bookingData.phoneNumber}
                    onChange={(e) => setBookingData({ ...bookingData, phoneNumber: e.target.value })}
                    placeholder="เช่น 081-234-5678"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 transition ${
                      attemptedSubmit && !bookingData.phoneNumber.trim()
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-stone-300 focus:ring-amber-500 focus:border-amber-500'
                    }`}
                  />
                  {attemptedSubmit && !bookingData.phoneNumber.trim() && (
                    <p className="mt-1 text-xs text-red-500">กรุณากรอกเบอร์โทรศัพท์</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">จำนวนผู้รับบริการ</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        onClick={() => setBookingData({ ...bookingData, numberOfGuests: num })}
                        className={`py-3 px-4 rounded-xl text-sm font-medium transition ${
                          bookingData.numberOfGuests === num
                            ? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        {num} คน
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Select Duration */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold text-stone-900 mb-4">
                เลือกระยะเวลา <span className="text-red-500">*</span>
              </h3>
              <div className="space-y-3">
                {durationOptions.map((duration) => (
                  <button
                    key={duration}
                    onClick={() => setBookingData({ ...bookingData, selectedDuration: duration })}
                    className={`w-full p-4 rounded-xl border-2 text-left transition ${
                      bookingData.selectedDuration === duration
                        ? 'border-amber-700 bg-amber-50'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-stone-900">{service.name_th}</p>
                        <p className="text-sm text-stone-500">{duration} นาที • {bookingData.numberOfGuests} คน</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-700">฿{service.hotel_price * bookingData.numberOfGuests}</p>
                        {bookingData.numberOfGuests > 1 && (
                          <p className="text-xs text-stone-400">฿{service.hotel_price} × {bookingData.numberOfGuests}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {attemptedSubmit && !bookingData.selectedDuration && (
                <p className="mt-2 text-xs text-red-500">กรุณาเลือกระยะเวลาบริการ</p>
              )}
            </div>
          )}

          {/* Step 3: Date & Time + Booking Summary */}
          {step === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Date & Time Form */}
              <div>
                <h3 className="text-lg font-semibold text-stone-900 mb-4">เลือกวันและเวลา</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      วันที่ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={bookingData.date}
                      onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                      min={today}
                      className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      เวลา <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2">
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
                      className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Booking Summary */}
              <div>
                <div className="bg-stone-50 rounded-2xl p-6">
                  <h3 className="font-semibold text-stone-900 mb-4">สรุปการจอง</h3>

                  <div className="space-y-4">
                    {bookingData.guestName && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg">
                          <User className="w-4 h-4 text-stone-600" />
                        </div>
                        <div>
                          <p className="text-xs text-stone-500">แขก</p>
                          <p className="text-sm font-medium text-stone-900">{bookingData.guestName}</p>
                        </div>
                      </div>
                    )}

                    {bookingData.roomNumber && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg">
                          <MapPin className="w-4 h-4 text-stone-600" />
                        </div>
                        <div>
                          <p className="text-xs text-stone-500">ห้อง</p>
                          <p className="text-sm font-medium text-stone-900">#{bookingData.roomNumber}</p>
                        </div>
                      </div>
                    )}

                    {bookingData.phoneNumber && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg">
                          <Phone className="w-4 h-4 text-stone-600" />
                        </div>
                        <div>
                          <p className="text-xs text-stone-500">โทรศัพท์</p>
                          <p className="text-sm font-medium text-stone-900">{bookingData.phoneNumber}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg">
                        <Users className="w-4 h-4 text-stone-600" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">จำนวนผู้รับบริการ</p>
                        <p className="text-sm font-medium text-stone-900">{bookingData.numberOfGuests} คน</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg">
                        <CreditCard className="w-4 h-4 text-stone-600" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">บริการ</p>
                        <p className="text-sm font-medium text-stone-900">{service.name_th}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg">
                        <Clock className="w-4 h-4 text-stone-600" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">ระยะเวลา</p>
                        <p className="text-sm font-medium text-stone-900">{bookingData.selectedDuration} นาที</p>
                      </div>
                    </div>

                    {bookingData.date && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg">
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
                        <div className="p-2 bg-white rounded-lg">
                          <Clock className="w-4 h-4 text-stone-600" />
                        </div>
                        <div>
                          <p className="text-xs text-stone-500">เวลา</p>
                          <p className="text-sm font-medium text-stone-900">{bookingData.time}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-stone-200">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-stone-900">ยอดรวม</span>
                      <span className="text-lg font-bold text-amber-700">฿{service.hotel_price * bookingData.numberOfGuests}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Navigation Buttons */}
        <div className="p-6 border-t border-stone-100 bg-stone-50 rounded-b-3xl">
          {/* Helper Text - Show only after attempted submit */}
          {attemptedSubmit && (
            ((step === 1 && (!bookingData.guestName.trim() || !bookingData.roomNumber.trim() || !bookingData.phoneNumber.trim())) ||
            (step === 2 && !bookingData.selectedDuration) ||
            (step === 3 && (!bookingData.date || !bookingData.time))) && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700 flex items-center gap-2">
                <span className="w-4 h-4 text-amber-500">⚠️</span>
                {step === 1 && (!bookingData.guestName.trim() || !bookingData.roomNumber.trim() || !bookingData.phoneNumber.trim()) &&
                  'กรุณากรอกข้อมูลแขกให้ครบถ้วน (ชื่อแขก, เลขห้อง, เบอร์โทรศัพท์)'}
                {step === 2 && !bookingData.selectedDuration &&
                  'กรุณาเลือกระยะเวลาบริการ'}
                {step === 3 && (!bookingData.date || !bookingData.time) &&
                  'กรุณาเลือกวันที่และเวลาที่ต้องการรับบริการ'}
              </p>
            </div>
          ))}

          <div className="flex justify-between">
            {step > 1 ? (
              <button
                onClick={() => {
                  setStep(step - 1)
                  setAttemptedSubmit(false)
                }}
                className="px-6 py-3 bg-white text-stone-700 rounded-xl font-medium hover:bg-stone-100 transition border border-stone-200"
              >
                ย้อนกลับ
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-white text-stone-700 rounded-xl font-medium hover:bg-stone-100 transition border border-stone-200"
              >
                ยกเลิก
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={handleNextStep}
                className="px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition"
              >
                ถัดไป
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition"
              >
                ยืนยันการจอง
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookingModal