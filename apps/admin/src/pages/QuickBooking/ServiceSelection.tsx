import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Clock, MapPin, Calendar, Tag, AlertCircle, CheckCircle, X, User, ChevronRight, Check, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { adminBookingService } from '@bliss/supabase'
import { GoogleMapsPicker } from '../../components/GoogleMapsPicker'
import { ThaiAddressFields } from '../../components'

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
  staff_commission_rate: number // Commission rate as decimal (e.g., 0.30 for 30%)
  use_fixed_rate?: boolean
  staff_earning_60?: number
  staff_earning_90?: number
  staff_earning_120?: number
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

// Admin Quick Booking with Customer App-style address selection
export default function ServiceSelection({
  customer,
  selectedService,
  selectedAddOns = [],
  basePricing,
  onServiceSelect,
  onNext,
  onBack
}: Props) {
  // Get customer's addresses with admin access (bypass RLS)
  const { data: addresses, isLoading: addressesLoading, refetch: refetchAddresses } = useQuery({
    queryKey: ['admin-addresses', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return []

      // Direct query with admin context - bypass RLS
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('customer_id', customer?.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Admin addresses query error:', error)
        throw error
      }

      return data || []
    },
    enabled: !!customer?.id,
  })

  // Force refetch addresses when customer changes
  useEffect(() => {
    if (customer?.id) {
      refetchAddresses()
    }
  }, [customer?.id, refetchAddresses])

  // Find default address from addresses array (same as Customer App)
  const defaultAddress = addresses?.find(addr => addr.is_default) || null

  const [services, setServices] = useState<Service[]>([])
  const [filteredServices, setFilteredServices] = useState<Service[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Handle address selection (same as Customer App)
  const handleSelectAddress = (addressId: string) => {
    const selectedAddr = addresses?.find((a) => a.id === addressId)
    if (selectedAddr) {
      setSelectedAddressId(addressId)
      setShowManualAddressForm(false)
      setUserWantsNewAddress(false)
      // Populate address state from selected saved address
      setContactName(selectedAddr.recipient_name || '')
      setContactPhone(selectedAddr.phone || '')
      setAddress(selectedAddr.address_line || '')
      setDistrict(selectedAddr.district || '')
      setSubdistrict(selectedAddr.subdistrict || '')
      setProvince(selectedAddr.province || '')
      setPostalCode(selectedAddr.zipcode || '')
      // Copy coordinates from saved address
      if (selectedAddr.latitude && selectedAddr.longitude) {
        setMapLocation({
          lat: selectedAddr.latitude,
          lng: selectedAddr.longitude
        })
      } else {
        setMapLocation(null)
      }
    }
  }

  const handleShowManualForm = () => {
    setSelectedAddressId(null)
    setShowManualAddressForm(true)
    setUserWantsNewAddress(true)
    // Auto-fill with customer data instead of resetting to empty (exactly like Customer App)
    setContactName(customer?.full_name || '')
    setContactPhone(customer?.phone || '')
    setAddress('')
    setDistrict('')
    setSubdistrict('')
    setProvince('')
    setPostalCode('')
    setMapLocation(null)
  }

  // Two-step service selection state (like Hotel app)
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    selectedService?.service?.id || null
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

  // Provider gender preference (mirrors Customer/Hotel app). Drives staff dispatch filtering
  // server-side (notificationService.filterStaffByProviderPreference) + staff job eligibility.
  const [providerPreference, setProviderPreference] = useState<string>(
    (selectedService as any)?.providerPreference || 'no-preference'
  )

  // Address details state for home/office booking
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showManualAddressForm, setShowManualAddressForm] = useState(false)
  const [userWantsNewAddress, setUserWantsNewAddress] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [address, setAddress] = useState('')
  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [subdistrict, setSubdistrict] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [mapLocation, setMapLocation] = useState<{lat: number, lng: number} | null>(null)

  // Debug current address selection state
  console.log('📍 Address Selection State:', {
    customerId: customer?.id,
    customerName: customer?.full_name,
    addressesLoading,
    addressesCount: addresses?.length || 0,
    selectedAddressId,
    showManualAddressForm,
    step,
    shouldShowCards: addresses && addresses.length > 0 && !showManualAddressForm,
    shouldShowForm: !addresses || addresses.length === 0 || showManualAddressForm
  })

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
    if (selectedService && !currentServiceSelection) {
      // Only initialize if we don't already have a selection to avoid re-initialization
      const isDirectService = 'name_th' in selectedService && !('service' in selectedService)

      console.log('🔄 Initializing from existing selectedService:', {
        selectedService,
        isDirectService,
        serviceId: isDirectService ? (selectedService as any).id : selectedService?.service?.id,
        serviceName: isDirectService ? (selectedService as any).name_th : selectedService?.service?.name_th,
        duration: selectedService?.duration
      })

      if (isDirectService) {
        // It's a direct Service object, convert to ServiceSelection structure
        console.log('🔧 Converting direct Service to ServiceSelection structure')
        const serviceObj = selectedService as any // Cast to Service type
        const serviceSelection: ServiceSelection = {
          id: `admin-${serviceObj.id}-${serviceObj.duration || 60}`,
          service: serviceObj,
          duration: serviceObj.duration || 60,
          recipientIndex: 0,
          recipientName: customer?.full_name || '',
          price: 0, // Will be calculated by pricing effect
          sortOrder: 0
        }
        setSelectedServiceId(serviceObj.id)
        setSelectedDuration(serviceObj.duration || 60)
        setCurrentServiceSelection(serviceSelection)
      } else {
        // It's a proper ServiceSelection object
        setSelectedServiceId(selectedService?.service?.id || null)
        setSelectedDuration(selectedService?.duration || null)
        setCurrentServiceSelection(selectedService)
      }

      setStep('details')
    }
  }, [selectedService, customer?.full_name, currentServiceSelection])

  // Recalculate pricing when selection changes
  useEffect(() => {
    console.log('💰 currentServiceSelection changed:', {
      hasSelection: !!currentServiceSelection,
      serviceId: currentServiceSelection?.service?.id,
      serviceName: currentServiceSelection?.service?.name_th,
      duration: currentServiceSelection?.duration,
      price: currentServiceSelection?.price
    })

    if (currentServiceSelection) {
      calculatePricing(currentServiceSelection)
    }
  }, [currentServiceSelection, isHotelBooking, appliedPromotion, customer?.id])

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

  // Auto-select default address when addresses are loaded (exactly like Customer App)
  // But NOT when user explicitly wants to add a new address
  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddressId && !showManualAddressForm && !userWantsNewAddress) {
      const defaultAddress = addresses.find(addr => addr.is_default)
      if (defaultAddress) {
        handleSelectAddress(defaultAddress.id)
      }
    }
  }, [addresses, selectedAddressId, showManualAddressForm, userWantsNewAddress])

  // Auto-show manual form with customer data if no saved addresses (exactly like Customer App)
  useEffect(() => {
    if (!addressesLoading && addresses && customer && !selectedAddressId) {
      if (addresses.length === 0) {
        // No saved addresses, show manual form with customer data
        setShowManualAddressForm(true)
        setContactName(customer?.full_name || '')
        setContactPhone(customer?.phone || '')
        setAddress('')
        setDistrict('')
        setSubdistrict('')
        setProvince('')
        setPostalCode('')
        setMapLocation(null)
      }
    }
  }, [addressesLoading, addresses, customer, selectedAddressId])

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
  const calculateServicePrice = (service: Service | undefined, duration: number): number => {
    if (!service) return 0

    // Use admin-set prices when available
    if (duration === 60 && service.price_60) return service.price_60
    if (duration === 90 && service.price_90) return service.price_90
    if (duration === 120 && service.price_120) return service.price_120

    // Fallback to proportional calculation using base_price (not hotel_price for admin)
    const baseRatePerMinute = service.base_price / service.duration
    return Math.round(baseRatePerMinute * duration)
  }

  // Get duration options for selected service (like Hotel app)
  const getDurationOptions = (service: Service | undefined): DurationOption[] => {
    if (!service) {
      return []
    }

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
    if (!serviceSelection || !serviceSelection.service) return

    try {
      const basePrice = calculateServicePrice(serviceSelection.service, serviceSelection.duration)
      let discountAmount = 0
      let codeDiscount = 0


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
        customer_discount: 0,
        code_discount: codeDiscount
      })
    } catch (err: any) {
      console.error('Pricing calculation error:', err)
    }
  }

  // Service selection handlers (like Hotel app)
  const handleServiceClick = (service: Service) => {
    console.log('🎯 Service clicked:', {
      serviceId: service.id,
      serviceName: service.name_th,
      service: service
    })

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
        recipientName: customer?.full_name || '',
        price: calculatedPrice,
        sortOrder: 0
      }

      console.log('✅ Service selection created:', {
        selectionId: selection.id,
        serviceName: selection.service.name_th,
        duration: selection.duration,
        price: selection.price
      })

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
    console.log('⏱️ Duration selected:', {
      duration,
      selectedServiceId,
      servicesCount: services.length
    })

    if (!selectedServiceId) return

    const service = services.find(s => s.id === selectedServiceId)
    if (!service) {
      console.error('❌ Service not found in duration select:', selectedServiceId)
      return
    }

    console.log('✅ Service found for duration select:', {
      serviceId: service.id,
      serviceName: service.name_th
    })

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

    console.log('✅ Duration selection created:', {
      selectionId: selection.id,
      serviceName: selection.service.name_th,
      duration: selection.duration,
      price: selection.price
    })

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
      if (data.applies_to === 'specific_services' && currentServiceSelection?.service) {
        if (!data.target_services?.includes(currentServiceSelection?.service?.id)) {
          setAppliedPromotion(null)
          setError('โค้ดส่วนลดนี้ไม่สามารถใช้กับบริการที่เลือกได้')
          return
        }
      } else if (data.applies_to === 'categories' && currentServiceSelection?.service) {
        if (!data.target_categories?.includes(currentServiceSelection?.service?.category)) {
          setAppliedPromotion(null)
          setError('โค้ดส่วนลดนี้ไม่สามารถใช้กับหมวดหมู่บริการที่เลือกได้')
          return
        }
      }

      // Check minimum order amount
      if (data.min_order_amount && currentServiceSelection?.service) {
        const basePrice = isHotelBooking ? currentServiceSelection?.service?.hotel_price : currentServiceSelection?.service?.base_price
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

  const [isProcessing, setIsProcessing] = useState(false)
  const processingRef = useRef(false)

  const handleProceedToNext = async () => {
    // Immediate check with useRef (synchronous)
    if (processingRef.current) {
      console.log('⏸️ Already processing, ignoring click')
      return
    }

    // Set both immediately and for state
    console.log('🚀 Starting processing - setting flag')
    processingRef.current = true
    setIsProcessing(true)
    setError('')

    try {
      // Debug validation
      console.log('🔍 Validation Debug:', {
        isProcessing,
        currentServiceSelection: !!currentServiceSelection,
        service: !!currentServiceSelection?.service,
        serviceId: currentServiceSelection?.service?.id,
        serviceName: currentServiceSelection?.service?.name_th,
        currentPricing: !!currentPricing,
        bookingDate: !!bookingDate,
        selectedHour: !!selectedHour,
        selectedMinute: !!selectedMinute,
        actualValues: {
          bookingDate,
          selectedHour,
          selectedMinute,
          currentServiceSelection: currentServiceSelection?.service?.name_th
        }
      })

      // Wait a moment to ensure all state updates are complete
      await new Promise(resolve => setTimeout(resolve, 200))

      // More specific validation messages
      if (!currentServiceSelection) {
        setError('กรุณาเลือกบริการ (currentServiceSelection is null)')
        processingRef.current = false
        setIsProcessing(false)
        return
      }
      if (!currentServiceSelection.service) {
        setError('กรุณาเลือกบริการ (service object is missing)')
        console.error('Service selection error:', currentServiceSelection)
        processingRef.current = false
        setIsProcessing(false)
        return
      }
      if (!currentPricing) {
        setError('กำลังคำนวณราคา กรุณารอสักครู่')
        processingRef.current = false
        setIsProcessing(false)
        return
      }
      if (!bookingDate) {
        setError('กรุณาเลือกวันที่')
        processingRef.current = false
        setIsProcessing(false)
        return
      }
      if (!selectedHour) {
        setError('กรุณาเลือกชั่วโมง')
        processingRef.current = false
        setIsProcessing(false)
        return
      }
      if (!selectedMinute) {
        setError('กรุณาเลือกนาที')
        processingRef.current = false
        setIsProcessing(false)
        return
      }

      // Validate address fields for home/office booking
      if (!validateAddressFields()) {
        processingRef.current = false
        setIsProcessing(false)
        return
      }

      // Combine hour and minute into time string
      const bookingTime = `${selectedHour}:${selectedMinute}`

      // Format complete address for home/office booking
      const selectedAddress = selectedAddressId ? addresses?.find(a => a.id === selectedAddressId) : null

      const completeAddress = !isHotelBooking ? {
        contactName,
        contactPhone,
        address,
        province,
        district,
        subdistrict,
        postalCode,
        mapLocation,
        formattedAddress: `${address} ${subdistrict} ${district} ${province} ${postalCode}`,
        // Add metadata about address source
        isFromSavedAddress: !!selectedAddressId,
        savedAddressId: selectedAddressId,
        savedAddressLabel: selectedAddress?.label,
        savedAddressIsDefault: selectedAddress?.is_default
      } : undefined

      const details = {
        bookingDate,
        bookingTime,
        isHotelBooking,
        hotelId: isHotelBooking ? hotelId : undefined,
        addressDetails: completeAddress,
        discountCode: appliedPromotion?.code,
        appliedDiscount: appliedPromotion,
        selectedDuration: currentServiceSelection?.duration,
        providerPreference
      }

      console.log('✅ Validation passed, updating booking data')

      onServiceSelect(currentServiceSelection.service, [], currentPricing, details)

      // Navigation will be handled automatically by parent when step becomes complete
      // Reset processing flag after data update
      setTimeout(() => {
        processingRef.current = false
        setIsProcessing(false)
      }, 100)

    } catch (error) {
      console.error('Error in handleProceedToNext:', error)
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
      processingRef.current = false
      setIsProcessing(false)
    }
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
        <h2 className="text-xl font-semibold text-bliss-900 mb-2">เลือกบริการ</h2>
        <p className="text-bliss-600">เลือกบริการสำหรับ {customer?.full_name}</p>

        {/* Step indicator */}
        {(() => {
          const selectedServiceData = selectedServiceId ? services.find(s => s.id === selectedServiceId) : null
          const hasDurationOptions = selectedServiceData ? getDurationOptions(selectedServiceData).length > 1 : true

          return (
            <div className="flex items-center gap-2 mt-4 text-sm">
              <div className={`flex items-center gap-2 ${step === 'service' ? 'text-[#565b34] font-medium' : step !== 'service' ? 'text-[#c8c29c]' : 'text-bliss-500'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  step === 'service' ? 'bg-[#565b34] text-white' :
                  step !== 'service' ? 'bg-[#c8c29c] text-white' :
                  'bg-bliss-300 text-bliss-600'
                }`}>
                  {step !== 'service' ? <Check className="w-3 h-3" /> : '1'}
                </div>
                <span>เลือกบริการ</span>
              </div>

              {hasDurationOptions && (
                <>
                  <ChevronRight className="w-4 h-4 text-bliss-400" />
                  <div className={`flex items-center gap-2 ${
                    step === 'duration' ? 'text-[#565b34] font-medium' :
                    step === 'details' ? 'text-[#c8c29c]' :
                    'text-bliss-500'
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      step === 'duration' ? 'bg-[#565b34] text-white' :
                      step === 'details' ? 'bg-[#c8c29c] text-white' :
                      'bg-bliss-300 text-bliss-600'
                    }`}>
                      {step === 'details' ? <Check className="w-3 h-3" /> : '2'}
                    </div>
                    <span>เลือกระยะเวลา</span>
                  </div>
                </>
              )}

              <ChevronRight className="w-4 h-4 text-bliss-400" />

              <div className={`flex items-center gap-2 ${step === 'details' ? 'text-[#565b34] font-medium' : 'text-bliss-500'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  step === 'details' ? 'bg-[#565b34] text-white' : 'bg-bliss-300 text-bliss-600'
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

      <div className={`${step === 'details' ? 'space-y-6' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'}`}>
        {/* Left Column: Service Selection Steps */}
        <div className={`${step === 'details' ? '' : 'lg:col-span-2'} space-y-6`}>
          {/* Service Selector Component */}
          <div className="bg-white border border-bliss-200 rounded-xl p-6 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-bliss-600 to-bliss-700 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-bliss-900">{customer?.full_name}</h4>
                  <p className="text-xs text-bliss-600">
                    {step === 'service' ? 'เลือกบริการ' :
                     step === 'duration' ? 'เลือกระยะเวลา' :
                     step === 'details' ? 'กรอกรายละเอียด' : 'เลือกแล้ว'}
                  </p>
                </div>
              </div>
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
                        ? 'bg-[#565b34] text-white'
                        : 'bg-bliss-100 text-bliss-700 hover:bg-bliss-200'
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
                          ? 'bg-[#565b34] text-white'
                          : 'bg-bliss-100 text-bliss-700 hover:bg-bliss-200'
                      }`}
                    >
                      {label.th}
                    </button>
                  ))}
                </div>

                {/* Services Grid */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredServices.map((service) => {
                    const isSelected = selectedServiceId === service.id
                    const basePrice = calculateServicePrice(service, service.duration)

                    return (
                      <button
                        key={service.id}
                        onClick={() => handleServiceClick(service)}
                        className={`
                          w-full p-6 rounded-xl border-2 text-left transition-all duration-300 shadow-sm
                          ${isSelected
                            ? 'border-[#565b34] bg-gradient-to-r from-[#ebe6d0] to-[#ebe6d0]/70 shadow-lg transform scale-[1.01]'
                            : 'border-bliss-200 bg-white hover:border-[#565b34]/50 hover:bg-[#ebe6d0]/20 hover:shadow-lg'
                          }
                          cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#565b34] focus:ring-offset-1
                        `}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-bliss-900 mb-1 truncate">
                              {service.name_th}
                            </h5>
                            <p className="text-xs text-bliss-500 mb-2 truncate">
                              {service.name_en}
                            </p>

                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-3 h-3 text-bliss-400" />
                              <span className="text-xs text-bliss-600">
                                {service.duration_options && service.duration_options.length > 1
                                  ? `${Math.min(...service.duration_options)}-${Math.max(...service.duration_options)} นาที`
                                  : `${service.duration} นาที`
                                }
                              </span>
                            </div>

                            <div className={`text-sm font-bold ${isSelected ? 'text-[#565b34]' : 'text-[#c8c29c]'}`}>
                              {service.duration_options && service.duration_options.length > 1 ? (
                                <span>เริ่มต้น ฿{basePrice.toLocaleString()}</span>
                              ) : (
                                <span>฿{basePrice.toLocaleString()}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isSelected && (
                              <div className="w-6 h-6 bg-[#565b34] rounded-full flex items-center justify-center shadow-md">
                                <Check className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                            <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-[#565b34]' : 'text-bliss-400'}`} />
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {filteredServices.length === 0 && (
                  <div className="text-center py-8 text-bliss-500">
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

                  {/* Selected service info */}
                  <div className="p-4 bg-bliss-50 rounded-xl">
                    <h5 className="font-medium text-bliss-900 mb-1">
                      {selectedServiceData.name_th}
                    </h5>
                    <p className="text-sm text-bliss-600">
                      {selectedServiceData.description_th || selectedServiceData.description_en}
                    </p>
                  </div>

                  {/* Duration options */}
                  <div>
                    <h6 className="text-sm font-medium text-bliss-900 mb-3">
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
                                ? 'border-[#565b34] bg-[#565b34] text-white shadow-md transform scale-[1.05]'
                                : 'border-bliss-300 bg-white text-bliss-700 hover:border-[#565b34]/50 hover:bg-[#ebe6d0]/20 hover:shadow-md'
                              }
                              ${!option.isAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                              focus:outline-none focus:ring-2 focus:ring-[#565b34] focus:ring-offset-1
                            `}
                          >
                            <div className="text-sm font-medium">
                              {option.label}
                            </div>
                            <div className={`text-xs mt-1 font-semibold ${isSelected ? 'text-bliss-100' : 'text-[#565b34]'}`}>
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
            {step === 'details' && currentServiceSelection && (
                <div className="space-y-4">
                </div>
              )}
          </div>

          {/* Service Confirmation Banner - Always visible in details */}
          {step === 'details' && currentServiceSelection && (
            <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm font-bold text-green-700">บริการที่เลือก</span>
              </div>
              <div className="text-sm font-medium text-bliss-800">
                {currentServiceSelection?.service?.name_th || 'กำลังโหลดชื่อบริการ...'} • {formatDuration(currentServiceSelection?.duration || 0)} • {currentPricing ? formatCurrency(currentPricing.final_price) : 'กำลังคำนวณราคา...'}
              </div>

              {/* Debug info in development */}
              {import.meta.env.DEV && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  <p><strong>Debug:</strong></p>
                  <p>Service: {currentServiceSelection?.service?.name_th || 'undefined'}</p>
                  <p>Duration: {currentServiceSelection?.duration || 'undefined'}</p>
                  <p>Price from selection: {currentServiceSelection?.price || 'undefined'}</p>
                  <p>Price from pricing: {currentPricing?.final_price || 'undefined'}</p>
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleBackToServices}
                  className="flex-1 px-3 py-2 text-xs bg-bliss-100 text-bliss-600 rounded-lg hover:bg-bliss-200 transition"
                >
                  เปลี่ยนบริการ
                </button>
                {getDurationOptions(currentServiceSelection?.service).length > 1 && (
                  <button
                    onClick={handleBackToDuration}
                    className="flex-1 px-3 py-2 text-xs bg-bliss-100 text-bliss-700 rounded-lg hover:bg-bliss-200 transition"
                  >
                    เปลี่ยนระยะเวลา
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Main Content Area - Proper Layout Structure */}
          {step === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Main Form (2 columns) */}
              <div className="lg:col-span-2 space-y-6">

                {/* 1. Booking Type Selection */}
                <div className="bg-white border border-bliss-200 rounded-lg p-5">
            <h3 className="font-medium text-bliss-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-bliss-700" />
              ประเภทการจอง
            </h3>
            <div className="space-y-3">
              <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition ${
                !isHotelBooking ? 'border-blue-500 bg-blue-50' : 'border-bliss-200 hover:border-bliss-300'
              }`}>
                <input
                  type="radio"
                  name="bookingType"
                  checked={!isHotelBooking}
                  onChange={() => setIsHotelBooking(false)}
                  className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">นัดหมายที่บ้าน/สำนักงาน</span>
                </div>
              </label>
              <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition ${
                isHotelBooking ? 'border-blue-500 bg-blue-50' : 'border-bliss-200 hover:border-bliss-300'
              }`}>
                <input
                  type="radio"
                  name="bookingType"
                  checked={isHotelBooking}
                  onChange={() => setIsHotelBooking(true)}
                  className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2 flex-1 justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">บริการในโรงแรม</span>
                  </div>
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    ลดพิเศษ
                  </span>
                </div>
              </label>
            </div>

          </div>

                {/* 2. Date and Time Selection */}
                <div className="bg-white border border-bliss-200 rounded-lg p-5">
            <h3 className="font-medium text-bliss-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-bliss-700" />
              วันที่และเวลา
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-bliss-700 mb-1">
                  วันที่
                </label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-bliss-300 rounded-lg focus:ring-2 focus:ring-[#565b34] focus:border-[#565b34]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-bliss-700 mb-1">
                    ชั่วโมง
                  </label>
                  <select
                    value={selectedHour}
                    onChange={(e) => {
                      setSelectedHour(e.target.value)
                      setSelectedMinute('') // Reset minute when hour changes
                    }}
                    className="w-full px-3 py-2 border border-bliss-300 rounded-lg focus:ring-2 focus:ring-[#565b34] focus:border-[#565b34]"
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
                  <label className="block text-sm font-medium text-bliss-700 mb-1">
                    นาที
                  </label>
                  <select
                    value={selectedMinute}
                    onChange={(e) => setSelectedMinute(e.target.value)}
                    disabled={!selectedHour}
                    className="w-full px-3 py-2 border border-bliss-300 rounded-lg focus:ring-2 focus:ring-[#565b34] focus:border-[#565b34] disabled:bg-bliss-100 disabled:cursor-not-allowed"
                  >
                    <option value="">เลือกนาที</option>
                    {getAvailableMinutesForDateHour(bookingDate, selectedHour).map((minute) => (
                      <option key={minute} value={minute}>
                        :{minute.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedHour && selectedMinute && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                  <Clock className="w-4 h-4 inline mr-2 text-blue-600" />
                  เวลาที่เลือก: <span className="font-medium text-blue-800">{selectedHour}:{selectedMinute.toString().padStart(2, '0')} น.</span>
                </div>
              )}
            </div>
                </div>

                {/* 2.5 Provider Gender Preference (mirrors Customer/Hotel app) */}
                <div className="bg-white border border-bliss-200 rounded-lg p-5">
                  <h3 className="font-medium text-bliss-900 mb-1 flex items-center gap-2">
                    <User className="w-5 h-5 text-bliss-700" />
                    เพศผู้ให้บริการ
                  </h3>
                  <p className="text-sm text-bliss-500 mb-3">เลือกเพศผู้ให้บริการที่ลูกค้าต้องการ (มีผลต่อการกระจายงานให้พนักงาน)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { value: 'no-preference', label: 'ไม่ระบุ', desc: 'พนักงานที่ว่างทุกคน' },
                      { value: 'female-only', label: 'ผู้หญิงเท่านั้น', desc: 'เฉพาะพนักงานหญิง' },
                      { value: 'male-only', label: 'ผู้ชายเท่านั้น', desc: 'เฉพาะพนักงานชาย' },
                      { value: 'prefer-female', label: 'ต้องการผู้หญิง', desc: 'หญิงก่อน ไม่ว่างให้ชายแทน' },
                      { value: 'prefer-male', label: 'ต้องการผู้ชาย', desc: 'ชายก่อน ไม่ว่างให้หญิงแทน' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setProviderPreference(opt.value)}
                        className={`p-3 rounded-lg border-2 text-left transition ${
                          providerPreference === opt.value
                            ? 'border-bliss-700 bg-bliss-50 shadow-sm'
                            : 'border-bliss-200 hover:border-bliss-300 hover:bg-bliss-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-bliss-700" />
                              <span className="font-medium text-bliss-900 text-sm">{opt.label}</span>
                            </div>
                            <p className="text-xs text-bliss-500 mt-0.5 ml-6">{opt.desc}</p>
                          </div>
                          {providerPreference === opt.value && (
                            <div className="w-5 h-5 rounded-full bg-bliss-700 flex items-center justify-center flex-shrink-0">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Contact & Address Information (Conditional) */}
                {!isHotelBooking && (
                  <div className="bg-white border border-bliss-200 rounded-lg p-5">
                    <h3 className="font-medium text-bliss-900 mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-bliss-700" />
                      ข้อมูลติดต่อและที่อยู่
                    </h3>

                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-bliss-700">
                        เลือกที่อยู่ที่บันทึกไว้ หรือเพิ่มที่อยู่ใหม่
                      </label>
                      <button
                        onClick={() => refetchAddresses()}
                        disabled={addressesLoading}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition disabled:opacity-50"
                      >
                        {addressesLoading ? 'กำลังโหลด...' : '🔄 รีเฟรช'}
                      </button>
                    </div>

                    {addressesLoading ? (
                      <div className="flex items-center justify-center p-6 bg-bliss-50 rounded-lg">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bliss-700 mx-auto mb-3"></div>
                        <p className="text-bliss-600 text-sm ml-3">กำลังโหลดที่อยู่...</p>
                      </div>
                    ) : addresses && addresses.length > 0 && !showManualAddressForm ? (
                      <div className="space-y-4">
                        <p className="text-sm text-bliss-600 mb-3">เลือกที่อยู่ที่บันทึกไว้</p>

                        {/* Saved Address Cards */}
                        <div className="space-y-3">
                          {addresses.map((addr) => (
                            <button
                              key={addr.id}
                              onClick={() => handleSelectAddress(addr.id)}
                              className={`w-full p-4 rounded-xl border-2 text-left transition shadow-sm ${
                                selectedAddressId === addr.id
                                  ? 'border-bliss-700 bg-bliss-50 shadow-md'
                                  : 'border-bliss-200 hover:border-bliss-300 hover:bg-bliss-50 hover:shadow-md'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="inline-block px-2 py-1 bg-bliss-100 text-bliss-700 text-xs rounded">
                                      {addr.label}
                                    </span>
                                    {addr.is_default && (
                                      <span className="inline-block px-2 py-1 bg-bliss-100 text-bliss-700 text-xs rounded">
                                        ค่าเริ่มต้น
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="font-semibold text-bliss-900 mb-1">{addr.recipient_name}</h3>
                                  <p className="text-sm text-bliss-600 mb-1">{addr.phone}</p>
                                  <p className="text-sm text-bliss-600">
                                    {addr.address_line}
                                    {addr.subdistrict && `, ${addr.subdistrict}`}
                                    {addr.district && `, ${addr.district}`}
                                    {`, ${addr.province} ${addr.zipcode || ''}`}
                                  </p>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                                  selectedAddressId === addr.id
                                    ? 'border-bliss-700 bg-bliss-700'
                                    : 'border-bliss-300'
                                }`}>
                                  {selectedAddressId === addr.id && (
                                    <CheckCircle className="w-4 h-4 text-white" />
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Add New Address Button */}
                        <button
                          onClick={handleShowManualForm}
                          className="w-full p-4 mt-2 rounded-xl border-2 border-dashed border-bliss-300 text-bliss-600 hover:border-bliss-500 hover:text-bliss-700 hover:bg-bliss-50 transition flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-sm font-medium">เพิ่มที่อยู่ใหม่</span>
                        </button>
                      </div>
                    ) : (
                      /* Manual Address Form */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-medium text-bliss-900">กรอกข้อมูลที่อยู่ใหม่</h5>
                          {addresses && addresses.length > 0 && (
                            <button
                              onClick={() => {
                                setShowManualAddressForm(false)
                                setUserWantsNewAddress(false)
                              }}
                              className="text-sm text-bliss-600 hover:text-bliss-900"
                            >
                              ← กลับไปเลือกที่อยู่ที่บันทึกไว้
                            </button>
                          )}
                        </div>

                        {/* Contact Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-bliss-700 mb-1">
                              ชื่อผู้ติดต่อ <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={contactName}
                              onChange={(e) => setContactName(e.target.value)}
                              placeholder="ชื่อ-นามสกุล"
                              className="w-full px-3 py-2 border border-bliss-300 rounded-lg focus:ring-2 focus:ring-[#565b34] focus:border-[#565b34]"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-bliss-700 mb-1">
                              เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="tel"
                              value={contactPhone}
                              onChange={(e) => setContactPhone(e.target.value)}
                              placeholder="08x-xxx-xxxx"
                              className="w-full px-3 py-2 border border-bliss-300 rounded-lg focus:ring-2 focus:ring-[#565b34] focus:border-[#565b34]"
                            />
                          </div>
                        </div>

                        {/* Address */}
                        <div>
                          <label className="block text-sm font-medium text-bliss-700 mb-1">
                            ที่อยู่ <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="บ้านเลขที่, หมู่บ้าน, ถนน"
                            className="w-full px-3 py-2 border border-bliss-300 rounded-lg focus:ring-2 focus:ring-[#565b34] focus:border-[#565b34]"
                          />
                        </div>

                        {/* Thai Address Fields with Dropdown */}
                        <ThaiAddressFields
                          province={province}
                          district={district}
                          subdistrict={subdistrict}
                          zipcode={postalCode}
                          onChange={({ province, district, subdistrict, zipcode }) => {
                            setProvince(province)
                            setDistrict(district)
                            setSubdistrict(subdistrict)
                            setPostalCode(zipcode)
                          }}
                        />

                        {/* GPS Map Integration */}
                        <div>
                          <label className="block text-sm font-medium text-bliss-700 mb-2">
                            ปักหมุดตำแหน่งที่อยู่ <span className="text-red-500">*</span>
                          </label>


                          <GoogleMapsPicker
                            latitude={mapLocation?.lat || 13.7563}
                            longitude={mapLocation?.lng || 100.5018}
                            onLocationChange={(lat: number, lng: number) => setMapLocation({ lat, lng })}
                            className="w-full h-64 rounded-lg border border-bliss-300"
                          />
                          {mapLocation && (
                            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-medium text-green-800">
                                  พิกัดที่เลือก: {mapLocation.lat.toFixed(6)}, {mapLocation.lng.toFixed(6)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Summary Sidebar (1 column) */}
              <div className="space-y-4">
          {/* Discount Code */}
          <div className="bg-white border border-bliss-200 rounded-lg p-4">
            <h3 className="font-medium text-bliss-900 mb-3">โค้ดส่วนลด</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                placeholder="กรอกโค้ดส่วนลด"
                className="flex-1 px-3 py-2 border border-bliss-300 rounded-lg focus:ring-2 focus:ring-[#565b34] focus:border-[#565b34]"
              />
              <button
                onClick={() => validateDiscountCode(discountCode)}
                disabled={!discountCode || isValidatingCode}
                className="bg-[#c8c29c] text-white px-4 py-2 rounded-lg hover:bg-[#c8c29c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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


            {/* Price Summary */}
            {currentPricing && (
              <div className="bg-bliss-50 border border-bliss-200 rounded-lg p-4">
                <h3 className="font-medium text-bliss-900 mb-3">สรุปราคา</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-bliss-600">ค่าบริการ:</span>
                    <span>{formatCurrency(currentPricing.base_price)}</span>
                  </div>


                  {currentPricing.code_discount && currentPricing.code_discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>ส่วนลดโค้ด:</span>
                      <span>-{formatCurrency(currentPricing.code_discount || 0)}</span>
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
                    <span className="text-[#565b34] text-lg">
                      {formatCurrency(currentPricing.final_price)}
                    </span>
                  </div>
                </div>
              </div>
            )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Booking Details - Only show when not in details step */}
        {step !== 'details' && (
        <div className="space-y-4">
        </div>
        )}

      <div className="flex justify-between">
        <button
          onClick={() => {
            if (step === 'service') {
              onBack()
            } else if (step === 'duration') {
              handleBackToServices()
            } else if (step === 'details') {
              // If service has multiple duration options, go back to duration
              if (currentServiceSelection && getDurationOptions(currentServiceSelection?.service).length > 1) {
                handleBackToDuration()
              } else {
                handleBackToServices()
              }
            }
          }}
          className="flex items-center gap-2 px-4 py-2 text-bliss-600 border border-bliss-300 rounded-lg hover:bg-bliss-50"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 'service' ? 'กลับ' :
           step === 'duration' ? 'เปลี่ยนบริการ' :
           'แก้ไข'}
        </button>

        {step === 'details' && (
          <button
            onClick={(e) => {
              console.log('🔘 Button clicked, isProcessing:', isProcessing, 'processingRef:', processingRef.current)
              e.preventDefault()
              handleProceedToNext()
            }}
            disabled={!currentServiceSelection || !currentPricing || !bookingDate || !selectedHour || !selectedMinute || isProcessing}
            className="flex items-center gap-2 bg-[#565b34] text-white px-6 py-3 rounded-lg hover:bg-[#464a28] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                กำลังดำเนินการ...
              </>
            ) : (
              <>
                ถัดไป: บันทึกการชำระเงิน
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
      </div>
    </div>
  )
}