import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, Clock, Check, X, ArrowLeft, ArrowRight, User } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@bliss/supabase/auth'
// import { hotelSupabase as supabase } from '../lib/supabaseClient'
import { secureBookingService } from '../services/secureBookingService'
import { useBookingStore } from '../hooks/useBookingStore'
import { useHotelContext } from '../hooks/useHotelContext'
import { Service, ProviderPreference, ServiceAddon } from '../types/booking'
import { createLoadingToast, notifications, showErrorByType } from '../utils/notifications'
import ServiceModeSelector from './ServiceModeSelector'
import CoupleFormatSelector from './CoupleFormatSelector'
import ServiceSelector from './ServiceSelector'
import AddOnSelector from './AddOnSelector'
import PricingSummary from './PricingSummary'
import ProviderPreferenceSelector from './ProviderPreferenceSelector'
import { getAvailableHoursForDate, getAvailableMinutesForDateHour } from '../utils/timeSlots'

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

  // P5 STEP C: fetch the active add-on catalog once, then attach each add-on to every
  // eligible service (applies_to_all, or service_ids contains the service id) — same
  // eligibility rule as serviceService.getServiceById so the hotel picker matches customer.
  const { data: addonRows } = await supabase
    .from('service_addons')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const allAddons = (addonRows || []) as unknown as ServiceAddon[]

  // Transform the data to match our Service type
  const transformedData = (data || []).map(service => ({
    ...service,
    duration_options: Array.isArray(service.duration_options)
      ? service.duration_options
      : null,
    addons: allAddons.filter(
      (a) =>
        a.applies_to_all === true ||
        (Array.isArray(a.service_ids) && a.service_ids.includes(service.id))
    )
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
    setSelectionAddOns,
    getAddOnTotal,
    getFinalPrice,
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

  // Local state for two-step time selection
  const [selectedHour, setSelectedHour] = useState('')
  const [selectedMinute, setSelectedMinute] = useState('')

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

  // Available hours and minutes based on selected date
  const availableHours = date ? getAvailableHoursForDate(date) : []
  const availableMinutes = date && selectedHour ? getAvailableMinutesForDateHour(date, selectedHour) : []

  // Calculate minimum date and time (3 hours from now)
  const now = new Date()
  const minimumDateTime = new Date(now.getTime() + (3 * 60 * 60 * 1000)) // Add 3 hours
  const today = new Date().toISOString().split('T')[0]
  const minimumDate = minimumDateTime.toISOString().split('T')[0]

  // Calculate maximum date (14 days from today)
  const maxDate = useMemo(() => {
    const maxDateTime = new Date()
    maxDateTime.setDate(maxDateTime.getDate() + 14)
    return maxDateTime.toISOString().split('T')[0]
  }, [])

  // Update store time when hour and minute are both selected
  useEffect(() => {
    if (selectedHour && selectedMinute) {
      setTime(`${selectedHour}:${selectedMinute}`)
    } else {
      setTime('')
    }
  }, [selectedHour, selectedMinute, setTime])

  // Reset hour and minute when date changes
  useEffect(() => {
    setSelectedHour('')
    setSelectedMinute('')
  }, [date])

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
    { title: 'เลือกเวลา', description: 'เลือกวันที่และเวลาที่ต้องการ' },
    { title: 'ยืนยันการจอง', description: 'ตรวจสอบและยืนยันการจอง' },
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

      // P5 STEP C: per-recipient add-ons. Send only {addon_id, recipient_index, quantity};
      // the server's trg_snap_booking_addon re-snaps price/name from the catalog (anti-tamper).
      // base_price stays SERVICE-ONLY; add-on money rides on final_price (D3) and NEVER on staff
      // earnings (the server derives earnings from the retail service price, add-on-independent).
      const addonsPayload = bookingData.serviceConfiguration.selections.flatMap(selection =>
        (selection.addOns || []).map(addon => ({
          addon_id: addon.addon_id,
          recipient_index: selection.recipientIndex,
          quantity: 1
        }))
      )
      const serviceSubtotal = bookingData.serviceConfiguration.totalPrice
      const finalPriceWithAddons = getFinalPrice()

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
        // Required pricing data — base_price = service-only, final_price includes add-ons (D3)
        base_price: serviceSubtotal,
        final_price: finalPriceWithAddons,
        // Customer information
        customer_notes: `Guest: ${bookingData.guestName}, Phone: ${bookingData.phoneNumber}, Provider: ${getProviderPreferenceLabel(bookingData.providerPreference)}${bookingData.notes ? ', Notes: ' + bookingData.notes : ''}`,
        // Booking status — start as 'pending' until a staff accepts the job.
        // (Was hardcoded 'confirmed', which falsely showed "ยืนยันแล้ว" before any staff acceptance — C2.)
        status: 'pending',
        payment_status: 'pending',
        is_hotel_booking: true,
        // Include services for booking_services table
        services: bookingData.serviceConfiguration.selections.map(selection => ({
          service_id: selection.service.id,
          duration: selection.duration,
          price: selection.price,
          recipient_index: selection.recipientIndex,
          sort_order: selection.sortOrder
        })),
        // P5 STEP C: booking_addons rows (per recipient) — empty array if none picked
        addons: addonsPayload
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

      // Move to success step (step 4)
      setCurrentStep(4)

      // Don't call onSuccess here - let user see the success step first
      // onSuccess will be called when user clicks "เสร็จสิ้น" button

    } catch (err: any) {
      console.error('Booking failed:', err)

      // Handle specific error types
      if (err.message === 'DUPLICATE_BOOKING' || err.message?.includes('DUPLICATE_BOOKING')) {
        loadingToast.error('❌ การจองซ้ำซ้อน\n\nห้องนี้มีการจองในวันและเวลาเดียวกันอยู่แล้ว\nกรุณาเลือกเวลาอื่นหรือตรวจสอบการจองที่มีอยู่')
      } else if (err.message?.includes('HTTP 409')) {
        // Handle 409 Conflict as duplicate booking
        loadingToast.error('❌ การจองซ้ำซ้อน\n\nห้องนี้มีการจองในวันและเวลาเดียวกันอยู่แล้ว\nกรุณาเลือกเวลาอื่นหรือตรวจสอบการจองที่มีอยู่')
      } else {
        loadingToast.error(notifications.booking.createError)
        showErrorByType(err)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    resetAll()
    onClose()
  }

  // P5 STEP C: render the per-recipient add-on picker under a recipient's ServiceSelector.
  // Add-ons ride on the recipient's selected service (service.addons, attached in fetchServices);
  // picking them updates that selection's addOns in the store (0% commission pass-through).
  const renderAddOnSelector = (recipientIndex: number) => {
    const sel = serviceConfiguration.selections.find(s => s.recipientIndex === recipientIndex)
    const eligible = sel?.service.addons || []
    if (!sel || eligible.length === 0) return null
    const selectedIds = (sel.addOns || []).map(a => a.addon_id)
    return (
      <AddOnSelector
        addons={eligible}
        selectedIds={selectedIds}
        disabled={servicesLoading}
        onChange={(ids) =>
          setSelectionAddOns(
            recipientIndex,
            eligible
              .filter(a => ids.includes(a.id))
              .map(a => ({ addon_id: a.id, name_th: a.name_th, price: Number(a.price) }))
          )
        }
      />
    )
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
        <div className="flex items-center justify-between p-6 border-b border-bliss-100 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-bliss-900">จองบริการให้แขก</h2>
            <p className="text-bliss-500">{currentStepData.description}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-bliss-400 hover:text-bliss-600 hover:bg-bliss-100 rounded-xl transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="bg-white px-8 py-6 border-b border-bliss-100 flex-shrink-0">
          <div className="flex items-center justify-center max-w-4xl mx-auto">
            {steps.map((step, index) => {
              // On the final "สำเร็จ" step the booking is done, so mark every step
              // (including step 5 itself) as completed — otherwise the last step is
              // never `currentStep > index` and stays stuck on the "current" style.
              const isCompleted = currentStep > index || currentStep === steps.length - 1
              return (
              <div key={index} className="flex items-center">
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold shadow-sm ${
                      isCompleted
                        ? 'bg-bliss-600 text-white' // Completed - olive
                        : currentStep === index
                        ? 'bg-bliss-800 text-white' // Current - dark olive
                        : 'bg-bliss-200 text-bliss-600' // Upcoming - cream
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={`mt-2 text-sm font-medium ${
                      currentStep >= index ? 'text-bliss-900' : 'text-bliss-500'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 h-1 mx-6 bg-bliss-200 rounded-full min-w-[80px]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCompleted ? 'bg-bliss-500' : 'bg-bliss-200'
                      }`}
                      style={{
                        width: isCompleted ? '100%' : '0%'
                      }}
                    />
                  </div>
                )}
              </div>
              )
            })}
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
                      <h3 className="text-lg font-semibold text-bliss-900 mb-4">
                        เลือกบริการ <span className="text-red-500">*</span>
                      </h3>
                    </div>

                    {serviceConfiguration.mode === 'single' && (
                      <div>
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
                        {renderAddOnSelector(0)}
                      </div>
                    )}

                    {serviceConfiguration.mode === 'couple' && (
                      <div className="space-y-6">
                        <div>
                          <ServiceSelector
                            services={services}
                            recipientIndex={0}
                            recipientName="ผู้รับบริการ 1"
                            selectedService={serviceConfiguration.selections.find(s => s.recipientIndex === 0)}
                            onServiceSelect={addServiceSelection}
                            disabled={servicesLoading}
                          />
                          {renderAddOnSelector(0)}
                        </div>
                        <div>
                          <ServiceSelector
                            services={services}
                            recipientIndex={1}
                            recipientName="ผู้รับบริการ 2"
                            selectedService={serviceConfiguration.selections.find(s => s.recipientIndex === 1)}
                            onServiceSelect={addServiceSelection}
                            disabled={servicesLoading}
                          />
                          {renderAddOnSelector(1)}
                        </div>
                      </div>
                    )}
                  </div>
                )}


                {/* Scroll indicator for Step 0 */}
                {!isConfigurationComplete() && (
                  <div className="text-center pt-4">
                    <p className="text-xs text-bliss-500 flex items-center justify-center gap-2">
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
                <h3 className="text-lg font-semibold text-bliss-900 mb-4">ข้อมูลผู้รับบริการ</h3>

                {/* Selected Service Summary */}
                {serviceConfiguration.selections.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-bliss-700 mb-3">บริการที่เลือก</h4>
                    <div className="space-y-3">
                      {serviceConfiguration.selections.map((selection) => (
                        <div key={selection.id} className="bg-gradient-to-r from-bliss-50 to-bliss-100 border border-bliss-200 rounded-xl p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 bg-bliss-600 rounded-full flex items-center justify-center">
                                  <User className="w-3 h-3 text-white" />
                                </div>
                                <h5 className="font-medium text-bliss-900">
                                  {serviceConfiguration.mode === 'couple'
                                    ? `ผู้รับบริการ ${selection.recipientIndex + 1}`
                                    : 'ผู้รับบริการ'
                                  }
                                </h5>
                              </div>
                              <div className="pl-8 space-y-1">
                                <p className="text-sm font-medium text-bliss-800">
                                  {selection.service.name_th}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-bliss-600">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{selection.duration} นาที</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span>฿{selection.price.toLocaleString()}</span>
                                  </div>
                                </div>
                                {(selection.addOns || []).length > 0 && (
                                  <div className="pt-1 space-y-0.5">
                                    {(selection.addOns || []).map((addon) => (
                                      <div key={addon.addon_id} className="flex items-center justify-between text-xs text-bliss-600">
                                        <span>+ {addon.name_th}</span>
                                        <span>฿{Number(addon.price).toLocaleString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Total Summary */}
                      <div className="bg-bliss-100 rounded-xl p-4 border-2 border-bliss-200 space-y-2">
                        <div className="text-sm text-bliss-600">
                          <span>รวมทั้งหมด: {serviceConfiguration.selections.length} บริการ</span>
                          <span className="mx-2">•</span>
                          <span>{serviceConfiguration.totalDuration} นาที</span>
                        </div>
                        {getAddOnTotal() > 0 && (
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between items-center text-sm text-bliss-700">
                              <span>ค่าบริการ</span>
                              <span>฿{serviceConfiguration.totalPrice.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-bliss-700">
                              <span>บริการเสริม</span>
                              <span>+฿{getAddOnTotal().toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-bliss-200">
                          <span className="text-sm font-medium text-bliss-700">ยอดรวม</span>
                          <span className="text-lg font-bold text-bliss-700">
                            ฿{getFinalPrice().toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Basic Guest Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-2">
                      ชื่อผู้รับบริการ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="เช่น John Smith"
                      className="w-full px-4 py-3 border border-bliss-300 rounded-xl focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-2">
                      เลขห้อง <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      placeholder="เช่น 1505"
                      className="w-full px-4 py-3 border border-bliss-300 rounded-xl focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-bliss-700 mb-2">
                    เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="เช่น 081-234-5678"
                    className="w-full px-4 py-3 border border-bliss-300 rounded-xl focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500 transition"
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

            {/* Step 2: Date & Time Selection */}
            {currentStep === 2 && (
              <div className="max-w-md mx-auto space-y-6">
                <h3 className="text-lg font-semibold text-bliss-900 mb-4">เลือกวันและเวลา</h3>

                <div>
                  <label className="block text-sm font-medium text-bliss-700 mb-2">
                    วันที่บริการ <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-bliss-500 mb-2">
                    จองล่วงหน้าได้สูงสุด 14 วัน
                  </p>
                  <div className="relative">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={minimumDate}
                      max={maxDate}
                      className="w-full px-4 py-3 pr-10 border border-bliss-300 rounded-xl focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500 transition"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-bliss-400 pointer-events-none" />
                  </div>
                </div>

                {/* Time Selection - Step 1: Hour */}
                <div>
                  <label className="block text-sm font-medium text-bliss-700 mb-2">
                    เลือกชั่วโมง <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {availableHours.map((hour) => (
                      <button
                        key={hour}
                        onClick={() => {
                          setSelectedHour(hour)
                          setSelectedMinute('') // Reset minute selection
                        }}
                        className={`py-2 px-3 rounded-xl text-sm font-medium transition ${
                          selectedHour === hour
                            ? 'bg-gradient-to-r from-bliss-700 to-bliss-800 text-white'
                            : 'bg-bliss-100 text-bliss-700 hover:bg-bliss-200'
                        }`}
                      >
                        {hour}:00
                      </button>
                    ))}
                  </div>
                  {availableHours.length === 0 && (
                    <div className="text-center py-4 text-bliss-500 text-sm">
                      ไม่มีเวลาที่สามารถจองได้ในวันนี้ กรุณาเลือกวันถัดไป
                    </div>
                  )}
                </div>

                {/* Time Selection - Step 2: Minute */}
                {selectedHour && (
                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-2">
                      เลือกนาที <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {availableMinutes.map((minute) => (
                        <button
                          key={minute}
                          onClick={() => setSelectedMinute(minute)}
                          className={`py-2 px-3 rounded-xl text-sm font-medium transition ${
                            selectedMinute === minute
                              ? 'bg-gradient-to-r from-bliss-700 to-bliss-800 text-white'
                              : 'bg-bliss-100 text-bliss-700 hover:bg-bliss-200'
                          }`}
                        >
                          {selectedHour}:{minute}
                        </button>
                      ))}
                    </div>
                    {availableMinutes.length === 0 && (
                      <div className="text-center py-4 text-bliss-500 text-sm">
                        ไม่มีนาทีที่สามารถจองได้ในช่วงเวลานี้
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-bliss-700 mb-2">หมายเหตุ</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ระบุความต้องการพิเศษ..."
                    rows={3}
                    className="w-full px-4 py-3 border border-bliss-300 rounded-xl focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {currentStep === 3 && (
              <div className="max-w-4xl mx-auto space-y-8">
                <h3 className="text-lg font-semibold text-bliss-900 mb-4">ตรวจสอบและยืนยันการจอง</h3>

                {/* Selected Service Summary */}
                {serviceConfiguration.selections.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-bliss-700 mb-3">บริการที่เลือก</h4>
                    <div className="space-y-3">
                      {serviceConfiguration.selections.map((selection) => (
                        <div key={selection.id} className="bg-gradient-to-r from-bliss-50 to-bliss-100 border border-bliss-200 rounded-xl p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 bg-bliss-600 rounded-full flex items-center justify-center">
                                  <User className="w-3 h-3 text-white" />
                                </div>
                                <h5 className="font-medium text-bliss-900">
                                  {serviceConfiguration.mode === 'couple'
                                    ? `ผู้รับบริการ ${selection.recipientIndex + 1}`
                                    : 'ผู้รับบริการ'
                                  }
                                </h5>
                              </div>
                              <div className="pl-8 space-y-1">
                                <p className="text-sm font-medium text-bliss-800">
                                  {selection.service.name_th}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-bliss-600">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{selection.duration} นาที</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span>฿{selection.price.toLocaleString()}</span>
                                  </div>
                                </div>
                                {(selection.addOns || []).length > 0 && (
                                  <div className="pt-1 space-y-0.5">
                                    {(selection.addOns || []).map((addon) => (
                                      <div key={addon.addon_id} className="flex items-center justify-between text-xs text-bliss-600">
                                        <span>+ {addon.name_th}</span>
                                        <span>฿{Number(addon.price).toLocaleString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Total Summary */}
                      <div className="bg-bliss-100 rounded-xl p-4 border-2 border-bliss-200 space-y-2">
                        <div className="text-sm text-bliss-600">
                          <span>รวมทั้งหมด: {serviceConfiguration.selections.length} บริการ</span>
                          <span className="mx-2">•</span>
                          <span>{serviceConfiguration.totalDuration} นาที</span>
                        </div>
                        {getAddOnTotal() > 0 && (
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between items-center text-sm text-bliss-700">
                              <span>ค่าบริการ</span>
                              <span>฿{serviceConfiguration.totalPrice.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-bliss-700">
                              <span>บริการเสริม</span>
                              <span>+฿{getAddOnTotal().toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-bliss-200">
                          <span className="text-sm font-medium text-bliss-700">ยอดรวม</span>
                          <span className="text-lg font-bold text-bliss-700">
                            ฿{getFinalPrice().toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Guest Info Summary */}
                <div className="bg-bliss-50 rounded-xl p-4">
                  <h5 className="font-medium text-bliss-900 mb-3">ข้อมูลการจอง</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-bliss-600">แขก:</span>
                      <span className="text-bliss-900">{guestName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bliss-600">ห้อง:</span>
                      <span className="text-bliss-900">#{roomNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bliss-600">โทรศัพท์:</span>
                      <span className="text-bliss-900">{phoneNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bliss-600">วันที่:</span>
                      <span className="text-bliss-900">{date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bliss-600">เวลา:</span>
                      <span className="text-bliss-900">{time}</span>
                    </div>
                    {notes && (
                      <div className="flex justify-between">
                        <span className="text-bliss-600">หมายเหตุ:</span>
                        <span className="text-bliss-900">{notes}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-bliss-600">ความต้องการผู้ให้บริการ:</span>
                      <span className="text-bliss-900 text-xs">{getProviderPreferenceLabel(providerPreference)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Success */}
            {currentStep === 4 && (
              <div className="max-w-lg mx-auto space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-bliss-100 rounded-full flex items-center justify-center">
                    <Check className="w-10 h-10 text-bliss-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-bliss-900 mb-2">การจองสำเร็จ!</h3>
                  <p className="text-bliss-600 mb-6">
                    การจองบริการสำหรับแขกเสร็จสิ้นแล้ว<br />
                    ระบบได้ส่งข้อมูลไปยังทีมหมอนวดแล้ว
                  </p>
                </div>

                {/* Booking Summary */}
                <div className="bg-bliss-50 rounded-xl p-6 text-left">
                  <h4 className="font-semibold text-bliss-900 mb-3">สรุปการจอง</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-bliss-600">แขก:</span>
                      <span className="text-bliss-900">{guestName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bliss-600">ห้อง:</span>
                      <span className="text-bliss-900">#{roomNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bliss-600">วันเวลา:</span>
                      <span className="text-bliss-900">{date} {time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bliss-600">บริการ:</span>
                      <span className="text-bliss-900">
                        {serviceConfiguration.selections.map(s => s.service.name_th).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 space-y-3">
                  {/* View History Button */}
                  <button
                    onClick={() => {
                      handleClose()
                      navigate(`/hotel/${getHotelSlug()}/history`)
                    }}
                    className="w-full px-6 py-3 bg-bliss-600 text-white rounded-xl font-medium hover:bg-bliss-700 transition-colors"
                  >
                    ดูประวัติการจอง
                  </button>

                  {/* Close Modal Button */}
                  <button
                    onClick={() => {
                      onSuccess?.()
                      handleClose()
                    }}
                    className="w-full px-6 py-3 bg-gradient-to-r from-bliss-600 to-bliss-700 text-white rounded-xl font-medium hover:from-bliss-700 hover:to-bliss-800 transition-colors"
                  >
                    เสร็จสิ้น
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Pricing Summary (shown from step 0) */}
          {isConfigurationComplete() && (
            <div className="lg:w-80 bg-bliss-50 p-6 border-l border-bliss-100 overflow-y-auto flex-shrink-0">
              <PricingSummary
                configuration={serviceConfiguration}
                showDetails={false}
                compact={true}
              />
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="p-8 border-t border-bliss-100 bg-white flex-shrink-0">
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
          {currentStep !== 4 && (
            <div className="flex justify-between">
              {currentStep > 0 ? (
                <button
                  onClick={handlePreviousStep}
                  className="flex items-center gap-3 px-10 py-4 bg-white text-bliss-700 rounded-2xl font-bold text-lg hover:bg-[#7a875f]/20 transition-all duration-300 border-2 border-bliss-400 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                >
                  <ArrowLeft className="w-6 h-6" />
                  ย้อนกลับ
                </button>
              ) : (
                <button
                  onClick={handleClose}
                  className="px-10 py-4 bg-white text-bliss-700 rounded-2xl font-bold text-lg hover:bg-bliss-100 transition-all duration-300 border-2 border-bliss-400 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                >
                  ยกเลิก
                </button>
              )}

              {currentStep === 3 ? (
                <button
                  onClick={handleSubmit}
                  disabled={!validation.isValid || isLoading}
                  className={`px-12 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg ${
                    validation.isValid && !isLoading
                      ? 'bg-gradient-to-r from-[#464a28] to-[#464a28]/90 text-white hover:from-[#464a28]/90 hover:to-[#464a28] hover:shadow-xl transform hover:scale-[1.05] active:scale-[0.98]'
                      : 'bg-bliss-300 text-bliss-500 cursor-not-allowed shadow-sm'
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
                      ? 'bg-gradient-to-r from-[#464a28] to-[#464a28]/90 text-white hover:from-[#464a28]/90 hover:to-[#464a28] hover:shadow-xl transform hover:scale-[1.05] active:scale-[0.98]'
                      : 'bg-bliss-300 text-bliss-500 cursor-not-allowed shadow-sm'
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