import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, Clock, Calendar, MapPin, CreditCard, Building2, Banknote, AlertTriangle, CheckCircle, Sparkles, Plus, QrCode, Smartphone, Wallet } from 'lucide-react'
import { useServiceBySlug } from '@bliss/supabase/hooks/useServices'
import { useCurrentCustomer } from '@bliss/supabase/hooks/useCustomer'
import { useCreateBooking } from '@bliss/supabase/hooks/useBookings'
import { useAddresses } from '@bliss/supabase/hooks/useAddresses'
import { usePaymentMethods } from '@bliss/supabase/hooks/usePaymentMethods'
import PaymentForm from '../components/PaymentForm'
import { GoogleMapsPicker } from '../components/GoogleMapsPicker'

type Step = 1 | 2 | 3 | 4 | 5 | 6

type ProviderPreference = 'female-only' | 'male-only' | 'prefer-female' | 'prefer-male' | 'no-preference'

function BookingWizard() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const serviceSlug = searchParams.get('service') || 'thai-massage-2hr'
  const addOnsParam = searchParams.get('addons')?.split(',').filter(Boolean) || []
  const qtyParam = Number(searchParams.get('qty')) || 1

  // Fetch data from Supabase
  const { data: serviceData, isLoading: serviceLoading } = useServiceBySlug(serviceSlug)
  const { data: customer } = useCurrentCustomer()
  const { data: addresses } = useAddresses(customer?.id)
  const { data: paymentMethods } = usePaymentMethods(customer?.id)
  const createBooking = useCreateBooking()

  const [currentStep, setCurrentStep] = useState<Step>(1)
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

  // Transform service data
  const service = useMemo(() => {
    if (!serviceData) return null
    return {
      id: serviceData.id,
      name: serviceData.name_en || serviceData.name_th,
      price: Number(serviceData.base_price || 0),
      duration: (serviceData.duration || 60) / 60, // Convert to hours
      category: serviceData.category,
      description: serviceData.description_th || serviceData.description_en || '',
      image: serviceData.image_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',
      addons: serviceData.addons || [],
    }
  }, [serviceData])

  // Selected add-ons
  const selectedAddOns = useMemo(() => {
    if (!service?.addons) return []
    return service.addons.filter((addon) => addOnsParam.includes(addon.id))
  }, [service?.addons, addOnsParam])

  const addOnPrice = selectedAddOns.reduce((sum, a) => sum + Number(a.price), 0)
  const totalPrice = service ? (service.price + addOnPrice) * qtyParam : 0

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
    { num: 1, label: 'Service' },
    { num: 2, label: 'Date/Time' },
    { num: 3, label: 'Provider' },
    { num: 4, label: 'Address' },
    { num: 5, label: 'Confirm' },
    { num: 6, label: 'Payment' },
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
      const result = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/payments/create-source`, {
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
      const result = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/payments/create-source`, {
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
        const result = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/payments/status/${chargeId}`)
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
      const result = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/payments/create-charge`, {
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
            name: selectedPaymentMethod.card_holder_name || 'Card Holder',
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

      // Create booking with real data matching schema
      const bookingData = {
        customer_id: customer.id,
        service_id: service.id,
        booking_date: selectedDate, // DATE format: YYYY-MM-DD
        booking_time: selectedTime, // TIME format: HH:MM
        duration: service.duration * 60, // minutes
        base_price: service.price,
        final_price: totalPrice,
        customer_notes: notes || null,
        address: fullAddress || null,
      }

      // Prepare add-ons data
      const addonsData = selectedAddOns.map((addon) => ({
        addon_id: addon.id,
        quantity: 1,
        price_per_unit: Number(addon.price),
        total_price: Number(addon.price),
      }))

      const result = await createBooking.mutateAsync({
        booking: bookingData,
        addons: addonsData.length > 0 ? addonsData : undefined,
      })

      // Store booking ID and number
      setCreatedBookingId(result.id)
      setCreatedBookingNumber(result.booking_number)

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
          <p className="text-stone-600 mt-4">Loading service...</p>
        </div>
      </div>
    )
  }

  // Service not found
  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-600 text-lg">Service not found</p>
          <Link to="/services" className="inline-block mt-4 text-amber-700 hover:text-amber-800 font-medium">
            ← Back to Services
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
            Back to Service Details
          </Link>

          <h1 className="text-2xl font-bold text-stone-900 mb-4">Book a Service</h1>

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
              <h2 className="text-xl font-bold text-stone-900 mb-6">Confirm Selected Service</h2>

              <div className="flex items-start gap-6 p-6 bg-stone-50 rounded-xl mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-stone-100 to-amber-100 rounded-xl overflow-hidden">
                  <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-stone-900 mb-2">{service.name}</h3>
                  <p className="text-stone-600 text-sm mb-3">{service.description}</p>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-stone-600 flex items-center gap-1"><Clock className="w-4 h-4" /> {service.duration} hours</span>
                    <span className="text-lg font-bold text-amber-700">฿{service.price}</span>
                  </div>
                </div>
              </div>

              {selectedAddOns.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-stone-900 mb-3">Selected Add-ons</h4>
                  <div className="space-y-2">
                    {selectedAddOns.map((addon) => (
                      <div key={addon.id} className="flex justify-between items-center p-3 bg-stone-50 rounded-lg">
                        <span className="text-stone-700">{addon.name}</span>
                        <span className="text-amber-700 font-medium">+฿{addon.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {qtyParam > 1 && (
                <div className="mb-6 p-3 bg-stone-50 rounded-lg">
                  <span className="text-stone-700">Quantity: {qtyParam} people</span>
                </div>
              )}

              <div className="flex justify-between items-center p-4 bg-stone-50 rounded-xl">
                <span className="font-semibold text-stone-900">Total Price</span>
                <span className="text-2xl font-bold text-amber-700">฿{totalPrice}</span>
              </div>
            </div>
          )}

          {/* Step 2: Date & Time */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-bold text-stone-900 mb-6">Select Your Preferred Date and Time</h2>

              <div className="mb-6">
                <h3 className="font-semibold text-stone-900 mb-3">Date</h3>
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
                <h3 className="font-semibold text-stone-900 mb-3">Time</h3>
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
                  Please select date and time
                </div>
              ) : (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Service on {new Date(selectedDate).toLocaleDateString('en-US', { dateStyle: 'long' })} at {selectedTime}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Address */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-bold text-stone-900 mb-6">Provider Preference</h2>

              <div className="space-y-4">
                <p className="text-stone-600 mb-6">Please select your preferred service provider</p>

                {[
                  { value: 'female-only', label: 'Female only', description: 'Only female service providers' },
                  { value: 'male-only', label: 'Male only', description: 'Only male service providers' },
                  { value: 'prefer-female', label: 'Prefer female', description: 'Female preferred, male if unavailable' },
                  { value: 'prefer-male', label: 'Prefer male', description: 'Male preferred, female if unavailable' },
                  { value: 'no-preference', label: 'No preference', description: 'Any available service provider' },
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
              <h2 className="text-xl font-bold text-stone-900 mb-6">Address and Contact Information</h2>

              {/* Saved Addresses */}
              {addresses && addresses.length > 0 && !showManualAddressForm ? (
                <div className="space-y-4">
                  <p className="text-stone-600 mb-4">Select a saved address or add a new one</p>

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
                                  Default
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
                    <span className="font-medium">Add New Address</span>
                  </button>

                  {/* Additional Notes */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="E.g., building access code, meeting point, or other important information"
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
                      Back to saved addresses
                    </button>
                  )}

                  {/* Manual Address Form */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Contact Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={address.name}
                      onChange={(e) => setAddress({ ...address, name: e.target.value })}
                      placeholder="Full Name"
                      className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={address.phone}
                      onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                      placeholder="08x-xxx-xxxx"
                      className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={address.address}
                      onChange={(e) => setAddress({ ...address, address: e.target.value })}
                      placeholder="House number, village, street"
                      className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Sub-district
                      </label>
                      <input
                        type="text"
                        value={address.subdistrict}
                        onChange={(e) => setAddress({ ...address, subdistrict: e.target.value })}
                        placeholder="Sub-district"
                        className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        District
                      </label>
                      <input
                        type="text"
                        value={address.district}
                        onChange={(e) => setAddress({ ...address, district: e.target.value })}
                        placeholder="District"
                        className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Province <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={address.province}
                        onChange={(e) => setAddress({ ...address, province: e.target.value })}
                        placeholder="Province"
                        className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={address.zipcode}
                        onChange={(e) => setAddress({ ...address, zipcode: e.target.value })}
                        placeholder="10500"
                        className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Google Maps Location Picker */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      เลือกตำแหน่งบนแผนที่ (ไม่บังคับ)
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
                      Additional Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="E.g., building access code, meeting point, or other important information"
                      rows={3}
                      className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Our team will arrive at your location on time
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 5 && (
            <div>
              <h2 className="text-xl font-bold text-stone-900 mb-6">Confirm Booking</h2>

              <div className="space-y-6">
                {/* Service Info */}
                <div className="flex items-start gap-4 p-4 bg-stone-50 rounded-xl">
                  <div className="w-16 h-16 bg-gradient-to-br from-stone-100 to-amber-100 rounded-xl overflow-hidden">
                    <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-stone-900">{service.name}</h3>
                    <p className="text-sm text-stone-600 flex items-center gap-1"><Clock className="w-4 h-4" /> {service.duration} hours</p>
                  </div>
                  <span className="font-bold text-amber-700">฿{service.price * qtyParam}</span>
                </div>

                {/* Add-ons */}
                {selectedAddOns.length > 0 && (
                  <div>
                    <h4 className="font-medium text-stone-900 mb-2">Add-ons</h4>
                    {selectedAddOns.map((addon) => (
                      <div key={addon.id} className="flex justify-between py-2 border-b border-stone-100">
                        <span className="text-stone-600">{addon.name}</span>
                        <span className="text-stone-900">฿{addon.price * qtyParam}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Date & Time */}
                <div>
                  <h4 className="font-medium text-stone-900 mb-2 flex items-center gap-2"><Calendar className="w-4 h-4" /> Appointment Date & Time</h4>
                  <p className="text-stone-600">
                    {new Date(selectedDate).toLocaleDateString('en-US', { dateStyle: 'long' })}
                  </p>
                  <p className="text-stone-600 flex items-center gap-1"><Clock className="w-4 h-4" /> {selectedTime}</p>
                </div>

                {/* Location */}
                <div>
                  <h4 className="font-medium text-stone-900 mb-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> Service Location</h4>
                  <div className="text-stone-600 space-y-1">
                    <p>{address.name}</p>
                    <p>{address.phone}</p>
                    <p>{address.address}</p>
                    {address.district && <p>{address.subdistrict} {address.district}</p>}
                    <p>{address.province} {address.zipcode}</p>
                  </div>
                </div>

                {/* Notes */}
                {notes && (
                  <div>
                    <h4 className="font-medium text-stone-900 mb-2">Notes</h4>
                    <p className="text-stone-600 bg-stone-50 p-3 rounded-lg">{notes}</p>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-center p-4 bg-stone-50 rounded-xl">
                  <span className="font-semibold text-stone-900">Total Price</span>
                  <span className="text-2xl font-bold text-amber-700">฿{totalPrice}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Payment */}
          {currentStep === 6 && customer && createdBookingId && (
            <div>
              <h2 className="text-xl font-bold text-stone-900 mb-6">Payment</h2>

              {/* Payment Channel Selection - Show if no channel selected yet */}
              {!selectedPaymentChannel ? (
                <div className="space-y-4">
                  <p className="text-stone-600 mb-4">เลือกช่องทางการชำระเงิน</p>

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
                        <h3 className="font-semibold text-stone-900">บัตรเครดิต/เดบิต</h3>
                        <p className="text-xs text-stone-600">Credit/Debit Card</p>
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
                        <h3 className="font-semibold text-stone-900">พร้อมเพย์</h3>
                        <p className="text-xs text-stone-600">PromptPay QR Code</p>
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
                        <h3 className="font-semibold text-stone-900">อินเทอร์เน็ตแบงก์กิ้ง</h3>
                        <p className="text-xs text-stone-600">Internet Banking</p>
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
                        <h3 className="font-semibold text-stone-900">โมบายแบงก์กิ้ง</h3>
                        <p className="text-xs text-stone-600">Mobile Banking</p>
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
                    เปลี่ยนช่องทางชำระเงิน
                  </button>

                  {/* Saved Payment Methods */}
                  {paymentMethods && paymentMethods.length > 0 && !showManualPaymentForm ? (
                    <div className="space-y-4">
                      <p className="text-stone-600 mb-4">เลือกบัตรที่บันทึกไว้ หรือเพิ่มบัตรใหม่</p>

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
                                        Default
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-stone-600">
                                    Expires {String(pm.card_expiry_month).padStart(2, '0')}/{pm.card_expiry_year}
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
                        <span className="font-medium">เพิ่มบัตรใหม่</span>
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
                              กำลังประมวลผล...
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4" />
                              ชำระเงิน ฿{totalPrice.toLocaleString()}
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
                          กลับไปบัตรที่บันทึกไว้
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
                    เปลี่ยนช่องทางชำระเงิน
                  </button>

                  {!promptpayQRCode ? (
                    <div className="text-center py-8">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <QrCode className="w-12 h-12 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-stone-900 mb-2">ชำระเงินผ่านพร้อมเพย์</h3>
                      <p className="text-stone-600 mb-2">จำนวนเงิน</p>
                      <p className="text-3xl font-bold text-amber-700 mb-6">฿{totalPrice.toLocaleString()}</p>
                      <p className="text-sm text-stone-600 mb-6">
                        กดปุ่มด้านล่างเพื่อสร้าง QR Code<br />
                        จากนั้นสแกนด้วยแอปธนาคารของคุณ
                      </p>
                      <button
                        onClick={handlePayWithPromptPay}
                        disabled={isProcessingPayment}
                        className="px-8 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:bg-stone-300 disabled:cursor-not-allowed"
                      >
                        {isProcessingPayment ? 'กำลังสร้าง QR Code...' : 'สร้าง QR Code'}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <h3 className="text-xl font-bold text-stone-900 mb-4">สแกน QR Code เพื่อชำระเงิน</h3>
                      <div className="bg-white p-6 rounded-2xl shadow-lg inline-block mb-4">
                        <img src={promptpayQRCode} alt="PromptPay QR Code" className="w-64 h-64 mx-auto" />
                      </div>
                      <p className="text-lg font-semibold text-amber-700 mb-2">฿{totalPrice.toLocaleString()}</p>
                      <p className="text-sm text-stone-600 mb-6">
                        กรุณาสแกน QR Code ด้วยแอปธนาคารของคุณ<br />
                        ระบบจะตรวจสอบการชำระเงินอัตโนมัติ
                      </p>
                      <div className="flex items-center justify-center gap-2 text-blue-600">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span className="text-sm">รอการชำระเงิน...</span>
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
                    เปลี่ยนช่องทางชำระเงิน
                  </button>

                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-stone-900 mb-2">
                      {selectedPaymentChannel === 'internet_banking' ? 'อินเทอร์เน็ตแบงก์กิ้ง' : 'โมบายแบงก์กิ้ง'}
                    </h3>
                    <p className="text-stone-600">เลือกธนาคารของคุณ</p>
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
                        <p className="text-xs font-medium text-stone-900">ไทยพาณิชย์</p>
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
                        <p className="text-xs font-medium text-stone-900">กสิกรไทย</p>
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
                        <p className="text-xs font-medium text-stone-900">กรุงเทพ</p>
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
                        <p className="text-xs font-medium text-stone-900">กรุงไทย</p>
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
                        <p className="text-xs font-medium text-stone-900">กรุงศรี</p>
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
                        <p className="text-xs font-medium text-stone-900">ทหารไทยธนชาต</p>
                      </div>
                    </button>
                  </div>

                  {isProcessingPayment && (
                    <div className="text-center py-4">
                      <div className="flex items-center justify-center gap-2 text-amber-700">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-700"></div>
                        <span>กำลังเตรียมการชำระเงิน...</span>
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
                    เปลี่ยนช่องทางชำระเงิน
                  </button>

                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="w-8 h-8 text-amber-700" />
                    </div>
                    <h3 className="text-lg font-semibold text-stone-900 mb-2">
                      ช่องทางชำระเงินนี้กำลังพัฒนา
                    </h3>
                    <p className="text-stone-600 mb-6">
                      กรุณาเลือกช่องทางอื่น
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
              Back
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
                Next
              </button>
            ) : (
              <button
                onClick={handleCompleteBooking}
                className="px-8 py-3 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:shadow-lg transition flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Confirm Booking
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default BookingWizard
