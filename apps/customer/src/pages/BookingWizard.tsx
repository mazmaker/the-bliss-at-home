import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from '@bliss/i18n'
import { ChevronLeft, Clock, Calendar, MapPin, CreditCard, Building2, Banknote, AlertTriangle, CheckCircle, Sparkles, Plus, QrCode, Smartphone, Wallet, User, Phone } from 'lucide-react'
import { useServiceBySlug, useServiceById } from '@bliss/supabase/hooks/useServices'
import { useCurrentCustomer } from '@bliss/supabase/hooks/useCustomer'
import { useCreateBookingWithServices } from '@bliss/supabase/hooks/useBookings'
import { useAddresses } from '@bliss/supabase/hooks/useAddresses'
import { usePaymentMethods } from '@bliss/supabase/hooks/usePaymentMethods'
import { Database, PromoValidationResult, isSpecificPreference, getProviderPreferenceLabel, getProviderPreferenceBadgeStyle } from '@bliss/supabase'
import PaymentForm from '../components/PaymentForm'
import { GoogleMapsPicker } from '../components/GoogleMapsPicker'
import { CustomerTypeSelector } from '../components/CustomerTypeSelector'
import { ServiceDurationPicker, getPriceForDuration, getAvailableDurations } from '../components/ServiceDurationPicker'
import { CoupleServiceConfig } from '../components/CoupleServiceConfig'
import { VoucherCodeInput } from '../components/VoucherCodeInput'
import ThaiAddressFields from '../components/ThaiAddressFields'

type Step = 1 | 2 | 3 | 4 | 5 | 6

type ProviderPreference = 'female-only' | 'male-only' | 'prefer-female' | 'prefer-male' | 'no-preference'

