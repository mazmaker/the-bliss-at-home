import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, Clock, Check, X, ArrowLeft, ArrowRight, User } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@bliss/supabase/auth'
// import { hotelSupabase as supabase } from '../lib/supabaseClient'
import { secureBookingService } from '../services/secureBookingService'
import { useBookingStore } from '../hooks/useBookingStore'
import { useHotelContext } from '../hooks/useHotelContext'
import { Service, ProviderPreference } from '../types/booking'
import { createLoadingToast, notifications, showErrorByType } from '../utils/notifications'
import ServiceModeSelector from './ServiceModeSelector'
import CoupleFormatSelector from './CoupleFormatSelector'
import ServiceSelector from './ServiceSelector'
import PricingSummary from './PricingSummary'
import ProviderPreferenceSelector from './ProviderPreferenceSelector'

interface BookingModalNewProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  initialService?: Service // Optional initial service selection
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

  // Transform the data to match our Service type
  const transformedData = (data || []).map(service => ({
    ...service,
    duration_options: Array.isArray(service.duration_options)
      ? service.duration_options
      : null
  })) as Service[]

  return transformedData
}

function BookingModalNew({ isOpen, onClose, onSuccess, initialService }: BookingModalNewProps) {
  const {
    // Configuration state
    serviceConfiguration,
    currentStep,

    // Guest data
    guestName,
    roomNumber,
    phoneNumber,
    date,
    time,
    notes,
    providerPreference,

    // UI state
    isLoading,
    error,
    validation,

    // Actions
    setServiceMode,
    setCoupleFormat,
    addServiceSelection,
    clearServiceSelections,
    setGuestName,
    setRoomNumber,
    setPhoneNumber,
    setDate,
    setTime,
    setNotes,
    setProviderPreference,
    setCurrentStep,
    nextStep,
    previousStep,
    resetAll,
    canProceedToStep,
    getBookingData,
    isConfigurationComplete,
    setLoading
  } = useBookingStore()

  const navigate = useNavigate()
  const { hotelId, getHotelSlug } = useHotelContext()

  // Helper function to get provider preference label (moved to component scope)
  const getProviderPreferenceLabel = (preference: ProviderPreference): string => {
    switch (preference) {
      case 'female-only': return 'ผู้หญิงเท่านั้น (บังคับต้องเป็นผู้หญิง)'
      case 'male-only': return 'ผู้ชายเท่านั้น (บังคับต้องเป็นผู้ชาย)'
      case 'prefer-female': return 'ต้องการผู้หญิง (อยากได้ผู้หญิง แต่ถ้าไม่มีผู้ชายก็ได้)'
      case 'prefer-male': return 'ต้องการผู้ชาย (อยากได้ผู้ชาย แต่ถ้าไม่มีผู้หญิงก็ได้)'
      case 'no-preference': return 'ไม่ระบุ (ไม่สนใจเพศ)'
      default: return 'ไม่ระบุ (ไม่สนใจเพศ)'
    }
  }

  // Query services
  const { data: rawServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: fetchServices,
    enabled: isOpen
  })

  // Merge discount information from initialService into services array
  const services = useMemo(() => {
    if (!initialService) return rawServices

    return rawServices.map(service => {
      if (service.id === initialService.id) {
        // Merge discount information from initialService
        const mergedService = {
          ...service,
          discount_rate: initialService.discount_rate,
          original_price: initialService.original_price,
          price_60: initialService.price_60,
          price_90: initialService.price_90,
          price_120: initialService.price_120
        }

        return mergedService
      }
      return service
    })
  }, [rawServices, initialService])

  // Time slots
  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ]

  // Calculate minimum date and time (3 hours from now)
  const now = new Date()
  const minimumDateTime = new Date(now.getTime() + (3 * 60 * 60 * 1000)) // Add 3 hours
  const today = new Date().toISOString().split('T')[0]
  const minimumDate = minimumDateTime.toISOString().split('T')[0]
  const minimumTimeToday = minimumDateTime.toTimeString().slice(0, 5) // HH:MM format

  // Filter available time slots based on selected date and minimum time
  const getAvailableTimeSlots = (selectedDate: string) => {
    if (!selectedDate) return timeSlots

    // If selected date is today, filter out times that are less than 3 hours from now
    if (selectedDate === today) {
      return timeSlots.filter(timeSlot => {
        return timeSlot >= minimumTimeToday
      })
    }

    // If selected date is in the future, all time slots are available
    return timeSlots
  }

  const availableTimeSlots = getAvailableTimeSlots(date)

  // Initialize service mode when modal opens with initial service
  useEffect(() => {
    if (isOpen && initialService) {
      setServiceMode('single')
    }
  }, [isOpen, initialService, setServiceMode])

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetAll()
    }
  }, [isOpen])

  // Step definitions
  const steps = [
    { title: 'เลือกบริการ', description: 'เลือกบริการและจำนวนผู้รับบริการ' },
    { title: 'ข้อมูลแขก', description: 'กรอกข้อมูลผู้รับบริการ' },
    { title: 'เวลา & ยืนยัน', description: 'เลือกวันที่และเวลาที่ต้องการ' },
    { title: 'สำเร็จ', description: 'การจองเสร็จสิ้น' }
  ]

  const currentStepData = steps[currentStep]

  const handleNextStep = () => {
    if (canProceedToStep(currentStep + 1)) {
      nextStep()
    }
  }

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      previousStep()
    }
  }

  const handleSubmit = async () => {
    if (!validation.isValid) return

    // Create loading toast
    const loadingToast = createLoadingToast(notifications.booking.createLoading)

    try {
      setLoading(true)
      const bookingData = getBookingData()

      // Debug: Log service configuration before sending
      console.log('🔍 [BOOKING DEBUG] Service Configuration:', bookingData.serviceConfiguration)
      console.log('🔍 [BOOKING DEBUG] Service Selections:', bookingData.serviceConfiguration.selections)
      console.log('🔍 [BOOKING DEBUG] First Service:', bookingData.serviceConfiguration.selections[0])
      console.log('🔍 [BOOKING DEBUG] Service ID to send:', bookingData.serviceConfiguration.selections[0]?.service?.id)

      // Prepare booking data for secure API
      const secureBookingData = {
        // Hotel context from URL
        hotel_id: hotelId,
        // Use first service's ID for single service reference
        service_id: bookingData.serviceConfiguration.selections[0].service.id,
        booking_date: bookingData.date,
        booking_time: bookingData.time,
        duration: bookingData.serviceConfiguration.totalDuration,
        hotel_room_number: bookingData.roomNumber,
        // Staff assignment data
        provider_preference: bookingData.providerPreference || 'no-preference',
        recipient_count: bookingData.serviceConfiguration.recipientCount,
        // Required pricing data
        base_price: bookingData.serviceConfiguration.totalPrice,
        final_price: bookingData.serviceConfiguration.totalPrice,
        // Customer information
        customer_notes: `Guest: ${bookingData.guestName}, Phone: ${bookingData.phoneNumber}, Provider: ${getProviderPreferenceLabel(bookingData.providerPreference)}${bookingData.notes ? ', Notes: ' + bookingData.notes : ''}`,
        // Booking status
        status: 'confirmed',
        payment_status: 'pending',
        is_hotel_booking: true,
        // Include services for booking_services table
        services: bookingData.serviceConfiguration.selections.map(selection => ({
          service_id: selection.service.id,
          duration: selection.duration,
          price: selection.price,
          recipient_index: selection.recipientIndex,
          sort_order: selection.sortOrder
        }))
      }

      console.log('🏨 Submitting booking via secure API...')
      console.log('🔍 BOOKING DATA BEING SENT:', {
        hotel_id: hotelId,
        hotelId_value: hotelId,
        secureBookingData: secureBookingData
      })

      const result = await secureBookingService.createBooking(secureBookingData)

      if (!result.success) {
        throw new Error(result.error || 'Failed to create booking')
      }

      // Show enhanced success message with staff assignment info
      let successMessage = notifications.booking.createSuccess

      // Add staff assignment information if available
      if (result.staffAssignment?.success && result.staffAssignment.assignedStaff?.length > 0) {
        const staffNames = result.staffAssignment.assignedStaff.map((staff: any) => staff.name_th).join(', ')
        const providerPref = getProviderPreferenceLabel(result.staffAssignment.providerPreference)
        successMessage += `\n\n🎯 จัดสรรหมอนวดแล้ว: ${staffNames}\n✨ ตรงตามความต้องการ: ${providerPref}`
      } else if (result.staffAssignment && !result.staffAssignment.success) {
        successMessage += `\n\n⚠️ สร้างการจองสำเร็จ แต่ยังไม่ได้จัดสรรหมอนวด\n(จะจัดสรรภายหลัง)`
      }

      // Add warnings if any
      if (result.warnings?.length > 0) {
        successMessage += `\n\n⚠️ คำเตือน:\n${result.warnings.join('\n')}`
      }

      loadingToast.success(successMessage)

      // Move to success step (step 3)
      setCurrentStep(3)

      // Call success callback if provided
      onSuccess?.()

      // Navigate to hotel's booking history page
      navigate(`/hotel/${getHotelSlug()}/history`)

    } catch (err) {
      console.error('Booking failed:', err)
      loadingToast.error(notifications.booking.createError)
      showErrorByType(err)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    resetAll()
    onClose()
  }

  if (!isOpen) return null

  const canProceed = canProceedToStep(currentStep + 1)

  return createPortal(
    <div
      className="fixed inset-0 w-full h-full bg-black/50 flex items-center justify-center z-[9999] p-4"
      style={{ margin: 0, padding: 0 }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-100 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-stone-900">จองบริการให้แขก</h2>
            <p className="text-stone-500">{currentStepData.description}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="bg-white px-8 py-6 border-b border-stone-100 flex-shrink-0">
          <div className="flex items-center justify-center max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold shadow-sm ${
                      currentStep > index
                        ? 'bg-green-500 text-white' // Completed - Green
                        : currentStep === index
                        ? 'bg-[#B45309] text-white' // Current - Brown
                        : 'bg-gray-300 text-gray-600' // Upcoming - Gray
                    }`}
                  >
                    {currentStep > index ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={`mt-2 text-sm font-medium ${
                      currentStep >= index ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 h-1 mx-6 bg-gray-200 rounded-full min-w-[80px]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        currentStep > index ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                      style={{
                        width: currentStep > index ? '100%' : '0%'
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 p-8 overflow-y-auto scroll-smooth max-h-full">
            {/* Step 0: Service Configuration */}
            {currentStep === 0 && (
              <div className="space-y-8 max-w-4xl mx-auto">
                {/* Service Mode Selection */}
                <ServiceModeSelector
                  selectedMode={serviceConfiguration.mode}
                  onModeSelect={setServiceMode}
                  disabled={servicesLoading}
                />

                {/* Couple Format Selection */}
                {serviceConfiguration.mode === 'couple' && (
                  <CoupleFormatSelector
                    selectedFormat={serviceConfiguration.coupleFormat}
                    onFormatSelect={setCoupleFormat}
                    disabled={servicesLoading}
                  />
                )}

                {/* Service Selections */}
                {serviceConfiguration.mode &&
                 (serviceConfiguration.mode === 'single' || serviceConfiguration.coupleFormat) && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-stone-900 mb-4">
                        เลือกบริการ <span className="text-red-500">*</span>
                      </h3>
                    </div>

                    {serviceConfiguration.mode === 'single' && (
                      <ServiceSelector
                        services={services}
                        recipientIndex={0}
                        recipientName="ผู้รับบริการ"
                        selectedService={serviceConfiguration.selections.find(s => s.recipientIndex === 0)}
                        onServiceSelect={addServiceSelection}
                        onClearSelection={() => clearServiceSelections()}
                        disabled={servicesLoading}
                        initialServiceId={initialService?.id}
                      />
                    )}

                    {serviceConfiguration.mode === 'couple' && (
                      <div className="space-y-6">
                        <ServiceSelector
                          services={services}
                          recipientIndex={0}
                          recipientName="ผู้รับบริการ 1"
                          selectedService={serviceConfiguration.selections.find(s => s.recipientIndex === 0)}
                          onServiceSelect={addServiceSelection}
                          disabled={servicesLoading}
                        />
                        <ServiceSelector
                          services={services}
                          recipientIndex={1}
                          recipientName="ผู้รับบริการ 2"
                          selectedService={serviceConfiguration.selections.find(s => s.recipientIndex === 1)}
                          onServiceSelect={addServiceSelection}
                          disabled={servicesLoading}
                        />
                      </div>
                    )}
                  </div>
                )}


                {/* Scroll indicator for Step 0 */}
                {!isConfigurationComplete() && (
                  <div className="text-center pt-4">
                    <p className="text-xs text-stone-500 flex items-center justify-center gap-2">
                      <span>เลื่อนลงเพื่อดูตัวเลือกเพิ่มเติม</span>
                      <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 1: Guest Information */}
            {currentStep === 1 && (
              <div className="max-w-2xl mx-auto space-y-6">
                <h3 className="text-lg font-semibold text-stone-900 mb-4">ข้อมูลผู้รับบริการ</h3>

                {/* Selected Service Summary */}
                {serviceConfiguration.selections.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-stone-700 mb-3">บริการที่เลือก</h4>
                    <div className="space-y-3">
                      {serviceConfiguration.selections.map((selection) => (
                        <div key={selection.id} className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 bg-amber-600 rounded-full flex items-center justify-center">
                                  <User className="w-3 h-3 text-white" />
                                </div>
                                <h5 className="font-medium text-stone-900">
                                  {serviceConfiguration.mode === 'couple'
                                    ? `ผู้รับบริการ ${selection.recipientIndex + 1}`
                                    : 'ผู้รับบริการ'
                                  }
                                </h5>
                              </div>
                              <div className="pl-8 space-y-1">
                                <p className="text-sm font-medium text-stone-800">
                                  {selection.service.name_th}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-stone-600">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{selection.duration} นาที</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span>฿{selection.price.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Total Summary */}
                      <div className="bg-stone-100 rounded-xl p-4 border-2 border-stone-200">
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-stone-600">
                            <span>รวมทั้งหมด: {serviceConfiguration.selections.length} บริการ</span>
                            <span className="mx-2">•</span>
                            <span>{serviceConfiguration.totalDuration} นาที</span>
                          </div>
                          <div className="text-lg font-bold text-amber-700">
                            ฿{serviceConfiguration.totalPrice.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Basic Guest Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      ชื่อผู้รับบริการ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="เช่น John Smith"
                      className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      เลขห้อง <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      placeholder="เช่น 1505"
                      className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="เช่น 081-234-5678"
                    className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                  />
                </div>

                {/* Provider Preference Selection */}
                <div className="border-t pt-6">
                  <ProviderPreferenceSelector
                    selectedPreference={providerPreference}
                    onPreferenceChange={setProviderPreference}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Date & Time + Confirmation */}
            {currentStep === 2 && (
              <div className="max-w-4xl mx-auto space-y-8">
                <h3 className="text-lg font-semibold text-stone-900 mb-4">เลือกวันและเวลา & ยืนยันการจอง</h3>

                {/* Date & Time Section */}
                <div className="max-w-md mx-auto space-y-4">

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    วันที่ <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={minimumDate}
                      className="w-full px-4 py-3 pr-10 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    เวลา <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableTimeSlots.map((timeSlot) => (
                      <button
                        key={timeSlot}
                        onClick={() => setTime(timeSlot)}
                        className={`py-2 px-3 rounded-xl text-sm font-medium transition ${
                          time === timeSlot
                            ? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        {timeSlot}
                      </button>
                    ))}
                  </div>
                  {availableTimeSlots.length === 0 && (
                    <div className="text-center py-4 text-stone-500 text-sm">
                      ไม่มีเวลาที่สามารถจองได้ในวันนี้ กรุณาเลือกวันถัดไป
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">หมายเหตุ</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ระบุความต้องการพิเศษ..."
                    rows={3}
                    className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                </div>

                {/* Confirmation Section */}
                <div className="max-w-2xl mx-auto space-y-6 pt-6 border-t border-stone-200">
                  <h4 className="text-lg font-semibold text-stone-900">ตรวจสอบการจอง</h4>

                  {/* Guest Info Summary */}
                  <div className="bg-stone-50 rounded-xl p-4">
                    <h5 className="font-medium text-stone-900 mb-3">ข้อมูลแขก</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-stone-600">ชื่อ:</span>
                        <span className="text-stone-900">{guestName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-600">ห้อง:</span>
                        <span className="text-stone-900">{roomNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-600">โทรศัพท์:</span>
                        <span className="text-stone-900">{phoneNumber}</span>
                      </div>
                      {date && (
                        <div className="flex justify-between">
                          <span className="text-stone-600">วันที่:</span>
                          <span className="text-stone-900">{date}</span>
                        </div>
                      )}
                      {time && (
                        <div className="flex justify-between">
                          <span className="text-stone-600">เวลา:</span>
                          <span className="text-stone-900">{time}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Success */}
            {currentStep === 3 && (
              <div className="max-w-lg mx-auto space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-10 h-10 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-stone-900 mb-2">การจองสำเร็จ!</h3>
                  <p className="text-stone-600 mb-6">
                    การจองบริการสำหรับแขกเสร็จสิ้นแล้ว<br />
                    ระบบได้ส่งข้อมูลไปยังทีมหมอนวดแล้ว
                  </p>
                </div>

                {/* Booking Summary */}
                <div className="bg-green-50 rounded-xl p-6 text-left">
                  <h4 className="font-semibold text-stone-900 mb-3">สรุปการจอง</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-stone-600">แขก:</span>
                      <span className="text-stone-900">{guestName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">ห้อง:</span>
                      <span className="text-stone-900">#{roomNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">วันเวลา:</span>
                      <span className="text-stone-900">{date} {time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">บริการ:</span>
                      <span className="text-stone-900">
                        {serviceConfiguration.selections.map(s => s.service.name_th).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleClose}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
                  >
                    เสร็จสิ้น
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Pricing Summary (shown from step 0) */}
          {isConfigurationComplete() && (
            <div className="lg:w-80 bg-stone-50 p-6 border-l border-stone-100 overflow-y-auto flex-shrink-0">
              <PricingSummary
                configuration={serviceConfiguration}
                showDetails={false}
                compact={true}
              />
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="p-8 border-t border-stone-100 bg-white flex-shrink-0">
          {/* Validation errors */}
          {validation.errors && Object.keys(validation.errors).length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-800">
                {Object.entries(validation.errors).map(([key, errors]) => (
                  <div key={key}>
                    {errors.map((error, index) => (
                      <p key={index}>• {error}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Buttons - Hidden on success step */}
          {currentStep !== 3 && (
            <div className="flex justify-between">
              {currentStep > 0 ? (
                <button
                  onClick={handlePreviousStep}
                  className="flex items-center gap-3 px-10 py-4 bg-white text-stone-700 rounded-2xl font-bold text-lg hover:bg-[#b6d387]/20 transition-all duration-300 border-2 border-stone-400 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                >
                  <ArrowLeft className="w-6 h-6" />
                  ย้อนกลับ
                </button>
              ) : (
                <button
                  onClick={handleClose}
                  className="px-10 py-4 bg-white text-stone-700 rounded-2xl font-bold text-lg hover:bg-stone-100 transition-all duration-300 border-2 border-stone-400 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                >
                  ยกเลิก
                </button>
              )}

              {currentStep === 2 ? (
                <button
                  onClick={handleSubmit}
                  disabled={!validation.isValid || isLoading}
                  className={`px-12 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg ${
                    validation.isValid && !isLoading
                      ? 'bg-gradient-to-r from-[#B45309] to-[#B45309]/90 text-white hover:from-[#B45309]/90 hover:to-[#B45309] hover:shadow-xl transform hover:scale-[1.05] active:scale-[0.98]'
                      : 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-sm'
                  }`}
                >
                  {isLoading ? 'กำลังจอง...' : 'ยืนยันการจอง'}
                </button>
              ) : (
                <button
                  onClick={handleNextStep}
                  disabled={!canProceed}
                  className={`flex items-center gap-3 px-12 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg ${
                    canProceed
                      ? 'bg-gradient-to-r from-[#B45309] to-[#B45309]/90 text-white hover:from-[#B45309]/90 hover:to-[#B45309] hover:shadow-xl transform hover:scale-[1.05] active:scale-[0.98]'
                      : 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-sm'
                  }`}
                >
                  ถัดไป
                  <ArrowRight className="w-6 h-6" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default BookingModalNew