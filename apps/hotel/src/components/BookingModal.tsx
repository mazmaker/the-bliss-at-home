import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Calendar,
  Clock,
  Check,
  X,
  User,
  MapPin,
  Phone,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@bliss/supabase/auth'
import { useBookingStore } from '../hooks/useBookingStore'
import ServiceModeSelector from './ServiceModeSelector'
import ServiceSelector from './ServiceSelector'
import CoupleFormatSelector from './CoupleFormatSelector'
import ProviderPreferenceSelector from './ProviderPreferenceSelector'
import type { Service, ServiceSelection } from '../types/booking'

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  service?: Service | null
}

// Fetch services from database
const fetchServices = async (): Promise<Service[]> => {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch services: ${error.message}`)
  }

  // Cast and transform the data to match our Service type
  const services: Service[] = (data || []).map(item => ({
    ...item,
    duration_options: Array.isArray(item.duration_options)
      ? item.duration_options as number[]
      : null
  }))

  return services
}

function BookingModal({ isOpen, onClose, onSuccess, service }: BookingModalProps) {
  const {
    // Store state
    serviceConfiguration,
    currentStep,
    guestName,
    roomNumber,
    phoneNumber,
    date,
    time,
    notes,
    providerPreference,
    isLoading,

    // Store actions
    setServiceMode,
    setCoupleFormat,
    addServiceSelection,
    removeServiceSelection,
    setGuestName,
    setRoomNumber,
    setPhoneNumber,
    setDate,
    setTime,
    setNotes,
    setProviderPreference,
    nextStep,
    previousStep,
    resetAll,
    canProceedToStep,
    validateConfiguration,
    getTotalPrice,
    getTotalDuration,
    getBookingData,
    isConfigurationComplete
  } = useBookingStore()

  // Fetch services
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: fetchServices,
    enabled: isOpen
  })

  // Reset store when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      resetAll()
      // If opened with a specific service, auto-select it
      if (service) {
        const selection: ServiceSelection = {
          id: `${service.id}-${Date.now()}`,
          service,
          duration: service.duration,
          price: service.hotel_price || service.base_price,
          recipientIndex: 0,
          recipientName: '',
          sortOrder: 0
        }
        addServiceSelection(selection)
      }
    }
  }, [isOpen, service, resetAll, addServiceSelection])

  // Time slots
  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00',
    '17:00', '18:00', '19:00', '20:00'
  ]

  const today = new Date().toISOString().split('T')[0]

  const handleServiceSelect = (selection: ServiceSelection) => {
    addServiceSelection(selection)
  }

  const handleServiceRemove = (index: number) => {
    removeServiceSelection(index)
  }

  const handleNext = () => {
    if (canProceedToStep(currentStep + 1)) {
      nextStep()
    }
  }

  const handlePrevious = () => {
    previousStep()
  }

  const handleSubmit = () => {
    if (!isConfigurationComplete()) return

    const bookingData = getBookingData()
    console.log('Enhanced Booking submitted:', bookingData)

    // Here you would normally send the booking to your backend
    alert('การจองสำเร็จ! ระบบใหม่พร้อมใช้งาน')

    if (onSuccess) {
      onSuccess()
    } else {
      onClose()
    }
  }

  const handleClose = () => {
    resetAll()
    onClose()
  }

  if (!isOpen) return null

  const totalPrice = getTotalPrice()
  const totalDuration = getTotalDuration()
  const currentValidation = validateConfiguration()

  // Step titles
  const stepTitles = [
    'เลือกบริการ',
    'ข้อมูลแขก',
    'เวลา & ยืนยัน',
    'สำเร็จ'
  ]

  return createPortal(
    <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto mx-4 my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-100">
          <div>
            <h2 className="text-xl font-bold text-stone-900">จองบริการให้แขก</h2>
            <p className="text-stone-500">ระบบจองแบบใหม่ - เลือกเดี่ยวหรือคู่</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b border-stone-100">
          <div className="flex items-center justify-between">
            {stepTitles.map((title, index) => (
              <div key={index} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                    index === currentStep
                      ? 'bg-amber-600 text-white'
                      : index < currentStep
                        ? 'bg-green-600 text-white'
                        : 'bg-stone-200 text-stone-500'
                  }`}
                >
                  {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <span
                  className={`ml-2 text-sm ${
                    index === currentStep
                      ? 'text-stone-900 font-semibold'
                      : index < currentStep
                        ? 'text-green-600'
                        : 'text-stone-500'
                  }`}
                >
                  {title}
                </span>
                {index < stepTitles.length - 1 && (
                  <div className="w-8 h-px bg-stone-200 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px]">
          {/* Step 0: Service Selection */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-stone-900 mb-2">เลือกประเภทการรับบริการ</h3>
                <ServiceModeSelector
                  selectedMode={serviceConfiguration.mode}
                  onModeSelect={setServiceMode}
                />
              </div>

              {serviceConfiguration.mode === 'couple' && (
                <div>
                  <h3 className="text-lg font-semibold text-stone-900 mb-2">รูปแบบการรับบริการสำหรับคู่</h3>
                  <CoupleFormatSelector
                    selectedFormat={serviceConfiguration.coupleFormat}
                    onFormatSelect={setCoupleFormat}
                  />
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-stone-900 mb-2">เลือกบริการ</h3>
                {servicesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto" />
                      <p className="mt-2 text-stone-500">กำลังโหลดบริการ...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Array.from({ length: serviceConfiguration.recipientCount }).map((_, index) => (
                      <div key={index} className="border border-stone-200 rounded-lg p-4">
                        <h4 className="font-medium text-stone-900 mb-3">
                          {serviceConfiguration.mode === 'couple'
                            ? `ผู้รับบริการคนที่ ${index + 1}`
                            : 'เลือกบริการ'
                          }
                        </h4>
                        <ServiceSelector
                          services={services}
                          recipientIndex={index}
                          selectedService={serviceConfiguration.selections.find(s => s.recipientIndex === index)}
                          onServiceSelect={handleServiceSelect}
                          onClearSelection={() => {
                            const selectionIndex = serviceConfiguration.selections.findIndex(s => s.recipientIndex === index)
                            if (selectionIndex !== -1) {
                              handleServiceRemove(selectionIndex)
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Price Summary */}
              {serviceConfiguration.selections.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-2">สรุปราคา</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>ระยะเวลารวม:</span>
                      <span className="font-medium">{totalDuration} นาที</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold">
                      <span>ราคารวม:</span>
                      <span>฿{totalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Errors */}
              {currentValidation.errors.serviceSelection && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium text-red-900">กรุณาแก้ไขข้อผิดพลาด:</h4>
                      <ul className="mt-1 text-sm text-red-700">
                        {currentValidation.errors.serviceSelection.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Guest Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-stone-900">ข้อมูลแขก</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    ชื่อแขก *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition"
                      placeholder="เช่น คุณสมชาย ใจดี"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    เลขห้อง *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition"
                      placeholder="เช่น 1205"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  เบอร์โทรศัพท์ *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition"
                    placeholder="เช่น 081-234-5678"
                  />
                </div>
              </div>

              {/* Validation Errors */}
              {currentValidation.errors.guestInfo && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium text-red-900">กรุณาแก้ไขข้อผิดพลาด:</h4>
                      <ul className="mt-1 text-sm text-red-700">
                        {currentValidation.errors.guestInfo.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Date & Time */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-stone-900">เลือกวันที่และเวลา</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    วันที่ *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={today}
                      className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    เวลา *
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                    <select
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition appearance-none"
                    >
                      <option value="">เลือกเวลา</option>
                      {timeSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  หมายเหตุ (ไม่บังคับ)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition resize-none"
                  placeholder="หมายเหตุเพิ่มเติม..."
                />
              </div>

              {/* Provider Preference for all bookings */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  ความต้องการผู้ให้บริการ
                </label>
                <ProviderPreferenceSelector
                  selectedPreference={providerPreference}
                  onPreferenceChange={setProviderPreference}
                />
              </div>

              {/* Validation Errors */}
              {currentValidation.errors.dateTime && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium text-red-900">กรุณาแก้ไขข้อผิดพลาด:</h4>
                      <ul className="mt-1 text-sm text-red-700">
                        {currentValidation.errors.dateTime.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Final Summary */}
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                <h4 className="font-semibold text-stone-900 mb-3">สรุปการจอง</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>ประเภท:</span>
                    <span className="font-medium">
                      {serviceConfiguration.mode === 'single' ? 'เดี่ยว' : 'คู่'}
                      {serviceConfiguration.coupleFormat && ` (${serviceConfiguration.coupleFormat === 'simultaneous' ? 'พร้อมกัน' : 'ทีละคน'})`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>บริการ:</span>
                    <div className="text-right">
                      {serviceConfiguration.selections.map((selection, index) => (
                        <div key={index} className="font-medium">
                          {selection.service.name_th} ({selection.duration} นาที)
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span>แขก:</span>
                    <span className="font-medium">{guestName} (ห้อง {roomNumber})</span>
                  </div>
                  <div className="flex justify-between">
                    <span>วันเวลา:</span>
                    <span className="font-medium">
                      {date && new Date(date).toLocaleDateString('th-TH')} {time}
                    </span>
                  </div>
                  <div className="border-t border-stone-300 pt-2 mt-2">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>ราคารวม:</span>
                      <span>฿{totalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-stone-100 px-6 py-4">
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="flex items-center gap-2 px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                ย้อนกลับ
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition"
            >
              ยกเลิก
            </button>

            {currentStep < 2 ? (
              <button
                onClick={handleNext}
                disabled={!canProceedToStep(currentStep + 1)}
                className="flex items-center gap-2 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition"
              >
                ถัดไป
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!isConfigurationComplete() || !currentValidation.isValid}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-stone-300 disabled:cursor-not-allowed transition"
              >
                <Check className="w-4 h-4" />
                ยืนยันการจอง
              </button>
            )}
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/20 rounded-3xl flex items-center justify-center">
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto" />
              <p className="mt-2 text-stone-600">กำลังดำเนินการ...</p>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export default BookingModal