function BookingWizard() {
  const { t } = useTranslation('booking')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const serviceSlug = searchParams.get('service') || 'thai-massage-2hr'
  const addOnsParam = searchParams.get('addons')?.split(',').filter(Boolean) || []
  const qtyParam = Number(searchParams.get('qty')) || 1
  const durationParam = Number(searchParams.get('duration')) || 0

  // Fetch data from Supabase
  const { data: serviceData, isLoading: serviceLoading } = useServiceBySlug(serviceSlug)
  const { data: customer } = useCurrentCustomer()
  const { data: addresses, isLoading: addressesLoading } = useAddresses(customer?.id)
  const { data: paymentMethods } = usePaymentMethods(customer?.id)
  const createBookingWithServices = useCreateBookingWithServices()

  const [currentStep, setCurrentStep] = useState<Step>(1)
  // New state for customer type, duration, couple config
  const [customerType, setCustomerType] = useState<'single' | 'couple'>('single')
  const [coupleFormat, setCoupleFormat] = useState<'simultaneous' | 'sequential'>('simultaneous')
  const [selectedDuration, setSelectedDuration] = useState<number>(0) // will be set from service
  const [person2ServiceId, setPerson2ServiceId] = useState<string | null>(null)
  const [person2Duration, setPerson2Duration] = useState<number>(0)
  const [person1AddOns, setPerson1AddOns] = useState<string[]>([])
  const [person2AddOns, setPerson2AddOns] = useState<string[]>([])
  // Voucher
  const [appliedPromo, setAppliedPromo] = useState<PromoValidationResult | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [providerPreference, setProviderPreference] = useState<ProviderPreference>('no-preference')
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showManualAddressForm, setShowManualAddressForm] = useState(false)
  const [address, setAddress] = useState({
    name: '',
    phone: '',
    address: '',
    district: '',
    subdistrict: '',
    province: '',
    zipcode: '',
  })
  const [manualAddressLocation, setManualAddressLocation] = useState<{
    latitude: number | null
    longitude: number | null
  }>({
    latitude: null,
    longitude: null,
  })
  const [notes, setNotes] = useState('')
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null)
  const [showManualPaymentForm, setShowManualPaymentForm] = useState(false)
  const [selectedPaymentChannel, setSelectedPaymentChannel] = useState<string | null>(null)
  const [selectedBank, setSelectedBank] = useState<string | null>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [promptpayQRCode, setPromptpayQRCode] = useState<string | null>(null)
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null)
  const [createdBookingNumber, setCreatedBookingNumber] = useState<string | null>(null)

  // Fetch person2's service data if different from person1
  const { data: person2ServiceData } = useServiceById(
    person2ServiceId && person2ServiceId !== serviceData?.id ? person2ServiceId : undefined
  )

  // Transform service data
  const service = useMemo(() => {
    if (!serviceData) return null
    return {
      id: serviceData.id,
      name: serviceData.name_en || serviceData.name_th,
      price: Number(serviceData.base_price || 0),
      duration: (serviceData.duration || 60) / 60, // Convert to hours
      durationMinutes: serviceData.duration || 60,
      category: serviceData.category,
      description: serviceData.description_th || serviceData.description_en || '',
      image: serviceData.image_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',
      addons: serviceData.addons || [],
      raw: serviceData, // keep raw for duration/price helpers
    }
  }, [serviceData])

  // Person 2's service with addons (falls back to person1's service)
  const person2Service = useMemo(() => {
    if (person2ServiceId && person2ServiceData) return person2ServiceData
    return serviceData || null
  }, [person2ServiceId, person2ServiceData, serviceData])

  // Auto-set duration from service when service data loads
  useEffect(() => {
    if (serviceData) {
      const durations = getAvailableDurations(serviceData)
      if (selectedDuration === 0 || !durations.includes(selectedDuration)) {
        // Use duration from URL param if valid, otherwise use service default
        const initialDuration = durationParam && durations.includes(durationParam)
          ? durationParam
          : (serviceData.duration || durations[0])
        setSelectedDuration(initialDuration)
      }
      if (person2Duration === 0) {
        setPerson2Duration(serviceData.duration || durations[0])
      }
    }
  }, [serviceData])

  // Init person1AddOns from URL params
  useEffect(() => {
    if (addOnsParam.length > 0 && person1AddOns.length === 0) {
      setPerson1AddOns(addOnsParam)
    }
  }, [addOnsParam])

  // Price calculation
  const person1Price = service?.raw ? getPriceForDuration(service.raw, selectedDuration) : 0
  const person1AddonTotal = service?.addons
    .filter((a) => (customerType === 'couple' ? person1AddOns : addOnsParam).includes(a.id))
    .reduce((sum, a) => sum + Number(a.price), 0) || 0

  const p2Svc = person2Service || serviceData
  const person2PriceVal = p2Svc ? getPriceForDuration(p2Svc, person2Duration) : 0
  const person2AddonTotal = p2Svc
    ? (p2Svc.addons || [])
        .filter((a: any) => person2AddOns.includes(a.id))
        .reduce((sum: number, a: any) => sum + Number(a.price), 0)
    : 0

  const subtotal = customerType === 'couple'
    ? person1Price + person1AddonTotal + person2PriceVal + person2AddonTotal
    : (person1Price + person1AddonTotal) * qtyParam

  const discountAmount = appliedPromo?.valid ? appliedPromo.discountAmount : 0
  const totalPrice = Math.max(0, subtotal - discountAmount)

  // Selected add-ons (for backwards compat in review step)
  const selectedAddOns = useMemo(() => {
    if (!service?.addons) return []
    return service.addons.filter((addon) => addOnsParam.includes(addon.id))
  }, [service?.addons, addOnsParam])

  // Auto-select default address when addresses are loaded
  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddressId && !showManualAddressForm) {
      const defaultAddress = addresses.find(addr => addr.is_default)
      if (defaultAddress) {
        handleSelectAddress(defaultAddress.id)
      }
    }
  }, [addresses, selectedAddressId, showManualAddressForm])

  // Auto-select default payment method when payment methods are loaded
  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0 && !selectedPaymentMethodId && !showManualPaymentForm) {
      const defaultPaymentMethod = paymentMethods.find(pm => pm.is_default)
      if (defaultPaymentMethod) {
        setSelectedPaymentMethodId(defaultPaymentMethod.id)
      }
    }
  }, [paymentMethods, selectedPaymentMethodId, showManualPaymentForm])

  // Mock available dates (next 7 days)
  const availableDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() + i + 1)
    return date.toISOString().split('T')[0]
  })

  // Mock available time slots
  const timeSlots = [
    '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
  ]

  const steps = [
    { num: 1, label: t('wizard.steps.service') },
    { num: 2, label: t('wizard.steps.dateTime') },
    { num: 3, label: t('wizard.steps.provider') },
    { num: 4, label: t('wizard.steps.address') },
    { num: 5, label: t('wizard.steps.confirm') },
    { num: 6, label: t('wizard.steps.payment') },
  ]

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep((prev) => (prev + 1) as Step)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step)
    } else {
      navigate(`/services/${serviceSlug}`)
    }
  }

  const handleSelectAddress = (addressId: string) => {
    const selectedAddr = addresses?.find((a) => a.id === addressId)
    if (selectedAddr) {
      setSelectedAddressId(addressId)
      setShowManualAddressForm(false)
      // Populate address state from selected saved address
      setAddress({
        name: selectedAddr.recipient_name,
        phone: selectedAddr.phone,
        address: selectedAddr.address_line,
        district: selectedAddr.district || '',
        subdistrict: selectedAddr.subdistrict || '',
        province: selectedAddr.province,
        zipcode: selectedAddr.zipcode || '',
      })
      // Copy coordinates from saved address
      setManualAddressLocation({
        latitude: selectedAddr.latitude ? Number(selectedAddr.latitude) : null,
        longitude: selectedAddr.longitude ? Number(selectedAddr.longitude) : null,
      })
    }
  }

  const handleShowManualForm = () => {
    setSelectedAddressId(null)
    setShowManualAddressForm(true)
    // Reset address form
    setAddress({
      name: '',
      phone: '',
      address: '',
      district: '',
      subdistrict: '',
      province: '',
      zipcode: '',
    })
    setManualAddressLocation({
      latitude: null,
      longitude: null,
    })
  }

  const handleLocationChange = (lat: number, lng: number) => {
    setManualAddressLocation({ latitude: lat, longitude: lng })
  }

  const handlePayWithPromptPay = async () => {
    if (!customer || !createdBookingId) {
      alert('Missing required information')
      return
    }

    setIsProcessingPayment(true)

    try {
      // Create PromptPay QR payment source
      const result = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payments/create-source`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: createdBookingId,
          customer_id: customer.id,
          amount: totalPrice,
          source_type: 'promptpay',
          payment_method: 'promptpay',
        }),
      })

      const data = await result.json()

      if (data.success && data.qr_code_url) {
        // Show QR code for user to scan
        setPromptpayQRCode(data.qr_code_url)

        // Start polling for payment status
        pollPaymentStatus(data.charge_id)
      } else {
        throw new Error(data.error || 'Failed to create PromptPay payment')
      }
    } catch (error: any) {
      console.error('PromptPay payment error:', error)
      alert(`Payment failed: ${error.message || 'Please try again.'}`)
      setIsProcessingPayment(false)
    }
  }

  const handlePayWithBank = async (bankCode: string, isMobile: boolean) => {
    if (!customer || !createdBookingId) {
      alert('Missing required information')
      return
    }

    setIsProcessingPayment(true)

    try {
      const sourceType = isMobile ? `mobile_banking_${bankCode}` : `internet_banking_${bankCode}`

      // Create banking source
      const result = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payments/create-source`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: createdBookingId,
          customer_id: customer.id,
          amount: totalPrice,
          source_type: sourceType,
          payment_method: isMobile ? 'mobile_banking' : 'internet_banking',
        }),
      })

      const data = await result.json()

      if (data.success && data.authorize_uri) {
        // Redirect to bank's payment page
        window.location.href = data.authorize_uri
      } else {
        throw new Error(data.error || 'Failed to create payment source')
      }
    } catch (error: any) {
      console.error('Banking payment error:', error)
      alert(`Payment failed: ${error.message || 'Please try again.'}`)
      setIsProcessingPayment(false)
    }
  }

  const pollPaymentStatus = async (chargeId: string) => {
    // Poll every 3 seconds for payment status
    const pollInterval = setInterval(async () => {
      try {
        const result = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payments/status/${chargeId}`)
        const data = await result.json()

        if (data.status === 'successful') {
          clearInterval(pollInterval)
          setIsProcessingPayment(false)
          navigate(`/bookings?success=true`)
        } else if (data.status === 'failed') {
          clearInterval(pollInterval)
          setIsProcessingPayment(false)
          alert('Payment failed. Please try again.')
          setPromptpayQRCode(null)
        }
      } catch (error) {
        console.error('Error polling payment status:', error)
      }
    }, 3000)

    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval)
      if (isProcessingPayment) {
        setIsProcessingPayment(false)
        alert('Payment timeout. Please try again.')
        setPromptpayQRCode(null)
      }
    }, 600000)
  }

  const handlePayWithSavedCard = async () => {
    if (!customer || !createdBookingId || !selectedPaymentMethodId) {
      alert('Missing required information')
      return
    }

    setIsProcessingPayment(true)

    try {
      // Find the selected payment method
      const selectedPaymentMethod = paymentMethods?.find(pm => pm.id === selectedPaymentMethodId)
      if (!selectedPaymentMethod) {
        throw new Error('Payment method not found')
      }

      // Call API to create charge with saved card
      const result = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payments/create-charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: createdBookingId,
          customer_id: customer.id,
          amount: totalPrice,
          omise_card_id: selectedPaymentMethod.omise_card_id,
          payment_method: 'credit_card',
          card_info: {
            brand: selectedPaymentMethod.card_brand,
            last_digits: selectedPaymentMethod.card_last_digits,
            expiry_month: selectedPaymentMethod.card_expiry_month,
            expiry_year: selectedPaymentMethod.card_expiry_year,
            name: selectedPaymentMethod.cardholder_name || 'Card Holder',
          },
        }),
      })

      const data = await result.json()

      if (data.success) {
        // Payment successful, navigate to bookings page
        navigate(`/bookings?success=true`)
      } else {
        throw new Error(data.error || 'Payment failed')
      }
    } catch (error: any) {
      console.error('Payment error:', error)
      alert(`Payment failed: ${error.message || 'Please try again.'}`)
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const handleCompleteBooking = async () => {
    if (!service || !customer) {
      alert('Please log in to complete booking')
      return
    }

    try {
      // Combine address fields into single string
      const fullAddress = [
        address.name ? `${address.name} (${address.phone})` : '',
        address.address,
        address.subdistrict,
        address.district,
        address.province,
        address.zipcode,
      ].filter(Boolean).join(', ')

      // Determine service format
      const serviceFormat = customerType === 'couple' ? coupleFormat : 'single'
      const recipientCount = customerType === 'couple' ? 2 : 1

      // Build services array
      const services: Array<{
        service_id: string
        duration: number
        price: number
        recipient_index: number
        recipient_name?: string
        sort_order?: number
      }> = [
        {
          service_id: service.id,
          duration: selectedDuration,
          price: person1Price,
          recipient_index: 0,
          sort_order: 0,
        },
      ]

      if (customerType === 'couple' && p2Svc) {
        services.push({
          service_id: p2Svc.id,
          duration: person2Duration,
          price: person2PriceVal,
          recipient_index: 1,
          sort_order: 1,
        })
      }

      // Prepare add-ons data (combine person1 + person2 add-ons)
      const allAddOnIds = customerType === 'couple'
        ? [...person1AddOns, ...person2AddOns]
        : addOnsParam

      const allAddonsForLookup = customerType === 'couple'
        ? [...(service.addons || []), ...((p2Svc as any)?.addons || [])]
        : service.addons || []

      const addonsData = allAddOnIds.map((addonId) => {
        const addon = allAddonsForLookup.find((a: any) => a.id === addonId)
        return {
          addon_id: addonId,
          quantity: 1,
          price_per_unit: addon ? Number(addon.price) : 0,
          total_price: addon ? Number(addon.price) : 0,
        }
      })

      const bookingId = await createBookingWithServices.mutateAsync({
        bookingData: {
          customer_id: customer.id,
          booking_date: selectedDate,
          booking_time: selectedTime,
          address: fullAddress || null,
          latitude: manualAddressLocation.latitude,
          longitude: manualAddressLocation.longitude,
          customer_notes: notes || null,
          service_format: serviceFormat as 'single' | 'simultaneous' | 'sequential',
          recipient_count: recipientCount,
          discount_amount: discountAmount,
          final_price: totalPrice,
          promotion_id: appliedPromo?.valid ? appliedPromo.promotion?.id || null : null,
          provider_preference: providerPreference,
        },
        services,
        addons: addonsData.length > 0 ? addonsData : undefined,
      })

      // Store booking ID
      setCreatedBookingId(bookingId)
      setCreatedBookingNumber(null) // will be set by DB trigger

      // Go to Payment step
      setCurrentStep(6)
    } catch (error: any) {
      console.error('Booking error:', error)
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        full: error,
      })
      alert(`Failed to create booking: ${error?.message || 'Please try again.'}`)
    }
  }

  // Loading state
  if (serviceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 mx-auto"></div>
          <p className="text-stone-600 mt-4">{t('wizard.loadingService')}</p>
        </div>
      </div>
    )
  }

  // Service not found
  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-600 text-lg">{t('wizard.serviceNotFound')}</p>
          <Link to="/services" className="inline-block mt-4 text-amber-700 hover:text-amber-800 font-medium">
            {t('wizard.backToServices')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link to={`/services/${serviceSlug}`} className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-4">
            <ChevronLeft className="w-5 h-5" />
            {t('wizard.backToDetails')}
          </Link>

          <h1 className="text-2xl font-bold text-stone-900 mb-4">{t('wizard.title')}</h1>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition ${
                      currentStep >= step.num
                        ? 'bg-amber-700 text-white'
                        : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {step.num}
                  </div>
                  <span
                    className={`text-xs mt-2 ${
                      currentStep >= step.num ? 'text-amber-700 font-medium' : 'text-stone-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 rounded ${
                      currentStep > step.num ? 'bg-amber-700' : 'bg-stone-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          {/* Step 1: Service Confirmation */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-bold text-stone-900 mb-6">{t('wizard.step1.title')}</h2>

              {/* Service info card */}
              <div className="flex items-start gap-6 p-6 bg-stone-50 rounded-xl mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-stone-100 to-amber-100 rounded-xl overflow-hidden">
                  <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-stone-900 mb-2">{service.name}</h3>
                  <p className="text-stone-600 text-sm mb-3">{service.description}</p>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-stone-600 flex items-center gap-1"><Clock className="w-4 h-4" /> {t('wizard.step1.minutes', { count: selectedDuration })}</span>
                    <span className="text-lg font-bold text-amber-700">฿{person1Price.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Duration Picker (single mode) */}
              {customerType === 'single' && service.raw && (
                <div className="mb-6">
                  <ServiceDurationPicker
                    service={service.raw}
                    selectedDuration={selectedDuration}
                    onDurationChange={setSelectedDuration}
                  />
                </div>
              )}

              {/* Customer Type Selector */}
              <div className="mb-6">
                <CustomerTypeSelector
                  customerType={customerType}
                  coupleFormat={coupleFormat}
                  onCustomerTypeChange={(type) => {
                    setCustomerType(type)
                    // Reset voucher when switching mode
                    setAppliedPromo(null)
                  }}
                  onCoupleFormatChange={setCoupleFormat}
                />
              </div>

              {/* Single mode: Add-ons */}
              {customerType === 'single' && selectedAddOns.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-stone-900 mb-3">{t('wizard.step1.selectedAddons')}</h4>
                  <div className="space-y-2">
                    {selectedAddOns.map((addon) => (
                      <div key={addon.id} className="flex justify-between items-center p-3 bg-stone-50 rounded-lg">
                        <span className="text-stone-700">{addon.name_th || addon.name_en}</span>
                        <span className="text-amber-700 font-medium">+฿{Number(addon.price).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Couple mode: Per-person service config */}
              {customerType === 'couple' && service.raw && (
                <div className="mb-6">
                  <CoupleServiceConfig
                    person1Service={service.raw as any}
                    person1Duration={selectedDuration}
                    person1AddOns={person1AddOns}
                    person2Service={person2Service as any}
                    person2Duration={person2Duration}
                    person2AddOns={person2AddOns}
                    onPerson1DurationChange={setSelectedDuration}
                    onPerson1AddOnsChange={setPerson1AddOns}
                    onPerson2ServiceChange={(id) => setPerson2ServiceId(id)}
                    onPerson2DurationChange={setPerson2Duration}
                    onPerson2AddOnsChange={setPerson2AddOns}
                  />
                </div>
              )}

              {customerType === 'single' && qtyParam > 1 && (
                <div className="mb-6 p-3 bg-stone-50 rounded-lg">
                  <span className="text-stone-700">{t('wizard.step1.quantity', { count: qtyParam })}</span>
                </div>
              )}

              {/* Price summary */}
              <div className="flex justify-between items-center p-4 bg-stone-50 rounded-xl">
                <span className="font-semibold text-stone-900">{t('wizard.step1.totalPrice')}</span>
                <span className="text-2xl font-bold text-amber-700">฿{totalPrice.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Step 2: Date & Time */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-bold text-stone-900 mb-6">{t('wizard.step2.title')}</h2>

              <div className="mb-6">
                <h3 className="font-semibold text-stone-900 mb-3">{t('wizard.step2.date')}</h3>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {availableDates.map((date) => {
                    const dateObj = new Date(date)
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
                    const dayNum = dateObj.getDate()
                    const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' })

                    return (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`p-4 rounded-xl border-2 transition ${
                          selectedDate === date
                            ? 'border-amber-500 bg-stone-50 text-amber-700'
                            : 'border-stone-200 hover:border-amber-300'
                        }`}
                      >
                        <div className="text-xs text-stone-500">{dayName}</div>
                        <div className="text-xl font-bold">{dayNum}</div>
                        <div className="text-xs text-stone-500">{monthName}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-stone-900 mb-3">{t('wizard.step2.time')}</h3>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`py-3 px-4 rounded-xl border-2 transition ${
                        selectedTime === time
                          ? 'border-amber-500 bg-stone-50 text-amber-700 font-medium'
                          : 'border-stone-200 hover:border-amber-300'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {!selectedDate || !selectedTime ? (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {t('wizard.step2.pleaseSelect')}
                </div>
              ) : (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {t('wizard.step2.selectedDateTime', { date: new Date(selectedDate).toLocaleDateString('en-US', { dateStyle: 'long' }), time: selectedTime })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Address */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-bold text-stone-900 mb-6">{t('wizard.step3.title')}</h2>

              <div className="space-y-4">
                <p className="text-stone-600 mb-6">{t('wizard.step3.subtitle')}</p>

                {[
                  { value: 'female-only', label: t('wizard.step3.femaleOnly'), description: t('wizard.step3.femaleOnlyDesc') },
                  { value: 'male-only', label: t('wizard.step3.maleOnly'), description: t('wizard.step3.maleOnlyDesc') },
                  { value: 'prefer-female', label: t('wizard.step3.preferFemale'), description: t('wizard.step3.preferFemaleDesc') },
                  { value: 'prefer-male', label: t('wizard.step3.preferMale'), description: t('wizard.step3.preferMaleDesc') },
                  { value: 'no-preference', label: t('wizard.step3.noPreference'), description: t('wizard.step3.noPreferenceDesc') },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setProviderPreference(option.value as ProviderPreference)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition ${
                      providerPreference === option.value
                        ? 'border-amber-700 bg-amber-50'
                        : 'border-stone-200 hover:border-amber-300 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-stone-900">{option.label}</h3>
                        <p className="text-sm text-stone-600 mt-1">{option.description}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        providerPreference === option.value
                          ? 'border-amber-700 bg-amber-700'
                          : 'border-stone-300'
                      }`}>
                        {providerPreference === option.value && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h2 className="text-xl font-bold text-stone-900 mb-6">{t('wizard.step4.title')}</h2>

              {/* Loading state for addresses */}
              {addressesLoading && !addresses ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-700 mx-auto mb-3"></div>
                    <p className="text-stone-600 text-sm">{t('wizard.step4.loadingAddresses') || 'กำลังโหลดที่อยู่...'}</p>
                  </div>
                </div>
              ) : addresses && addresses.length > 0 && !showManualAddressForm ? (
                <div className="space-y-4">
                  <p className="text-stone-600 mb-4">{t('wizard.step4.selectSaved')}</p>

                  {/* Saved Address Cards */}
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <button
                        key={addr.id}
                        onClick={() => handleSelectAddress(addr.id)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition ${
                          selectedAddressId === addr.id
                            ? 'border-amber-700 bg-amber-50'
                            : 'border-stone-200 hover:border-amber-300 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-block px-2 py-1 bg-stone-100 text-stone-700 text-xs rounded">
                                {addr.label}
                              </span>
                              {addr.is_default && (
                                <span className="inline-block px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded">
                                  {t('wizard.step4.default')}
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-stone-900 mb-1">{addr.recipient_name}</h3>
                            <p className="text-sm text-stone-600 mb-1">{addr.phone}</p>
                            <p className="text-sm text-stone-600">
                              {addr.address_line}
                              {addr.subdistrict && `, ${addr.subdistrict}`}
                              {addr.district && `, ${addr.district}`}
                              {`, ${addr.province} ${addr.zipcode || ''}`}
                            </p>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                            selectedAddressId === addr.id
                              ? 'border-amber-700 bg-amber-700'
                              : 'border-stone-300'
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
                    className="w-full p-4 rounded-xl border-2 border-dashed border-stone-300 text-stone-600 hover:border-amber-500 hover:text-amber-700 hover:bg-amber-50 transition flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="font-medium">{t('wizard.step4.addNew')}</span>
                  </button>

                  {/* Additional Notes */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      {t('wizard.step4.notes')}
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('wizard.step4.notesPlaceholder')}
                      rows={3}
                      className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Back to Saved Addresses */}
                  {addresses && addresses.length > 0 && showManualAddressForm && (
                    <button
                      onClick={() => setShowManualAddressForm(false)}
                      className="text-amber-700 hover:text-amber-800 text-sm flex items-center gap-1 mb-4"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      {t('wizard.step4.backToSaved')}
                    </button>
                  )}

                  {/* Manual Address Form */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      {t('wizard.step4.contactName')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={address.name}
                      onChange={(e) => setAddress({ ...address, name: e.target.value })}
                      placeholder={t('wizard.step4.fullName')}
                      className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-1" />
                      {t('wizard.step4.phoneNumber')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={address.phone}
                      onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                      placeholder={t('wizard.step4.phonePlaceholder')}
                      className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      {t('wizard.step4.address')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={address.address}
                      onChange={(e) => setAddress({ ...address, address: e.target.value })}
                      placeholder={t('wizard.step4.addressPlaceholder')}
                      className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  {/* Thai Address Cascading Dropdowns */}
                  <ThaiAddressFields
                    province={address.province}
                    district={address.district}
                    subdistrict={address.subdistrict}
                    zipcode={address.zipcode}
                    onChange={(fields) => {
                      setAddress((prev) => ({ ...prev, ...fields }))
                    }}
                  />

                  {/* Google Maps Location Picker */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      {t('wizard.step4.mapLabel')}
                    </label>
                    <GoogleMapsPicker
                      latitude={manualAddressLocation.latitude}
                      longitude={manualAddressLocation.longitude}
                      onLocationChange={handleLocationChange}
                    />
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      {t('wizard.step4.notes')}
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('wizard.step4.notesPlaceholder')}
                      rows={3}
                      className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {t('wizard.step4.arrivalNote')}
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div>
              <h2 className="text-xl font-bold text-stone-900 mb-6">{t('wizard.step5.title')}</h2>

              <div className="space-y-6">
                {/* Service Summary */}
                <div>
                  <h4 className="font-medium text-stone-900 mb-3">{t('wizard.step5.serviceSummary')}</h4>

                  {/* Person 1 */}
                  <div className="flex items-start gap-4 p-4 bg-stone-50 rounded-xl">
                    <div className="w-16 h-16 bg-gradient-to-br from-stone-100 to-amber-100 rounded-xl overflow-hidden">
                      <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-stone-900">
                        {customerType === 'couple' && <span className="text-xs text-stone-500 block">{t('wizard.step1.person1')}</span>}
                        {service.name}
                      </h3>
                      <p className="text-sm text-stone-600 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {t('wizard.step1.minutes', { count: selectedDuration })}
                      </p>
                    </div>
                    <span className="font-bold text-amber-700">฿{person1Price.toLocaleString()}</span>
                  </div>

                  {/* Person 1 Add-ons */}
                  {customerType === 'single' && selectedAddOns.length > 0 && (
                    <div className="mt-2">
                      {selectedAddOns.map((addon) => (
                        <div key={addon.id} className="flex justify-between py-2 px-4 border-b border-stone-100">
                          <span className="text-sm text-stone-600">{addon.name_th || addon.name_en}</span>
                          <span className="text-sm text-stone-900">+฿{Number(addon.price).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {customerType === 'couple' && person1AddOns.length > 0 && service.addons && (
                    <div className="mt-2">
                      {service.addons.filter(a => person1AddOns.includes(a.id)).map((addon) => (
                        <div key={addon.id} className="flex justify-between py-2 px-4 border-b border-stone-100">
                          <span className="text-sm text-stone-600">{addon.name_th || addon.name_en}</span>
                          <span className="text-sm text-stone-900">+฿{Number(addon.price).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Person 2 (couple mode only) */}
                  {customerType === 'couple' && p2Svc && (
                    <>
                      <div className="flex items-start gap-4 p-4 bg-stone-50 rounded-xl mt-3">
                        <div className="w-16 h-16 bg-gradient-to-br from-stone-100 to-stone-200 rounded-xl overflow-hidden">
                          <img
                            src={p2Svc.image_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80'}
                            alt={p2Svc.name_th || p2Svc.name_en}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-stone-900">
                            <span className="text-xs text-stone-500 block">{t('wizard.step1.person2')}</span>
                            {p2Svc.name_th || p2Svc.name_en}
                          </h3>
                          <p className="text-sm text-stone-600 flex items-center gap-1">
                            <Clock className="w-4 h-4" /> {t('wizard.step1.minutes', { count: person2Duration })}
                          </p>
                        </div>
                        <span className="font-bold text-amber-700">฿{person2PriceVal.toLocaleString()}</span>
                      </div>
                      {/* Person 2 Add-ons */}
                      {person2AddOns.length > 0 && (p2Svc as any).addons && (
                        <div className="mt-2">
                          {((p2Svc as any).addons as any[]).filter((a: any) => person2AddOns.includes(a.id)).map((addon: any) => (
                            <div key={addon.id} className="flex justify-between py-2 px-4 border-b border-stone-100">
                              <span className="text-sm text-stone-600">{addon.name_th || addon.name_en}</span>
                              <span className="text-sm text-stone-900">+฿{Number(addon.price).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Date & Time */}
                <div>
                  <h4 className="font-medium text-stone-900 mb-2 flex items-center gap-2"><Calendar className="w-4 h-4" /> {t('wizard.step5.dateTime')}</h4>
                  <p className="text-stone-600">
                    {new Date(selectedDate).toLocaleDateString('en-US', { dateStyle: 'long' })}
                  </p>
                  <p className="text-stone-600 flex items-center gap-1"><Clock className="w-4 h-4" /> {selectedTime}</p>
                </div>

                {/* Location */}
                <div>
                  <h4 className="font-medium text-stone-900 mb-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> {t('wizard.step5.location')}</h4>
                  <div className="text-stone-600 space-y-1">
                    <p>{address.name}</p>
                    <p>{address.phone}</p>
                    <p>{address.address}</p>
                    {address.district && <p>{address.subdistrict} {address.district}</p>}
                    <p>{address.province} {address.zipcode}</p>
                  </div>
                </div>

                {/* Provider Preference */}
                {isSpecificPreference(providerPreference) && (
                  <div>
                    <h4 className="font-medium text-stone-900 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" /> {t('wizard.step5.providerPreference', 'ความต้องการผู้ให้บริการ')}
                    </h4>
                    <span className={`inline-block text-sm px-3 py-1 rounded-full font-medium ${getProviderPreferenceBadgeStyle(providerPreference)}`}>
                      {getProviderPreferenceLabel(providerPreference)}
                    </span>
                  </div>
                )}

                {/* Notes */}
                {notes && (
                  <div>
                    <h4 className="font-medium text-stone-900 mb-2">{t('wizard.step5.notes')}</h4>
                    <p className="text-stone-600 bg-stone-50 p-3 rounded-lg">{notes}</p>
                  </div>
                )}

                {/* Voucher Code */}
                {customer && service && (
                  <VoucherCodeInput
                    orderAmount={subtotal}
                    userId={customer.id}
                    serviceIds={customerType === 'couple' && p2Svc
                      ? [service.id, p2Svc.id]
                      : [service.id]
                    }
                    categories={customerType === 'couple' && p2Svc
                      ? [service.category, p2Svc.category]
                      : [service.category]
                    }
                    appliedPromo={appliedPromo}
                    onApply={setAppliedPromo}
                    onRemove={() => setAppliedPromo(null)}
                  />
                )}

                {/* Price Summary */}
                <div className="space-y-2 p-4 bg-stone-50 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-600">{t('wizard.step5.subtotal')}</span>
                    <span className="font-medium text-stone-900">฿{subtotal.toLocaleString()}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-green-600">
                      <span>{t('wizard.step5.discount')}</span>
                      <span className="font-medium">-฿{discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-stone-200">
                    <span className="font-semibold text-stone-900">{t('wizard.step5.totalPrice')}</span>
                    <span className="text-2xl font-bold text-amber-700">฿{totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Payment */}
          {currentStep === 6 && customer && createdBookingId && (
            <div>
              <h2 className="text-xl font-bold text-stone-900 mb-6">{t('wizard.payment.title')}</h2>

              {/* Payment Channel Selection - Show if no channel selected yet */}
              {!selectedPaymentChannel ? (
                <div className="space-y-4">
                  <p className="text-stone-600 mb-4">{t('wizard.payment.selectChannel')}</p>

                  {/* Payment Channel Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Credit/Debit Card */}
                    <button
                      onClick={() => setSelectedPaymentChannel('credit_card')}
                      className="p-4 rounded-xl border-2 border-stone-200 hover:border-amber-500 hover:bg-amber-50 transition text-left flex items-center gap-3"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-stone-900">{t('wizard.payment.creditCard')}</h3>
                        <p className="text-xs text-stone-600">{t('wizard.payment.creditCardEn')}</p>
                      </div>
                    </button>

                    {/* PromptPay QR */}
                    <button
                      onClick={() => setSelectedPaymentChannel('promptpay')}
                      className="p-4 rounded-xl border-2 border-stone-200 hover:border-amber-500 hover:bg-amber-50 transition text-left flex items-center gap-3"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                        <QrCode className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-stone-900">{t('wizard.payment.promptpay')}</h3>
                        <p className="text-xs text-stone-600">{t('wizard.payment.promptpayEn')}</p>
                      </div>
                    </button>

                    {/* Internet Banking */}
                    <button
                      onClick={() => setSelectedPaymentChannel('internet_banking')}
                      className="p-4 rounded-xl border-2 border-stone-200 hover:border-amber-500 hover:bg-amber-50 transition text-left flex items-center gap-3"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-stone-900">{t('wizard.payment.internetBanking')}</h3>
                        <p className="text-xs text-stone-600">{t('wizard.payment.internetBankingEn')}</p>
                      </div>
                    </button>

                    {/* Mobile Banking */}
                    <button
                      onClick={() => setSelectedPaymentChannel('mobile_banking')}
                      className="p-4 rounded-xl border-2 border-stone-200 hover:border-amber-500 hover:bg-amber-50 transition text-left flex items-center gap-3"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                        <Smartphone className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-stone-900">{t('wizard.payment.mobileBanking')}</h3>
                        <p className="text-xs text-stone-600">{t('wizard.payment.mobileBankingEn')}</p>
                      </div>
                    </button>
                  </div>
                </div>
              ) : selectedPaymentChannel === 'credit_card' ? (
                /* Credit Card Payment - Show saved cards or new card form */
                <div className="space-y-4">
                  {/* Back Button */}
                  <button
                    onClick={() => {
                      setSelectedPaymentChannel(null)
                      setSelectedPaymentMethodId(null)
                      setShowManualPaymentForm(false)
                    }}
                    className="text-amber-700 hover:text-amber-800 text-sm flex items-center gap-1 mb-4"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('wizard.payment.changeChannel')}
                  </button>

                  {/* Saved Payment Methods */}
                  {paymentMethods && paymentMethods.length > 0 && !showManualPaymentForm ? (
                    <div className="space-y-4">
                      <p className="text-stone-600 mb-4">{t('wizard.payment.selectSavedCard')}</p>

                      {/* Saved Payment Method Cards */}
                      <div className="space-y-3">
                        {paymentMethods.map((pm) => (
                          <button
                            key={pm.id}
                            onClick={() => setSelectedPaymentMethodId(pm.id)}
                            className={`w-full p-4 rounded-xl border-2 text-left transition ${
                              selectedPaymentMethodId === pm.id
                                ? 'border-amber-700 bg-amber-50'
                                : 'border-stone-200 hover:border-amber-300 hover:bg-stone-50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="w-12 h-8 bg-gradient-to-br from-stone-700 to-stone-900 rounded flex items-center justify-center text-white text-xs font-bold">
                                  <CreditCard className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-stone-900">
                                      {pm.card_brand} •••• {pm.card_last_digits}
                                    </span>
                                    {pm.is_default && (
                                      <span className="inline-block px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded">
                                        {t('wizard.payment.default')}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-stone-600">
                                    {t('wizard.payment.expires')} {String(pm.card_expiry_month).padStart(2, '0')}/{pm.card_expiry_year}
                                  </p>
                                </div>
                              </div>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                                selectedPaymentMethodId === pm.id
                                  ? 'border-amber-700 bg-amber-700'
                                  : 'border-stone-300'
                              }`}>
                                {selectedPaymentMethodId === pm.id && (
                                  <CheckCircle className="w-4 h-4 text-white" />
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Add New Card Button */}
                      <button
                        onClick={() => setShowManualPaymentForm(true)}
                        className="w-full p-4 rounded-xl border-2 border-dashed border-stone-300 text-stone-600 hover:border-amber-500 hover:text-amber-700 hover:bg-amber-50 transition flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="font-medium">{t('wizard.payment.addNewCard')}</span>
                      </button>

                      {/* Pay with Selected Card Button */}
                      {selectedPaymentMethodId && (
                        <button
                          onClick={handlePayWithSavedCard}
                          disabled={isProcessingPayment}
                          className="w-full bg-amber-700 text-white py-4 rounded-xl font-medium hover:bg-amber-800 transition disabled:bg-stone-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isProcessingPayment ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              {t('wizard.payment.processing')}
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4" />
                              {t('wizard.payment.payAmount')} ฿{totalPrice.toLocaleString()}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Back to Saved Payment Methods */}
                      {paymentMethods && paymentMethods.length > 0 && showManualPaymentForm && (
                        <button
                          onClick={() => setShowManualPaymentForm(false)}
                          className="text-amber-700 hover:text-amber-800 text-sm flex items-center gap-1 mb-4"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          {t('wizard.payment.backToSavedCards')}
                        </button>
                      )}

                      {/* Manual Payment Form */}
                      <PaymentForm
                        amount={totalPrice}
                        bookingId={createdBookingId}
                        customerId={customer.id}
                        onSuccess={() => {
                          navigate(`/bookings?success=true`)
                        }}
                        onError={(error) => {
                          alert(`Payment failed: ${error}`)
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : selectedPaymentChannel === 'promptpay' ? (
                /* PromptPay QR Payment */
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      setSelectedPaymentChannel(null)
                      setPromptpayQRCode(null)
                      setIsProcessingPayment(false)
                    }}
                    className="text-amber-700 hover:text-amber-800 text-sm flex items-center gap-1 mb-4"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('wizard.payment.changeChannel')}
                  </button>

                  {!promptpayQRCode ? (
                    <div className="text-center py-8">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <QrCode className="w-12 h-12 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-stone-900 mb-2">{t('wizard.payment.promptpayTitle')}</h3>
                      <p className="text-stone-600 mb-2">{t('wizard.payment.amount')}</p>
                      <p className="text-3xl font-bold text-amber-700 mb-6">฿{totalPrice.toLocaleString()}</p>
                      <p className="text-sm text-stone-600 mb-6">
                        {t('wizard.payment.qrInstruction1')}<br />
                        {t('wizard.payment.qrInstruction2')}
                      </p>
                      <button
                        onClick={handlePayWithPromptPay}
                        disabled={isProcessingPayment}
                        className="px-8 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:bg-stone-300 disabled:cursor-not-allowed"
                      >
                        {isProcessingPayment ? t('wizard.payment.generatingQR') : t('wizard.payment.generateQR')}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <h3 className="text-xl font-bold text-stone-900 mb-4">{t('wizard.payment.scanQR')}</h3>
                      <div className="bg-white p-6 rounded-2xl shadow-lg inline-block mb-4">
                        <img src={promptpayQRCode} alt="PromptPay QR Code" className="w-64 h-64 mx-auto" />
                      </div>
                      <p className="text-lg font-semibold text-amber-700 mb-2">฿{totalPrice.toLocaleString()}</p>
                      <p className="text-sm text-stone-600 mb-6">
                        {t('wizard.payment.scanInstruction1')}<br />
                        {t('wizard.payment.scanInstruction2')}
                      </p>
                      <div className="flex items-center justify-center gap-2 text-blue-600">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span className="text-sm">{t('wizard.payment.waitingPayment')}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : selectedPaymentChannel === 'internet_banking' || selectedPaymentChannel === 'mobile_banking' ? (
                /* Internet/Mobile Banking */
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      setSelectedPaymentChannel(null)
                      setSelectedBank(null)
                      setIsProcessingPayment(false)
                    }}
                    className="text-amber-700 hover:text-amber-800 text-sm flex items-center gap-1 mb-4"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('wizard.payment.changeChannel')}
                  </button>

                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-stone-900 mb-2">
                      {selectedPaymentChannel === 'internet_banking' ? t('wizard.payment.internetBanking') : t('wizard.payment.mobileBanking')}
                    </h3>
                    <p className="text-stone-600">{t('wizard.payment.selectBank')}</p>
                    <p className="text-2xl font-bold text-amber-700 mt-4">฿{totalPrice.toLocaleString()}</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {/* SCB */}
                    <button
                      onClick={() => handlePayWithBank('scb', selectedPaymentChannel === 'mobile_banking')}
                      disabled={isProcessingPayment}
                      className="p-4 rounded-xl border-2 border-stone-200 hover:border-purple-500 hover:bg-purple-50 transition disabled:opacity-50"
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 bg-purple-600 rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-bold text-xs">
                          SCB
                        </div>
                        <p className="text-xs font-medium text-stone-900">{t('wizard.payment.scb')}</p>
                      </div>
                    </button>

                    {/* Kbank */}
                    <button
                      onClick={() => handlePayWithBank('kbank', selectedPaymentChannel === 'mobile_banking')}
                      disabled={isProcessingPayment}
                      className="p-4 rounded-xl border-2 border-stone-200 hover:border-green-500 hover:bg-green-50 transition disabled:opacity-50"
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 bg-green-600 rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-bold text-xs">
                          K
                        </div>
                        <p className="text-xs font-medium text-stone-900">{t('wizard.payment.kbank')}</p>
                      </div>
                    </button>

                    {/* BBL */}
                    <button
                      onClick={() => handlePayWithBank('bbl', selectedPaymentChannel === 'mobile_banking')}
                      disabled={isProcessingPayment}
                      className="p-4 rounded-xl border-2 border-stone-200 hover:border-blue-500 hover:bg-blue-50 transition disabled:opacity-50"
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 bg-blue-600 rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-bold text-xs">
                          BBL
                        </div>
                        <p className="text-xs font-medium text-stone-900">{t('wizard.payment.bbl')}</p>
                      </div>
                    </button>

                    {/* KTB */}
                    <button
                      onClick={() => handlePayWithBank('ktb', selectedPaymentChannel === 'mobile_banking')}
                      disabled={isProcessingPayment}
                      className="p-4 rounded-xl border-2 border-stone-200 hover:border-cyan-500 hover:bg-cyan-50 transition disabled:opacity-50"
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 bg-cyan-600 rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-bold text-xs">
                          KTB
                        </div>
                        <p className="text-xs font-medium text-stone-900">{t('wizard.payment.ktb')}</p>
                      </div>
                    </button>

                    {/* BAY */}
                    <button
                      onClick={() => handlePayWithBank('bay', selectedPaymentChannel === 'mobile_banking')}
                      disabled={isProcessingPayment}
                      className="p-4 rounded-xl border-2 border-stone-200 hover:border-yellow-500 hover:bg-yellow-50 transition disabled:opacity-50"
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 bg-yellow-500 rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-bold text-xs">
                          BAY
                        </div>
                        <p className="text-xs font-medium text-stone-900">{t('wizard.payment.bay')}</p>
                      </div>
                    </button>

                    {/* TTB */}
                    <button
                      onClick={() => handlePayWithBank('ttb', selectedPaymentChannel === 'mobile_banking')}
                      disabled={isProcessingPayment}
                      className="p-4 rounded-xl border-2 border-stone-200 hover:border-orange-500 hover:bg-orange-50 transition disabled:opacity-50"
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 bg-orange-500 rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-bold text-xs">
                          TTB
                        </div>
                        <p className="text-xs font-medium text-stone-900">{t('wizard.payment.ttb')}</p>
                      </div>
                    </button>
                  </div>

                  {isProcessingPayment && (
                    <div className="text-center py-4">
                      <div className="flex items-center justify-center gap-2 text-amber-700">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-700"></div>
                        <span>{t('wizard.payment.preparingPayment')}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Fallback */
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedPaymentChannel(null)}
                    className="text-amber-700 hover:text-amber-800 text-sm flex items-center gap-1 mb-4"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('wizard.payment.changeChannel')}
                  </button>

                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="w-8 h-8 text-amber-700" />
                    </div>
                    <h3 className="text-lg font-semibold text-stone-900 mb-2">
                      {t('wizard.payment.channelDeveloping')}
                    </h3>
                    <p className="text-stone-600 mb-6">
                      {t('wizard.payment.selectOther')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        {currentStep < 6 && (
          <div className="flex justify-between mt-6">
            <button
              onClick={handleBack}
              className="px-6 py-3 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              {t('wizard.back')}
            </button>

            {currentStep < 5 ? (
              <button
                onClick={handleNext}
                disabled={
                  (currentStep === 2 && (!selectedDate || !selectedTime)) ||
                  (currentStep === 4 && (!address.name || !address.phone || !address.address || !address.province))
                }
                className="px-6 py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition disabled:bg-stone-300 disabled:cursor-not-allowed"
              >
                {t('wizard.next')}
              </button>
            ) : (
              <button
                onClick={handleCompleteBooking}
                className="px-8 py-3 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:shadow-lg transition flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {t('wizard.step5.confirmBooking')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default BookingWizard
