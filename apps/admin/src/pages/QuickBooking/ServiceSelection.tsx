import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, Clock, MapPin, Calendar, Tag, AlertCircle, CheckCircle, X, User, ChevronRight, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { adminBookingService } from '@bliss/supabase'
import { GoogleMapsPicker } from '../../components/GoogleMapsPicker'

interface Service {
  id: string
  name_th: string
  name_en: string
  description_th?: string
  category: 'massage' | 'nail' | 'spa' | 'facial'
  duration: number
  duration_options?: number[]
  base_price: number
  hotel_price: number
  price_60?: number
  price_90?: number
  price_120?: number
  image_url?: string
  is_active: boolean
  sort_order: number
}

interface ServiceSelection {
  id: string
  service: Service
  duration: number
  recipientIndex: number
  recipientName?: string
  price: number
  sortOrder: number
}

interface DurationOption {
  value: number
  label: string
  isAvailable: boolean
}

interface Promotion {
  id: string
  name_th: string
  code: string
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: number
  min_order_amount?: number
  max_discount?: number
  applies_to: string
  target_services?: string[]
  target_categories?: string[]
}

interface PricingDetails {
  base_price: number
  discount_amount: number
  final_price: number
  customer_discount?: number
  code_discount?: number
}

interface Props {
  customer: any
  selectedService?: ServiceSelection
  selectedAddOns?: Service[]
  basePricing?: PricingDetails
  onServiceSelect: (service: Service, addOns: Service[], pricing: PricingDetails, details: any) => void
  onNext?: () => void
  onBack: () => void
}

const categoryLabels = {
  massage: { th: 'นวดแผนไทย', en: 'Massage' },
  nail: { th: 'ทำเล็บ', en: 'Nail' },
  spa: { th: 'สปา', en: 'Spa' },
  facial: { th: 'ดูแลผิวหน้า', en: 'Facial' }
}

const categoryColors = {
  massage: 'bg-green-100 text-green-800 border-green-200',
  nail: 'bg-pink-100 text-pink-800 border-pink-200',
  spa: 'bg-blue-100 text-blue-800 border-blue-200',
  facial: 'bg-purple-100 text-purple-800 border-purple-200'
}

// Thai provinces data (main provinces)
const provinces = [
  { id: '10', name: 'กรุงเทพมหานคร', code: 'BKK' },
  { id: '11', name: 'สมุทรปราการ', code: 'SPK' },
  { id: '12', name: 'นนทบุรี', code: 'NTB' },
  { id: '13', name: 'ปทุมธานี', code: 'PTN' },
  { id: '14', name: 'พระนครศรีอยุธยา', code: 'AYT' },
  { id: '15', name: 'อ่างทอง', code: 'ATG' },
  { id: '16', name: 'ลพบุรี', code: 'LBR' },
  { id: '17', name: 'สิงห์บุรี', code: 'SBR' },
  { id: '18', name: 'ชัยนาท', code: 'CNT' },
  { id: '19', name: 'สระบุรี', code: 'SBR' },
  { id: '20', name: 'ชลบุรี', code: 'CBR' },
  { id: '21', name: 'ระยอง', code: 'RYG' },
  { id: '22', name: 'จันทบุรี', code: 'JNT' },
  { id: '23', name: 'ตราด', code: 'TRD' },
  { id: '24', name: 'ฉะเชิงเทรา', code: 'CCT' },
  { id: '25', name: 'ปราจีนบุรี', code: 'PJN' },
  { id: '26', name: 'นครนายก', code: 'NNK' },
  { id: '27', name: 'สระแก้ว', code: 'SKW' },
  // Add more provinces as needed
]

// Sample districts for Bangkok (for demo)
const bangkokDistricts = [
  { id: '1001', name: 'พระนคร', province_id: '10' },
  { id: '1002', name: 'ดุสิต', province_id: '10' },
  { id: '1003', name: 'หนองจอก', province_id: '10' },
  { id: '1004', name: 'บางรัก', province_id: '10' },
  { id: '1005', name: 'บางเขน', province_id: '10' },
  { id: '1006', name: 'บางกะปิ', province_id: '10' },
  { id: '1007', name: 'ปทุมวัน', province_id: '10' },
  { id: '1008', name: 'ป้อมปราบศัตรูพ่าย', province_id: '10' },
  { id: '1009', name: 'พระโขนง', province_id: '10' },
  { id: '1010', name: 'มีนบุรี', province_id: '10' },
  // Add more as needed
]

export default function ServiceSelection({
  customer,
  selectedService,
  selectedAddOns = [],
  basePricing,
  onServiceSelect,
  onNext,
  onBack
}: Props) {
  const [services, setServices] = useState<Service[]>([])
  const [filteredServices, setFilteredServices] = useState<Service[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Two-step service selection state (like Hotel app)
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    selectedService?.service.id || null
  )
  const [selectedDuration, setSelectedDuration] = useState<number | null>(
    selectedService?.duration || null
  )
  const [step, setStep] = useState<'service' | 'duration' | 'details'>('service')

  // Booking details state
  const [bookingDate, setBookingDate] = useState('')
  const [selectedHour, setSelectedHour] = useState('')
  const [selectedMinute, setSelectedMinute] = useState('')
  const [isHotelBooking, setIsHotelBooking] = useState(false)
  const [hotelId, setHotelId] = useState('')

  // Address details state for home/office booking
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [address, setAddress] = useState('')
  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [subdistrict, setSubdistrict] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [mapLocation, setMapLocation] = useState<{lat: number, lng: number} | null>(null)

  const [discountCode, setDiscountCode] = useState('')
  const [appliedPromotion, setAppliedPromotion] = useState<Promotion | null>(null)
  const [isValidatingCode, setIsValidatingCode] = useState(false)

  // Current selection
  const [currentServiceSelection, setCurrentServiceSelection] = useState<ServiceSelection | null>(selectedService || null)
  const [currentPricing, setCurrentPricing] = useState<PricingDetails | null>(basePricing || null)


  // Load services on mount
  useEffect(() => {
    loadServices()
  }, [])

  // Filter services when category changes
  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredServices(services)
    } else {
      setFilteredServices(services.filter(service => service.category === selectedCategory))
    }
  }, [services, selectedCategory])

  // Initialize from existing selection
  useEffect(() => {
    if (selectedService) {
      setSelectedServiceId(selectedService.service.id)
      setSelectedDuration(selectedService.duration)
      setCurrentServiceSelection(selectedService)
      setStep('details')
    }
  }, [selectedService])

  // Recalculate pricing when selection changes
  useEffect(() => {
    if (currentServiceSelection) {
      calculatePricing(currentServiceSelection)
    }
  }, [currentServiceSelection, isHotelBooking, appliedPromotion, customer.id])

  // Set default date and time
  useEffect(() => {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (!bookingDate) {
      setBookingDate(tomorrow.toISOString().split('T')[0])
    }
    if (!selectedHour) {
      setSelectedHour('14') // Default to 2 PM
    }
    if (!selectedMinute) {
      setSelectedMinute('00') // Default to :00
    }
  }, [])

  const loadServices = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true })

      if (error) throw error

      setServices(data || [])
    } catch (err: any) {
      setError('ไม่สามารถโหลดบริการได้: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Price calculation utilities (based on Hotel app)
  const calculateServicePrice = (service: Service, duration: number): number => {
    // Use admin-set prices when available
    if (duration === 60 && service.price_60) return service.price_60
    if (duration === 90 && service.price_90) return service.price_90
    if (duration === 120 && service.price_120) return service.price_120

    // Fallback to proportional calculation using base_price (not hotel_price for admin)
    const baseRatePerMinute = service.base_price / service.duration
    return Math.round(baseRatePerMinute * duration)
  }

  // Get duration options for selected service (like Hotel app)
  const getDurationOptions = (service: Service): DurationOption[] => {
    if (service.duration_options && Array.isArray(service.duration_options) && service.duration_options.length > 0) {
      return service.duration_options
        .sort((a, b) => a - b)
        .map(duration => ({
          value: duration,
          label: `${duration} นาที`,
          isAvailable: true
        }))
    }

    return [{
      value: service.duration,
      label: `${service.duration} นาที`,
      isAvailable: true
    }]
  }

  const calculatePricing = async (serviceSelection: ServiceSelection) => {
    if (!serviceSelection) return

    try {
      const basePrice = calculateServicePrice(serviceSelection.service, serviceSelection.duration)
      let discountAmount = 0
      let customerDiscount = 0
      let codeDiscount = 0

      // Apply customer loyalty discount
      if (customer.total_bookings >= 10) {
        customerDiscount = basePrice * 0.1
        discountAmount += customerDiscount
      } else if (customer.total_bookings >= 5) {
        customerDiscount = basePrice * 0.05
        discountAmount += customerDiscount
      }

      // Apply promotion discount
      if (appliedPromotion) {
        if (appliedPromotion.discount_type === 'percentage') {
          const promoDiscount = basePrice * (appliedPromotion.discount_value / 100)
          codeDiscount = appliedPromotion.max_discount
            ? Math.min(promoDiscount, appliedPromotion.max_discount)
            : promoDiscount
        } else {
          codeDiscount = appliedPromotion.discount_value
        }
        discountAmount += codeDiscount
      }

      setCurrentPricing({
        base_price: basePrice,
        discount_amount: discountAmount,
        final_price: Math.max(0, basePrice - discountAmount),
        customer_discount: customerDiscount,
        code_discount: codeDiscount
      })
    } catch (err: any) {
      console.error('Pricing calculation error:', err)
    }
  }

  // Service selection handlers (like Hotel app)
  const handleServiceClick = (service: Service) => {
    setSelectedServiceId(service.id)
    setError('')
    const durationOptions = getDurationOptions(service)

    // Auto-select duration if there's only one option
    if (durationOptions.length === 1) {
      const duration = durationOptions[0].value
      setSelectedDuration(duration)

      const calculatedPrice = calculateServicePrice(service, duration)
      const selection: ServiceSelection = {
        id: `admin-${service.id}-${duration}`,
        service,
        duration,
        recipientIndex: 0,
        recipientName: customer.full_name,
        price: calculatedPrice,
        sortOrder: 0
      }

      setCurrentServiceSelection(selection)
      setStep('details') // Skip duration selection, go directly to details
    } else {
      // Multiple duration options - show duration selection step
      setSelectedDuration(null)
      setCurrentServiceSelection(null)
      setStep('duration')
    }
  }

  const handleDurationSelect = (duration: number) => {
    if (!selectedServiceId) return

    const service = services.find(s => s.id === selectedServiceId)
    if (!service) return

    setSelectedDuration(duration)

    const calculatedPrice = calculateServicePrice(service, duration)
    const selection: ServiceSelection = {
      id: `admin-${service.id}-${duration}`,
      service,
      duration,
      recipientIndex: 0,
      recipientName: customer.full_name,
      price: calculatedPrice,
      sortOrder: 0
    }

    setCurrentServiceSelection(selection)
    setStep('details')
  }

  const handleBackToServices = () => {
    setStep('service')
    setSelectedServiceId(null)
    setSelectedDuration(null)
    setCurrentServiceSelection(null)
  }

  const handleBackToDuration = () => {
    setStep('duration')
    setSelectedDuration(null)
    setCurrentServiceSelection(null)
  }

  const validateDiscountCode = async (code: string) => {
    if (!code.trim()) {
      setAppliedPromotion(null)
      return
    }

    setIsValidatingCode(true)
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .lte('start_date', new Date().toISOString())
        .single()

      if (error || !data) {
        setAppliedPromotion(null)
        setError('โค้ดส่วนลดไม่ถูกต้องหรือหมดอายุแล้ว')
        return
      }

      // Check if promotion applies to current service
      if (data.applies_to === 'specific_services' && currentService) {
        if (!data.target_services?.includes(currentService.id)) {
          setAppliedPromotion(null)
          setError('โค้ดส่วนลดนี้ไม่สามารถใช้กับบริการที่เลือกได้')
          return
        }
      } else if (data.applies_to === 'categories' && currentService) {
        if (!data.target_categories?.includes(currentService.category)) {
          setAppliedPromotion(null)
          setError('โค้ดส่วนลดนี้ไม่สามารถใช้กับหมวดหมู่บริการที่เลือกได้')
          return
        }
      }

      // Check minimum order amount
      if (data.min_order_amount && currentService) {
        const basePrice = isHotelBooking ? currentService.hotel_price : currentService.base_price
        if (basePrice < data.min_order_amount) {
          setAppliedPromotion(null)
          setError(`ยอดขั้นต่ำสำหรับโค้ดนี้คือ ${formatCurrency(data.min_order_amount)}`)
          return
        }
      }

      setAppliedPromotion(data)
      setError('')
    } catch (err: any) {
      setAppliedPromotion(null)
      setError('เกิดข้อผิดพลาดในการตรวจสอบโค้ดส่วนลด')
    } finally {
      setIsValidatingCode(false)
    }
  }

  // Address validation and formatting
  const validateAddressFields = () => {
    if (isHotelBooking) return true

    const missingFields = []
    if (!contactName.trim()) missingFields.push('ชื่อผู้ติดต่อ')
    if (!contactPhone.trim()) missingFields.push('เบอร์โทรศัพท์')
    if (!address.trim()) missingFields.push('ที่อยู่')
    if (!province) missingFields.push('จังหวัด')
    if (!district) missingFields.push('เขต/อำเภอ')
    if (!subdistrict) missingFields.push('แขวง/ตำบล')
    if (!postalCode.trim()) missingFields.push('รหัสไปรษณีย์')

    if (missingFields.length > 0) {
      setError(`กรุณากรอกข้อมูลให้ครบถ้วน: ${missingFields.join(', ')}`)
      return false
    }

    // Validate phone number format (Support all Thai phone formats)
    const phoneRegex = /^((06|08|09)[0-9]{8}|(02)[0-9]{7}|(03|04|05|07)[0-9]{6}|1[0-9]{3,5})$/
    if (!phoneRegex.test(contactPhone.replace(/[-\s]/g, ''))) {
      setError('เบอร์โทรศัพท์ไม่ถูกต้อง กรุณากรอกเบอร์ที่ถูกต้อง (เบอร์มือถือ: 06/08/09, เบอร์บ้าน: 02/03/04/05/07, เบอร์พิเศษ: 1xxx)')
      return false
    }

    return true
  }

  const handleProvinceChange = (provinceId: string) => {
    setProvince(provinceId)
    setDistrict('')
    setSubdistrict('')
    setPostalCode('')
  }

  const handleDistrictChange = (districtId: string) => {
    setDistrict(districtId)
    setSubdistrict('')
    // Auto-set postal code based on district (simplified)
    const selectedDistrict = bangkokDistricts.find(d => d.id === districtId)
    if (selectedDistrict && province === '10') {
      setPostalCode('10110') // Default Bangkok postal code
    }
  }

  const getAvailableDistricts = () => {
    if (province === '10') return bangkokDistricts
    return [] // In real app, fetch districts based on province
  }

  const handleProceedToNext = () => {
    if (!currentServiceSelection || !currentPricing || !bookingDate || !selectedHour || !selectedMinute) {
      setError('กรุณาเลือกบริการ วันที่ ชั่วโมง และนาที')
      return
    }

    // Validate address fields for home/office booking
    if (!validateAddressFields()) {
      return
    }

    // Combine hour and minute into time string
    const bookingTime = `${selectedHour}:${selectedMinute}`

    // Format complete address for home/office booking
    const completeAddress = !isHotelBooking ? {
      contactName,
      contactPhone,
      address,
      province,
      district,
      subdistrict,
      postalCode,
      mapLocation,
      formattedAddress: `${address} ${subdistrict} ${district} ${provinces.find(p => p.id === province)?.name} ${postalCode}`
    } : undefined

    const details = {
      bookingDate,
      bookingTime,
      isHotelBooking,
      hotelId: isHotelBooking ? hotelId : undefined,
      addressDetails: completeAddress,
      discountCode: appliedPromotion?.code,
      appliedDiscount: appliedPromotion,
      selectedDuration: currentServiceSelection.duration
    }

    onServiceSelect(currentServiceSelection.service, [], currentPricing, details)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return mins > 0 ? `${hours} ชม. ${mins} นาที` : `${hours} ชั่วโมง`
    }
    return `${minutes} นาที`
  }

  // Time selection utilities (same as Customer app)
  const getAvailableHours = () => {
    const hours = []
    for (let h = 9; h <= 23; h++) {
      hours.push(h.toString().padStart(2, '0'))
    }
    return hours
  }

  const getMinuteIntervals = () => {
    return ['00', '15', '30', '45'] // 15-minute intervals
  }

  const isTimeSlotAvailable = (date: string, hour: string, minute: string) => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    // If not today, all slots are available (Admin bypass)
    if (date !== todayStr) return true

    // For today, Admin can book immediately (no 3-hour rule)
    return true
  }

  const getAvailableHoursForDate = (date: string) => {
    const allHours = getAvailableHours()
    return allHours.filter(hour => {
      return getMinuteIntervals().some(minute =>
        isTimeSlotAvailable(date, hour, minute)
      )
    })
  }

  const getAvailableMinutesForDateHour = (date: string, hour: string) => {
    return getMinuteIntervals().filter(minute =>
      isTimeSlotAvailable(date, hour, minute)
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดบริการ...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-900 mb-2">เลือกบริการ</h2>
        <p className="text-stone-600">เลือกบริการสำหรับ {customer?.full_name}</p>

        {/* Step indicator */}
        {(() => {
          const selectedServiceData = selectedServiceId ? services.find(s => s.id === selectedServiceId) : null
          const hasDurationOptions = selectedServiceData ? getDurationOptions(selectedServiceData).length > 1 : true

          return (
            <div className="flex items-center gap-2 mt-4 text-sm">
              <div className={`flex items-center gap-2 ${step === 'service' ? 'text-[#d29b25] font-medium' : step !== 'service' ? 'text-[#b6d387]' : 'text-stone-500'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  step === 'service' ? 'bg-[#d29b25] text-white' :
                  step !== 'service' ? 'bg-[#b6d387] text-white' :
                  'bg-stone-300 text-stone-600'
                }`}>
                  {step !== 'service' ? <Check className="w-3 h-3" /> : '1'}
                </div>
                <span>เลือกบริการ</span>
              </div>

              {hasDurationOptions && (
                <>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                  <div className={`flex items-center gap-2 ${
                    step === 'duration' ? 'text-[#d29b25] font-medium' :
                    step === 'details' ? 'text-[#b6d387]' :
                    'text-stone-500'
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      step === 'duration' ? 'bg-[#d29b25] text-white' :
                      step === 'details' ? 'bg-[#b6d387] text-white' :
                      'bg-stone-300 text-stone-600'
                    }`}>
                      {step === 'details' ? <Check className="w-3 h-3" /> : '2'}
                    </div>
                    <span>เลือกระยะเวลา</span>
                  </div>
                </>
              )}

              <ChevronRight className="w-4 h-4 text-stone-400" />

              <div className={`flex items-center gap-2 ${step === 'details' ? 'text-[#d29b25] font-medium' : 'text-stone-500'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  step === 'details' ? 'bg-[#d29b25] text-white' : 'bg-stone-300 text-stone-600'
                }`}>
                  {hasDurationOptions ? '3' : '2'}
                </div>
                <span>กรอกรายละเอียด</span>
              </div>
            </div>
          )
        })()}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Service Selection Steps */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Selector Component */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-amber-600 to-amber-700 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-stone-900">{customer?.full_name}</h4>
                  <p className="text-xs text-stone-600">
                    {step === 'service' ? 'เลือกบริการ' :
                     step === 'duration' ? 'เลือกระยะเวลา' :
                     step === 'details' ? 'กรอกรายละเอียด' : 'เลือกแล้ว'}
                  </p>
                </div>
              </div>
              {currentServiceSelection && step !== 'service' && (
                <button
                  onClick={handleBackToServices}
                  className="text-xs text-stone-500 hover:text-red-600 transition"
                >
                  เปลี่ยนบริการ
                </button>
              )}
            </div>

            {/* Step 1: Service Selection */}
            {step === 'service' && (
              <div className="space-y-4">
                {/* Category Filter */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-[#d29b25] text-white'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  {Object.entries(categoryLabels).map(([category, label]) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedCategory === category
                          ? 'bg-[#d29b25] text-white'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {label.th}
                    </button>
                  ))}
                </div>

                {/* Services Grid */}
                <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                  {filteredServices.map((service) => {
                    const isSelected = selectedServiceId === service.id
                    const basePrice = calculateServicePrice(service, service.duration)

                    return (
                      <button
                        key={service.id}
                        onClick={() => handleServiceClick(service)}
                        className={`
                          p-4 rounded-xl border-2 text-left transition-all duration-300 shadow-sm
                          ${isSelected
                            ? 'border-[#d29b25] bg-gradient-to-r from-[#ffe79d] to-[#ffe79d]/70 shadow-md transform scale-[1.01]'
                            : 'border-stone-300 bg-white hover:border-[#d29b25]/50 hover:bg-[#ffe79d]/20 hover:shadow-md'
                          }
                          cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#d29b25] focus:ring-offset-1
                        `}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-stone-900 mb-1 truncate">
                              {service.name_th}
                            </h5>
                            <p className="text-xs text-stone-500 mb-2 truncate">
                              {service.name_en}
                            </p>

                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-3 h-3 text-stone-400" />
                              <span className="text-xs text-stone-600">
                                {service.duration_options && service.duration_options.length > 1
                                  ? `${Math.min(...service.duration_options)}-${Math.max(...service.duration_options)} นาที`
                                  : `${service.duration} นาที`
                                }
                              </span>
                            </div>

                            <div className={`text-sm font-bold ${isSelected ? 'text-[#d29b25]' : 'text-[#b6d387]'}`}>
                              {service.duration_options && service.duration_options.length > 1 ? (
                                <span>เริ่มต้น ฿{basePrice.toLocaleString()}</span>
                              ) : (
                                <span>฿{basePrice.toLocaleString()}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isSelected && (
                              <div className="w-6 h-6 bg-[#d29b25] rounded-full flex items-center justify-center shadow-md">
                                <Check className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                            <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-[#d29b25]' : 'text-stone-400'}`} />
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {filteredServices.length === 0 && (
                  <div className="text-center py-8 text-stone-500">
                    {selectedCategory === 'all' ? 'ไม่พบบริการ' : `ไม่พบบริการใน${categoryLabels[selectedCategory]?.th}`}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Duration Selection */}
            {step === 'duration' && selectedServiceId && (() => {
              const selectedServiceData = services.find(s => s.id === selectedServiceId)
              if (!selectedServiceData) return null

              return (
                <div className="space-y-4">
                  {/* Back button */}
                  <button
                    onClick={handleBackToServices}
                    className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-800 transition"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    <span>เปลี่ยนบริการ</span>
                  </button>

                  {/* Selected service info */}
                  <div className="p-4 bg-stone-50 rounded-xl">
                    <h5 className="font-medium text-stone-900 mb-1">
                      {selectedServiceData.name_th}
                    </h5>
                    <p className="text-sm text-stone-600">
                      {selectedServiceData.description_th || selectedServiceData.description_en}
                    </p>
                  </div>

                  {/* Duration options */}
                  <div>
                    <h6 className="text-sm font-medium text-stone-900 mb-3">
                      เลือกระยะเวลาบริการ <span className="text-red-500">*</span>
                    </h6>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {getDurationOptions(selectedServiceData).map((option) => {
                        const isSelected = selectedDuration === option.value
                        const calculatedPrice = calculateServicePrice(selectedServiceData, option.value)

                        return (
                          <button
                            key={option.value}
                            onClick={() => handleDurationSelect(option.value)}
                            disabled={!option.isAvailable}
                            className={`
                              p-3 rounded-lg border-2 text-center transition-all duration-300 shadow-sm
                              ${isSelected
                                ? 'border-[#d29b25] bg-[#d29b25] text-white shadow-md transform scale-[1.05]'
                                : 'border-stone-300 bg-white text-stone-700 hover:border-[#d29b25]/50 hover:bg-[#ffe79d]/20 hover:shadow-md'
                              }
                              ${!option.isAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                              focus:outline-none focus:ring-2 focus:ring-[#d29b25] focus:ring-offset-1
                            `}
                          >
                            <div className="text-sm font-medium">
                              {option.label}
                            </div>
                            <div className={`text-xs mt-1 font-semibold ${isSelected ? 'text-amber-100' : 'text-[#d29b25]'}`}>
                              ฿{calculatedPrice.toLocaleString()}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Step 3: Service Selected Confirmation */}
            {step === 'details' && currentServiceSelection && (() => {
              const selectedServiceData = currentServiceSelection.service

              return (
                <div className="space-y-4">
                  {/* Selection confirmed */}
                  <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm font-bold text-green-700">บริการที่เลือก</span>
                    </div>
                    <div className="text-sm font-medium text-stone-800">
                      {selectedServiceData.name_th} • {currentServiceSelection.duration} นาที • ฿{currentServiceSelection.price.toLocaleString()}
                    </div>
                  </div>

                  {/* Edit options */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleBackToServices}
                      className="flex-1 px-3 py-2 text-xs bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition"
                    >
                      เปลี่ยนบริการ
                    </button>
                    {getDurationOptions(selectedServiceData).length > 1 && (
                      <button
                        onClick={handleBackToDuration}
                        className="flex-1 px-3 py-2 text-xs bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition"
                      >
                        เปลี่ยนระยะเวลา
                      </button>
                    )}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {/* Right Column: Booking Details */}
        <div className="space-y-4">
          {/* Discount Code - Always Available */}
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <h3 className="font-medium text-stone-900 mb-3">โค้ดส่วนลด</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                placeholder="กรอกโค้ดส่วนลด"
                className="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#d29b25] focus:border-[#d29b25]"
              />
              <button
                onClick={() => validateDiscountCode(discountCode)}
                disabled={!discountCode || isValidatingCode}
                className="bg-[#b6d387] text-white px-4 py-2 rounded-lg hover:bg-[#9bc76f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isValidatingCode ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'ใช้'
                )}
              </button>
            </div>

            {appliedPromotion && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">{appliedPromotion.name_th}</span>
                </div>
                <div className="text-green-600">
                  ส่วนลด {appliedPromotion.discount_type === 'percentage'
                    ? `${appliedPromotion.discount_value}%`
                    : formatCurrency(appliedPromotion.discount_value)
                  }
                </div>
              </div>
            )}
          </div>

        {step === 'details' && currentServiceSelection && (
          <>
            {/* Selected Service Summary */}
            <div className="bg-[#ffe79d]/20 border border-[#d29b25]/30 rounded-lg p-4">
              <h3 className="font-medium text-[#d29b25] mb-2">บริการที่เลือก</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-700">{currentServiceSelection.service.name_th}</span>
                  <span className="text-[#d29b25] font-medium">
                    {formatCurrency(currentServiceSelection.price)}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>ระยะเวลา:</span>
                  <span>{formatDuration(currentServiceSelection.duration)}</span>
                </div>
              </div>
            </div>

          {/* Booking Type */}
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <h3 className="font-medium text-stone-900 mb-3">ประเภทการจอง</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="bookingType"
                  checked={!isHotelBooking}
                  onChange={() => setIsHotelBooking(false)}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span>นัดหมายที่บ้าน/สำนักงาน</span>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="bookingType"
                  checked={isHotelBooking}
                  onChange={() => setIsHotelBooking(true)}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span>บริการในโรงแรม</span>
                  <span className="bg-green-100 text-green-600 text-xs px-2 py-0.5 rounded">
                    ลดพิเศษ
                  </span>
                </div>
              </label>
            </div>

            {!isHotelBooking && (
              <div className="mt-4 space-y-4">
                <h4 className="font-medium text-stone-900 border-b border-stone-200 pb-2">
                  ข้อมูลติดต่อและที่อยู่
                </h4>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      ชื่อผู้ติดต่อ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="ชื่อ-นามสกุล"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#d29b25] focus:border-[#d29b25]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="08x-xxx-xxxx"
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#d29b25] focus:border-[#d29b25]"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    ที่อยู่ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="บ้านเลขที่, หมู่บ้าน, ถนน"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#d29b25] focus:border-[#d29b25]"
                  />
                </div>

                {/* Province, District, Subdistrict */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      จังหวัด <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={province}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#d29b25] focus:border-[#d29b25]"
                    >
                      <option value="">-- เลือกจังหวัด --</option>
                      {provinces.map((prov) => (
                        <option key={prov.id} value={prov.id}>
                          {prov.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      เขต/อำเภอ <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={district}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      disabled={!province}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#d29b25] focus:border-[#d29b25] disabled:bg-stone-100 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {province ? "-- เลือกเขต/อำเภอ --" : "-- เลือกจังหวัดก่อน --"}
                      </option>
                      {getAvailableDistricts().map((dist) => (
                        <option key={dist.id} value={dist.id}>
                          {dist.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      แขวง/ตำบล <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={subdistrict}
                      onChange={(e) => setSubdistrict(e.target.value)}
                      disabled={!district}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#d29b25] focus:border-[#d29b25] disabled:bg-stone-100 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {district ? "-- เลือกแขวง/ตำบล --" : "-- เลือกเขต/อำเภอก่อน --"}
                      </option>
                      {/* In real app, fetch subdistricts based on district */}
                      {district && (
                        <>
                          <option value="1">คลองเตย</option>
                          <option value="2">คลองตัน</option>
                          <option value="3">พระโขนง</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      รหัสไปรษณีย์ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="10110"
                      maxLength={5}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#d29b25] focus:border-[#d29b25]"
                    />
                  </div>
                </div>

                {/* Map Location (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    เลือกตำแหน่งบนแผนที่ (ไม่บังคับ)
                  </label>
                  <GoogleMapsPicker
                    latitude={mapLocation?.lat || null}
                    longitude={mapLocation?.lng || null}
                    onLocationChange={(lat, lng) => {
                      setMapLocation({ lat, lng })
                    }}
                    className="h-80"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Date and Time Selection */}
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <h3 className="font-medium text-stone-900 mb-3">วันที่และเวลา</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  วันที่
                </label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#d29b25] focus:border-[#d29b25]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    ชั่วโมง
                  </label>
                  <select
                    value={selectedHour}
                    onChange={(e) => {
                      setSelectedHour(e.target.value)
                      setSelectedMinute('') // Reset minute when hour changes
                    }}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#d29b25] focus:border-[#d29b25]"
                  >
                    <option value="">เลือกชั่วโมง</option>
                    {getAvailableHoursForDate(bookingDate).map((hour) => (
                      <option key={hour} value={hour}>
                        {hour}:00
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    นาที
                  </label>
                  <select
                    value={selectedMinute}
                    onChange={(e) => setSelectedMinute(e.target.value)}
                    disabled={!selectedHour}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#d29b25] focus:border-[#d29b25] disabled:bg-stone-100 disabled:cursor-not-allowed"
                  >
                    <option value="">เลือกนาที</option>
                    {selectedHour && getAvailableMinutesForDateHour(bookingDate, selectedHour).map((minute) => (
                      <option key={minute} value={minute}>
                        :{minute}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedHour && selectedMinute && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                  <Clock className="w-4 h-4 inline mr-2 text-blue-600" />
                  เวลาที่เลือก: <span className="font-medium text-blue-800">
                    {selectedHour}:{selectedMinute} น.
                  </span>
                </div>
              )}
            </div>
          </div>

            {/* Pricing Summary */}
            {currentPricing && (
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                <h3 className="font-medium text-stone-900 mb-3">สรุปราคา</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-600">ราคาฐาน:</span>
                    <span>{formatCurrency(currentPricing.base_price)}</span>
                  </div>

                  {customer.total_bookings >= 5 && currentPricing.customer_discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>ส่วนลดลูกค้าVIP:</span>
                      <span>-{formatCurrency(currentPricing.customer_discount)}</span>
                    </div>
                  )}

                  {appliedPromotion && currentPricing.code_discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>ส่วนลดโค้ด:</span>
                      <span>-{formatCurrency(currentPricing.code_discount)}</span>
                    </div>
                  )}

                  {currentPricing.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>ส่วนลดรวม:</span>
                      <span>-{formatCurrency(currentPricing.discount_amount)}</span>
                    </div>
                  )}

                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>ยอดรวม:</span>
                    <span className="text-[#d29b25] text-lg">
                      {formatCurrency(currentPricing.final_price)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        </div>

      <div className="flex justify-between">
        <button
          onClick={() => {
            if (step === 'service') {
              onBack()
            } else if (step === 'duration') {
              handleBackToServices()
            } else if (step === 'details') {
              // If service has multiple duration options, go back to duration
              if (currentServiceSelection && getDurationOptions(currentServiceSelection.service).length > 1) {
                handleBackToDuration()
              } else {
                handleBackToServices()
              }
            }
          }}
          className="flex items-center gap-2 px-4 py-2 text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 'service' ? 'กลับ' :
           step === 'duration' ? 'เปลี่ยนบริการ' :
           'แก้ไข'}
        </button>

        {step === 'details' && (
          <button
            onClick={handleProceedToNext}
            disabled={!currentServiceSelection || !currentPricing || !bookingDate || !selectedHour || !selectedMinute}
            className="flex items-center gap-2 bg-[#d29b25] text-white px-6 py-3 rounded-lg hover:bg-[#b8851e] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ถัดไป: บันทึกการชำระเงิน
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
      </div>
    </div>
  )
}