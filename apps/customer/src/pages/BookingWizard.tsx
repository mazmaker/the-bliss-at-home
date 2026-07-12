import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from '@bliss/i18n'
import { ChevronLeft, Clock, Calendar, MapPin, CreditCard, Building2, Banknote, AlertTriangle, CheckCircle, Sparkles, Plus, QrCode, Smartphone, Wallet, User, Phone } from 'lucide-react'
import { getAvailableHoursForDate, getAvailableMinutesForDateHour } from '../utils/timeSlots'
import { useServiceBySlug, useServiceById } from '@bliss/supabase/hooks/useServices'
import { useCurrentCustomer } from '@bliss/supabase/hooks/useCustomer'
import { useCreateBookingWithServices } from '@bliss/supabase/hooks/useBookings'
import { useAddresses, useCreateAddress } from '@bliss/supabase/hooks/useAddresses'
import { usePaymentMethods } from '@bliss/supabase/hooks/usePaymentMethods'
import { Database, PromoValidationResult, isSpecificPreference, getProviderPreferenceLabel, getProviderPreferenceBadgeStyle } from '@bliss/supabase'
import { supabase } from '@bliss/supabase/auth'
import PaymentForm from '../components/PaymentForm'
import ManualPaymentInstructions, { type ManualQrConfig } from '../components/ManualPaymentInstructions'
import { GoogleMapsPicker } from '../components/GoogleMapsPicker'
import { CustomerTypeSelector } from '../components/CustomerTypeSelector'
import { ServiceDurationPicker, getPriceForDuration, getAvailableDurations } from '../components/ServiceDurationPicker'
import { pickLang } from '../utils/serviceUtils'
import { CoupleServiceConfig } from '../components/CoupleServiceConfig'
import { VoucherCodeInput } from '../components/VoucherCodeInput'
import { PointsRedeemSection } from '../components/PointsRedeemSection'
import ThaiAddressFields from '../components/ThaiAddressFields'
import { getServiceImage } from '../utils/imageUtils'
import { HealthDeclarationModal, fetchHealthDeclaration } from '../components/HealthDeclarationModal'

type Step = 1 | 2 | 3 | 4 | 5 | 6

type ProviderPreference = 'female-only' | 'male-only' | 'prefer-female' | 'prefer-male' | 'no-preference'

function BookingWizard() {
  const { t, i18n } = useTranslation('booking')
  const dateLocale = i18n.language === 'cn' ? 'zh-CN' : i18n.language === 'en' ? 'en-US' : 'th-TH'
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
  const createAddress = useCreateAddress()

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
  // Loyalty Points
  const [pointsRedeemed, setPointsRedeemed] = useState(0)
  const [pointsDiscount, setPointsDiscount] = useState(0)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedHour, setSelectedHour] = useState('')
  const [selectedMinute, setSelectedMinute] = useState('')
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
  // [R1] Admin-controlled allowlist of payment channels (fetched from server); default = PromptPay only.
  const [enabledChannels, setEnabledChannels] = useState<string[]>(['promptpay'])
  const [channelsLoaded, setChannelsLoaded] = useState(false)
  // [manual-QR] Admin payment mode + manual-QR config (fetched alongside channels at mount). Default = omise.
  const [paymentMode, setPaymentMode] = useState<'omise' | 'manual_qr'>('omise')
  const [manualQrConfig, setManualQrConfig] = useState<ManualQrConfig | null>(null)
  const [selectedBank, setSelectedBank] = useState<string | null>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [promptpayQRCode, setPromptpayQRCode] = useState<string | null>(null)
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null)
  const [createdBookingNumber, setCreatedBookingNumber] = useState<string | null>(null)
  // Health declaration gate — must be completed before first booking
  const [showHealthModal, setShowHealthModal] = useState(false)
  const [healthDeclared, setHealthDeclared] = useState(false)

  // Fetch person2's service data if different from person1
  const { data: person2ServiceData } = useServiceById(
    person2ServiceId && person2ServiceId !== serviceData?.id ? person2ServiceId : undefined
  )

  // Transform service data
  const service = useMemo(() => {
    if (!serviceData) return null
    return {
      id: serviceData.id,
      name: pickLang(serviceData, 'name', i18n.language),
      price: Number(serviceData.base_price || 0),
      duration: (serviceData.duration || 60) / 60, // Convert to hours
      durationMinutes: serviceData.duration || 60,
      category: serviceData.category,
      description: pickLang(serviceData, 'description', i18n.language),
      image: getServiceImage(serviceData.image_url, serviceData.category),
      addons: serviceData.addons || [],
      raw: serviceData, // keep raw for duration/price helpers
    }
  }, [serviceData, i18n.language])

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

  // Auto-fill customer data when showing manual address form
  useEffect(() => {
    if (showManualAddressForm && customer && !address.name && !address.phone) {
      setAddress(prev => ({
        ...prev,
        name: customer.full_name || customer.first_name || '',
        phone: customer.phone || '',
      }))
    }
  }, [showManualAddressForm, customer, address.name, address.phone])

  // Auto-show manual form with customer data if no saved addresses
  useEffect(() => {
    if (!addressesLoading && addresses && customer && !selectedAddressId) {
      if (addresses.length === 0) {
        // No saved addresses, show manual form with customer data
        setShowManualAddressForm(true)
        setAddress({
          name: customer.full_name || customer.first_name || '',
          phone: customer.phone || '',
          address: '',
          district: '',
          subdistrict: '',
          province: '',
          zipcode: '',
        })
      }
    }
  }, [addressesLoading, addresses, customer, selectedAddressId])

  // Price calculation - only calculate if selectedDuration is valid
  const person1Price = (service?.raw && selectedDuration > 0) ? getPriceForDuration(service.raw, selectedDuration) : 0
  const person1AddonTotal = service?.addons
    .filter((a) => (customerType === 'couple' ? person1AddOns : addOnsParam).includes(a.id))
    .reduce((sum, a) => sum + Number(a.price), 0) || 0

  const p2Svc = person2Service || serviceData
  const person2PriceVal = (p2Svc && person2Duration > 0) ? getPriceForDuration(p2Svc, person2Duration) : 0
  const person2AddonTotal = p2Svc
    ? (p2Svc.addons || [])
        .filter((a: any) => person2AddOns.includes(a.id))
        .reduce((sum: number, a: any) => sum + Number(a.price), 0)
    : 0

  const subtotal = customerType === 'couple'
    ? person1Price + person1AddonTotal + person2PriceVal + person2AddonTotal
    : (person1Price + person1AddonTotal) * qtyParam

  const discountAmount = appliedPromo?.valid ? appliedPromo.discountAmount : 0
  const priceAfterPromo = Math.max(0, subtotal - discountAmount)
  const totalPrice = Math.max(0, priceAfterPromo - pointsDiscount)

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

  // Available dates: 14 days starting from launch date (2026-06-26) or today, whichever is later
  const LAUNCH_DATE = '2026-06-26'
  const todayStr = new Date().toISOString().split('T')[0]
  const dateRangeStart = new Date(todayStr < LAUNCH_DATE ? LAUNCH_DATE : todayStr)
  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(dateRangeStart)
    date.setDate(date.getDate() + i)
    return date.toISOString().split('T')[0]
  })

  // Available hours and minutes based on selected date
  const availableHours = selectedDate ? getAvailableHoursForDate(selectedDate) : []
  const availableMinutes = selectedDate && selectedHour ? getAvailableMinutesForDateHour(selectedDate, selectedHour) : []

  // Update selectedTime when hour and minute are both selected
  useEffect(() => {
    if (selectedHour && selectedMinute) {
      setSelectedTime(`${selectedHour}:${selectedMinute}`)
    } else {
      setSelectedTime('')
    }
  }, [selectedHour, selectedMinute])

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
    // Auto-fill with customer data instead of resetting to empty
    setAddress({
      name: customer?.full_name || customer?.first_name || '',
      phone: customer?.phone || '',
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

  // [R1] Fetch the admin-enabled payment channels once on mount.
  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')
    fetch(`${apiBase}/api/payments/enabled-channels`)
      .then(r => r.json())
      .then(d => {
        if (d?.success && Array.isArray(d.channels) && d.channels.length > 0) setEnabledChannels(d.channels)
        // [manual-QR] capture mode + config so Step 6 can render the manual screen instead of Omise
        if (d?.payment_mode === 'manual_qr') {
          setPaymentMode('manual_qr')
          if (d.manual_qr) setManualQrConfig(d.manual_qr)
        }
      })
      .catch(err => console.error('Failed to fetch enabled payment channels:', err))
      .finally(() => setChannelsLoaded(true))
  }, [])

  // [R1] When only one channel is enabled, auto-select it so the chooser is skipped.
  // [manual-QR] G22: do NOT auto-select in manual_qr mode (server defaults to 1 channel) — would race-mount the Omise form under the manual screen.
  useEffect(() => {
    if (currentStep === 6 && channelsLoaded && paymentMode !== 'manual_qr' && !selectedPaymentChannel && enabledChannels.length === 1) {
      setSelectedPaymentChannel(enabledChannels[0])
    }
  }, [currentStep, channelsLoaded, paymentMode, selectedPaymentChannel, enabledChannels])

  const handlePayWithPromptPay = async () => {
    if (!customer || !createdBookingId) {
      alert(t('booking:error.missingRequired'))
      return
    }

    setIsProcessingPayment(true)

    try {
      // Create PromptPay QR payment source
      const result = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')}/api/payments/create-source`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
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
      alert(t('booking:error.paymentFailedAlert', { error: error.message || t('common:error.tryAgain') }))
      setIsProcessingPayment(false)
    }
  }

  const handlePayWithBank = async (bankCode: string, isMobile: boolean) => {
    if (!customer || !createdBookingId) {
      alert(t('booking:error.missingRequired'))
      return
    }

    setIsProcessingPayment(true)

    try {
      const sourceType = isMobile ? `mobile_banking_${bankCode}` : `internet_banking_${bankCode}`

      // Create banking source
      const result = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')}/api/payments/create-source`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
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
      alert(t('booking:error.paymentFailedAlert', { error: error.message || t('common:error.tryAgain') }))
      setIsProcessingPayment(false)
    }
  }

  const pollPaymentStatus = async (chargeId: string) => {
    // Poll every 3 seconds for payment status
    const pollInterval = setInterval(async () => {
      try {
        const result = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')}/api/payments/status/${chargeId}`)
        const data = await result.json()

        if (data.status === 'successful') {
          clearInterval(pollInterval)
          setIsProcessingPayment(false)
          navigate(`/bookings?success=true`)
        } else if (data.status === 'failed') {
          clearInterval(pollInterval)
          setIsProcessingPayment(false)
          alert(t('booking:error.paymentFailed'))
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
        alert(t('booking:error.paymentTimeout'))
        setPromptpayQRCode(null)
      }
    }, 600000)
  }

  const handlePayWithSavedCard = async () => {
    if (!customer || !createdBookingId || !selectedPaymentMethodId) {
      alert(t('booking:error.missingRequired'))
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
      const result = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')}/api/payments/create-charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
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
        throw new Error(data.error || t('common:error.tryAgain'))
      }
    } catch (error: any) {
      console.error('Payment error:', error)
      alert(t('booking:error.paymentFailedAlert', { error: error.message || t('common:error.tryAgain') }))
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const handleCompleteBooking = async () => {
    if (!service || !customer) {
      alert(t('booking:error.loginRequired'))
      return
    }

    // Health declaration gate — block booking until the customer has declared
    if (!healthDeclared) {
      const declaration = await fetchHealthDeclaration(customer.id)
      if (!declaration) {
        setShowHealthModal(true)
        return
      }
      setHealthDeclared(true)
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

      // Prepare add-ons data PER RECIPIENT — recipient_index maps each add-on to the person it
      // belongs to (person1 = 0, person2 = 1) so couple earnings/display are attributed correctly.
      // NOTE: price_per_unit/total_price/name are re-snapped from the catalog by the booking_addons
      // BEFORE-INSERT trigger (server-authoritative anti-tamper); the values sent here are for the
      // pre-payment display total only and are overridden on insert.
      const buildAddons = (ids: string[], lookup: any[], recipientIndex: number) =>
        ids.map((addonId) => {
          const addon = lookup.find((a: any) => a.id === addonId)
          return {
            addon_id: addonId,
            quantity: 1,
            recipient_index: recipientIndex,
            price_per_unit: addon ? Number(addon.price) : 0,
            total_price: addon ? Number(addon.price) : 0,
          }
        })

      const addonsData = customerType === 'couple'
        ? [
            ...buildAddons(person1AddOns, service.addons || [], 0),
            ...buildAddons(person2AddOns, (p2Svc as any)?.addons || [], 1),
          ]
        : buildAddons(addOnsParam, service.addons || [], 0)

      const bookingId = await createBookingWithServices.mutateAsync({
        bookingData: {
          customer_id: customer.id,
          booking_date: selectedDate,
          booking_time: selectedTime,
          address: fullAddress || null,
          latitude: manualAddressLocation.latitude,
          longitude: manualAddressLocation.longitude,
          customer_notes: notes || null,
          admin_notes: paymentMode === 'manual_qr' ? '[MANUAL_QR]' : null, // [manual-QR] G15: marker from the SAME payment_mode snapshot as the Step-6 branch; decoupled from lat/lng (C11)
          service_format: serviceFormat as 'single' | 'simultaneous' | 'sequential',
          recipient_count: recipientCount,
          discount_amount: discountAmount,
          final_price: totalPrice,
          promotion_id: appliedPromo?.valid ? appliedPromo.promotion?.id || null : null,
          provider_preference: providerPreference,
          points_redeemed: pointsRedeemed || 0,
          points_discount: pointsDiscount || 0,
        },
        services,
        addons: addonsData.length > 0 ? addonsData : undefined,
      })

      // Store booking ID
      setCreatedBookingId(bookingId)

      // Save the just-typed address as the customer's DEFAULT — ONLY when the manual form was used
      // AND the customer has NO existing default yet (use !some(is_default), NOT length===0, so a
      // customer who deleted their default still gets one). Skip if a NOT-NULL field is blank
      // (Step-4 does not hard-require zipcode). Non-blocking: mirror the points-redeem block so a
      // save failure never breaks the booking result. (PART42 item #9)
      if (
        showManualAddressForm &&
        !addressesLoading &&
        addresses &&
        !addresses.some((a: any) => a.is_default) &&
        address.name && address.phone && address.address && address.province && address.zipcode
      ) {
        try {
          await createAddress.mutateAsync({
            customer_id: customer.id,
            label: 'Home',
            recipient_name: address.name,
            phone: address.phone,
            address_line: address.address,
            subdistrict: address.subdistrict || null,
            district: address.district || null,
            province: address.province,
            zipcode: address.zipcode,
            latitude: manualAddressLocation.latitude,
            longitude: manualAddressLocation.longitude,
            is_default: true,
          } as any)
          console.log('📍 Saved typed address as the customer default')
        } catch (err) {
          console.error('⚠️ Failed to save default address (non-blocking):', err)
        }
      }
      // [manual-QR] fetch the trigger-generated booking_number to show on the manual-QR payment screen
      try {
        const { getBrowserClient } = await import('@bliss/supabase')
        const { data: bRow } = await getBrowserClient()
          .from('bookings')
          .select('booking_number')
          .eq('id', bookingId)
          .single()
        setCreatedBookingNumber((bRow as any)?.booking_number ?? null)
      } catch {
        setCreatedBookingNumber(null)
      }

      // Loyalty points are now redeemed ATOMICALLY inside create_booking_with_addons (the RPC
      // behind createBookingWithServices), in the same transaction as the booking — pointsRedeemed
      // / pointsDiscount are passed via bookingData above. The old separate, error-swallowed
      // redeemPoints() call is removed: it could deduct points even if the booking failed (leak).

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
      alert(t('booking:error.bookingFailed', { error: error?.message || t('common:error.tryAgain') }))
    }
  }

  // Loading state
  if (serviceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bliss-600 mx-auto"></div>
          <p className="text-bliss-700 mt-4">{t('wizard.loadingService')}</p>
        </div>
      </div>
    )
  }

  // Service not found
  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-bliss-700 text-lg">{t('wizard.serviceNotFound')}</p>
          <Link to="/services" className="inline-block mt-4 text-bliss-600 hover:text-bliss-700 font-medium">
            {t('wizard.backToServices')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bliss-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link to={`/services/${serviceSlug}`} className="inline-flex items-center text-bliss-600 hover:text-bliss-800 mb-4">
            <ChevronLeft className="w-5 h-5" />
            {t('wizard.backToDetails')}
          </Link>

          <h1 className="text-2xl font-bold text-bliss-900 mb-4">{t('wizard.title')}</h1>

          {/* Progress Steps */}
          <div className="flex items-start mb-6">
            {steps.map((step, index) => (
              <>
                <div key={step.num} className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                    currentStep >= step.num ? 'bg-bliss-600 text-white' : 'bg-bliss-200 text-bliss-500'
                  }`}>
                    {step.num}
                  </div>
                  <span className={`text-xs mt-1.5 whitespace-nowrap ${
                    currentStep >= step.num ? 'text-bliss-700 font-medium' : 'text-bliss-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 self-start mt-[18px] transition-colors ${
                    currentStep > step.num ? 'bg-bliss-600' : 'bg-bliss-200'
                  }`} />
                )}
              </>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          {/* Step 1: Service Confirmation */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-bold text-bliss-900 mb-6">{t('wizard.step1.title')}</h2>

              {/* Service info card */}
              <div className="flex items-start gap-6 p-6 bg-bliss-100 rounded-xl mb-6">
                <div className="w-24 h-24 bg-bliss-100 rounded-xl overflow-hidden">
                  <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-bliss-900 mb-2">{service.name}</h3>
                  <p className="text-bliss-700 text-sm mb-3">{service.description}</p>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-bliss-700 flex items-center gap-1"><Clock className="w-4 h-4" /> {t('wizard.step1.minutes', { count: selectedDuration })}</span>
                    <span className="text-lg font-bold text-bliss-600">฿{person1Price.toLocaleString()}</span>
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
                  <h4 className="font-semibold text-bliss-900 mb-3">{t('wizard.step1.selectedAddons')}</h4>
                  <div className="space-y-2">
                    {selectedAddOns.map((addon) => (
                      <div key={addon.id} className="flex justify-between items-center p-3 bg-bliss-100 rounded-lg">
                        <span className="text-bliss-700">{addon.name_th || addon.name_en}</span>
                        <span className="text-bliss-600 font-medium">+฿{Number(addon.price).toLocaleString()}</span>
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
                <div className="mb-6 p-3 bg-bliss-100 rounded-lg">
                  <span className="text-bliss-700">{t('wizard.step1.quantity', { count: qtyParam })}</span>
                </div>
              )}

              {/* Price summary */}
              <div className="flex justify-between items-center p-4 bg-bliss-100 rounded-xl">
                <span className="font-semibold text-bliss-900">{t('wizard.step1.totalPrice')}</span>
                <span className="text-2xl font-bold text-bliss-600">฿{totalPrice.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Step 2: Date & Time */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-bold text-bliss-900 mb-6">{t('wizard.step2.title')}</h2>

              <div className="mb-6">
                <h3 className="font-semibold text-bliss-900 mb-3">{t('wizard.step2.date')}</h3>
                <p className="text-sm text-bliss-500 mb-3">
                  {t('booking:wizard.step2.advanceBookingLimit')}
                </p>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {availableDates.map((date) => {
                    const dateObj = new Date(date)
                    const dayName = dateObj.toLocaleDateString(dateLocale, { weekday: 'short' })
                    const dayNum = dateObj.getDate()
                    const monthName = dateObj.toLocaleDateString(dateLocale, { month: 'short' })

                    return (
                      <button
                        key={date}
                        onClick={() => {
                          setSelectedDate(date)
                          // Reset hour and minute when date changes
                          setSelectedHour('')
                          setSelectedMinute('')
                          setSelectedTime('')
                        }}
                        className={`p-4 rounded-xl border-2 transition ${
                          selectedDate === date
                            ? 'border-bliss-600 bg-bliss-100 text-bliss-600'
                            : 'border-bliss-200 hover:border-bliss-400'
                        }`}
                      >
                        <div className="text-xs text-bliss-500">{dayName}</div>
                        <div className="text-xl font-bold">{dayNum}</div>
                        <div className="text-xs text-bliss-500">{monthName}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Time Selection - Step 1: Hour */}
              <div>
                <h3 className="font-semibold text-bliss-900 mb-3">{t('booking:wizard.step2.selectHour')}</h3>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                  {availableHours.map((hour) => (
                    <button
                      key={hour}
                      onClick={() => {
                        setSelectedHour(hour)
                        setSelectedMinute('') // Reset minute selection
                      }}
                      className={`py-2 px-3 rounded-xl border-2 transition text-sm ${
                        selectedHour === hour
                          ? 'border-bliss-600 bg-bliss-100 text-bliss-600 font-medium'
                          : 'border-bliss-200 hover:border-bliss-400'
                      }`}
                    >
                      {hour}:00
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selection - Step 2: Minute */}
              {selectedHour && (
                <div>
                  <h3 className="font-semibold text-bliss-900 mb-3">{t('booking:wizard.step2.selectMinute')}</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {availableMinutes.map((minute) => (
                      <button
                        key={minute}
                        onClick={() => setSelectedMinute(minute)}
                        className={`py-3 px-4 rounded-xl border-2 transition ${
                          selectedMinute === minute
                            ? 'border-bliss-600 bg-bliss-100 text-bliss-600 font-medium'
                            : 'border-bliss-200 hover:border-bliss-400'
                        }`}
                      >
                        {selectedHour}:{minute}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!selectedDate || !selectedTime ? (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {t('wizard.step2.pleaseSelect')}
                </div>
              ) : (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {t('wizard.step2.selectedDateTime', { date: new Date(selectedDate).toLocaleDateString(dateLocale, { dateStyle: 'long' }), time: selectedTime })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Address */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-bold text-bliss-900 mb-6">{t('wizard.step3.title')}</h2>

              <div className="space-y-4">
                <p className="text-bliss-700 mb-6">{t('wizard.step3.subtitle')}</p>

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
                        ? 'border-bliss-600 bg-bliss-100'
                        : 'border-bliss-200 hover:border-bliss-400 hover:bg-bliss-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-bliss-900">{option.label}</h3>
                        <p className="text-sm text-bliss-700 mt-1">{option.description}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        providerPreference === option.value
                          ? 'border-bliss-600 bg-bliss-600'
                          : 'border-bliss-300'
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
              <h2 className="text-xl font-bold text-bliss-900 mb-6">{t('wizard.step4.title')}</h2>

              {/* Loading state for addresses */}
              {addressesLoading && !addresses ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bliss-600 mx-auto mb-3"></div>
                    <p className="text-bliss-700 text-sm">{t('booking:wizard.step4.loadingAddresses')}</p>
                  </div>
                </div>
              ) : addresses && addresses.length > 0 && !showManualAddressForm ? (
                <div className="space-y-4">
                  <p className="text-bliss-700 mb-4">{t('wizard.step4.selectSaved')}</p>

                  {/* Saved Address Cards */}
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <button
                        key={addr.id}
                        onClick={() => handleSelectAddress(addr.id)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition ${
                          selectedAddressId === addr.id
                            ? 'border-bliss-600 bg-bliss-100'
                            : 'border-bliss-200 hover:border-bliss-400 hover:bg-bliss-100'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-block px-2 py-1 bg-bliss-100 text-bliss-700 text-xs rounded">
                                {addr.label}
                              </span>
                              {addr.is_default && (
                                <span className="inline-block px-2 py-1 bg-bliss-200 text-bliss-600 text-xs rounded">
                                  {t('wizard.step4.default')}
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-bliss-900 mb-1">{addr.recipient_name}</h3>
                            <p className="text-sm text-bliss-700 mb-1">{addr.phone}</p>
                            <p className="text-sm text-bliss-700">
                              {addr.address_line}
                              {addr.subdistrict && `, ${addr.subdistrict}`}
                              {addr.district && `, ${addr.district}`}
                              {`, ${addr.province} ${addr.zipcode || ''}`}
                            </p>
                            {addr.is_default && selectedAddressId === addr.id && (
                              <p className="flex items-center gap-1 text-xs text-bliss-600 mt-2 font-medium">
                                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                {t('wizard.step4.usingDefaultHint')}
                              </p>
                            )}
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                            selectedAddressId === addr.id
                              ? 'border-bliss-600 bg-bliss-600'
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
                    className="w-full p-4 rounded-xl border-2 border-dashed border-bliss-300 text-bliss-700 hover:border-bliss-600 hover:text-bliss-600 hover:bg-bliss-100 transition flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="font-medium">{t('wizard.step4.addNew')}</span>
                  </button>

                  {/* Additional Notes */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-bliss-700 mb-2">
                      {t('wizard.step4.notes')}
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('wizard.step4.notesPlaceholder')}
                      rows={3}
                      className="w-full px-4 py-3 border border-bliss-300 rounded-xl focus:ring-2 focus:ring-bliss-600 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Back to Saved Addresses */}
                  {addresses && addresses.length > 0 && showManualAddressForm && (
                    <button
                      onClick={() => setShowManualAddressForm(false)}
                      className="text-bliss-600 hover:text-bliss-700 text-sm flex items-center gap-1 mb-4"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      {t('wizard.step4.backToSaved')}
                    </button>
                  )}

                  {/* Manual Address Form */}
                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      {t('wizard.step4.contactName')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={address.name}
                      onChange={(e) => setAddress({ ...address, name: e.target.value })}
                      placeholder={t('wizard.step4.fullName')}
                      className="w-full px-4 py-3 border border-bliss-300 rounded-xl focus:ring-2 focus:ring-bliss-600 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-1" />
                      {t('wizard.step4.phoneNumber')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={address.phone}
                      onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                      placeholder={t('wizard.step4.phonePlaceholder')}
                      className="w-full px-4 py-3 border border-bliss-300 rounded-xl focus:ring-2 focus:ring-bliss-600 focus:border-transparent"
                    />
                  </div>

                  {/* Google Maps Location Picker */}
                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      {t('wizard.step4.mapLabel')} <span className="text-red-500">*</span>
                    </label>
                    <GoogleMapsPicker
                      latitude={manualAddressLocation.latitude}
                      longitude={manualAddressLocation.longitude}
                      onLocationChange={handleLocationChange}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      {t('wizard.step4.address')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={address.address}
                      onChange={(e) => setAddress({ ...address, address: e.target.value })}
                      placeholder={t('wizard.step4.addressPlaceholder')}
                      className="w-full px-4 py-3 border border-bliss-300 rounded-xl focus:ring-2 focus:ring-bliss-600 focus:border-transparent"
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

                  {/* Additional Notes */}
                  <div>
                    <label className="block text-sm font-medium text-bliss-700 mb-2">
                      {t('wizard.step4.notes')}
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('wizard.step4.notesPlaceholder')}
                      rows={3}
                      className="w-full px-4 py-3 border border-bliss-300 rounded-xl focus:ring-2 focus:ring-bliss-600 focus:border-transparent resize-none"
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
              <h2 className="text-xl font-bold text-bliss-900 mb-6">{t('wizard.step5.title')}</h2>

              <div className="space-y-6">
                {/* Service Summary */}
                <div>
                  <h4 className="font-medium text-bliss-900 mb-3">{t('wizard.step5.serviceSummary')}</h4>

                  {/* Person 1 */}
                  <div className="flex items-start gap-4 p-4 bg-bliss-100 rounded-xl">
                    <div className="w-16 h-16 bg-bliss-100 rounded-xl overflow-hidden">
                      <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-bliss-900">
                        {customerType === 'couple' && <span className="text-xs text-bliss-500 block">{t('wizard.step1.person1')}</span>}
                        {service.name}
                      </h3>
                      <p className="text-sm text-bliss-700 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {t('wizard.step1.minutes', { count: selectedDuration })}
                      </p>
                    </div>
                    <span className="font-bold text-bliss-600">฿{person1Price.toLocaleString()}</span>
                  </div>

                  {/* Person 1 Add-ons */}
                  {customerType === 'single' && selectedAddOns.length > 0 && (
                    <div className="mt-2">
                      {selectedAddOns.map((addon) => (
                        <div key={addon.id} className="flex justify-between py-2 px-4 border-b border-bliss-100">
                          <span className="text-sm text-bliss-700">{addon.name_th || addon.name_en}</span>
                          <span className="text-sm text-bliss-900">+฿{Number(addon.price).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {customerType === 'couple' && person1AddOns.length > 0 && service.addons && (
                    <div className="mt-2">
                      {service.addons.filter(a => person1AddOns.includes(a.id)).map((addon) => (
                        <div key={addon.id} className="flex justify-between py-2 px-4 border-b border-bliss-100">
                          <span className="text-sm text-bliss-700">{addon.name_th || addon.name_en}</span>
                          <span className="text-sm text-bliss-900">+฿{Number(addon.price).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Person 2 (couple mode only) */}
                  {customerType === 'couple' && p2Svc && (
                    <>
                      <div className="flex items-start gap-4 p-4 bg-bliss-100 rounded-xl mt-3">
                        <div className="w-16 h-16 bg-bliss-100 rounded-xl overflow-hidden">
                          <img
                            src={getServiceImage(p2Svc.image_url, p2Svc.category)}
                            alt={pickLang(p2Svc, 'name', i18n.language)}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-bliss-900">
                            <span className="text-xs text-bliss-500 block">{t('wizard.step1.person2')}</span>
                            {pickLang(p2Svc, 'name', i18n.language)}
                          </h3>
                          <p className="text-sm text-bliss-700 flex items-center gap-1">
                            <Clock className="w-4 h-4" /> {t('wizard.step1.minutes', { count: person2Duration })}
                          </p>
                        </div>
                        <span className="font-bold text-bliss-600">฿{person2PriceVal.toLocaleString()}</span>
                      </div>
                      {/* Person 2 Add-ons */}
                      {person2AddOns.length > 0 && (p2Svc as any).addons && (
                        <div className="mt-2">
                          {((p2Svc as any).addons as any[]).filter((a: any) => person2AddOns.includes(a.id)).map((addon: any) => (
                            <div key={addon.id} className="flex justify-between py-2 px-4 border-b border-bliss-100">
                              <span className="text-sm text-bliss-700">{addon.name_th || addon.name_en}</span>
                              <span className="text-sm text-bliss-900">+฿{Number(addon.price).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Date & Time */}
                <div>
                  <h4 className="font-medium text-bliss-900 mb-2 flex items-center gap-2"><Calendar className="w-4 h-4" /> {t('wizard.step5.dateTime')}</h4>
                  <p className="text-bliss-700">
                    {new Date(selectedDate).toLocaleDateString(dateLocale, { dateStyle: 'long' })}
                  </p>
                  <p className="text-bliss-700 flex items-center gap-1"><Clock className="w-4 h-4" /> {selectedTime}</p>
                </div>

                {/* Location */}
                <div>
                  <h4 className="font-medium text-bliss-900 mb-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> {t('wizard.step5.location')}</h4>
                  <div className="text-bliss-700 space-y-1">
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
                    <h4 className="font-medium text-bliss-900 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" /> {t('booking:wizard.step5.providerPreference')}
                    </h4>
                    <span className={`inline-block text-sm px-3 py-1 rounded-full font-medium ${getProviderPreferenceBadgeStyle(providerPreference)}`}>
                      {getProviderPreferenceLabel(providerPreference)}
                    </span>
                  </div>
                )}

                {/* Notes */}
                {notes && (
                  <div>
                    <h4 className="font-medium text-bliss-900 mb-2">{t('wizard.step5.notes')}</h4>
                    <p className="text-bliss-700 bg-bliss-100 p-3 rounded-lg">{notes}</p>
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

                {/* Points Redemption */}
                {customer && (
                  <PointsRedeemSection
                    customerId={customer.id}
                    orderAmount={priceAfterPromo}
                    onPointsChange={(points, discount) => {
                      setPointsRedeemed(points)
                      setPointsDiscount(discount)
                    }}
                  />
                )}

                {/* Price Summary */}
                <div className="space-y-2 p-4 bg-bliss-100 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-bliss-700">{t('wizard.step5.subtotal')}</span>
                    <span className="font-medium text-bliss-900">฿{subtotal.toLocaleString()}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-green-600">
                      <span>{t('wizard.step5.discount')}</span>
                      <span className="font-medium">-฿{discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {pointsDiscount > 0 && (
                    <div className="flex justify-between items-center text-bliss-600">
                      <span>{t('booking:wizard.step5.pointsDiscount', { points: pointsRedeemed.toLocaleString() })}</span>
                      <span className="font-medium">-฿{pointsDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-bliss-200">
                    <span className="font-semibold text-bliss-900">{t('wizard.step5.totalPrice')}</span>
                    <span className="text-2xl font-bold text-bliss-600">฿{totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Payment */}
          {currentStep === 6 && customer && createdBookingId && (
            <div>
              <h2 className="text-xl font-bold text-bliss-900 mb-6">{t('wizard.payment.title')}</h2>

              {/* [manual-QR] Manual payment mode → static QR + send slip via LINE; NO Omise chooser/form/poll. */}
              {paymentMode === 'manual_qr' ? (
                <ManualPaymentInstructions
                  bookingNumber={createdBookingNumber}
                  amount={totalPrice}
                  config={manualQrConfig}
                />
              ) : !selectedPaymentChannel ? (
                <div className="space-y-4">
                  <p className="text-bliss-700 mb-4">{t('wizard.payment.selectChannel')}</p>

                  {/* Payment Channel Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Credit/Debit Card */}
                    {enabledChannels.includes('credit_card') && (
                    <button
                      onClick={() => setSelectedPaymentChannel('credit_card')}
                      className="p-4 rounded-xl border-2 border-bliss-200 hover:border-bliss-600 hover:bg-bliss-100 transition text-left flex items-center gap-3"
                    >
                      <div className="w-12 h-12 bg-bliss-600 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-bliss-900">{t('wizard.payment.creditCard')}</h3>
                        <p className="text-xs text-bliss-700">{t('wizard.payment.creditCardEn')}</p>
                      </div>
                    </button>
                    )}

                    {/* PromptPay QR */}
                    {enabledChannels.includes('promptpay') && (
                    <button
                      onClick={() => setSelectedPaymentChannel('promptpay')}
                      className="p-4 rounded-xl border-2 border-bliss-200 hover:border-bliss-600 hover:bg-bliss-100 transition text-left flex items-center gap-3"
                    >
                      <div className="w-12 h-12 bg-bliss-600 rounded-lg flex items-center justify-center">
                        <QrCode className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-bliss-900">{t('wizard.payment.promptpay')}</h3>
                        <p className="text-xs text-bliss-700">{t('wizard.payment.promptpayEn')}</p>
                      </div>
                    </button>
                    )}

                    {/* Internet Banking */}
                    {enabledChannels.includes('internet_banking') && (
                    <button
                      onClick={() => setSelectedPaymentChannel('internet_banking')}
                      className="p-4 rounded-xl border-2 border-bliss-200 hover:border-bliss-600 hover:bg-bliss-100 transition text-left flex items-center gap-3"
                    >
                      <div className="w-12 h-12 bg-bliss-600 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-bliss-900">{t('wizard.payment.internetBanking')}</h3>
                        <p className="text-xs text-bliss-700">{t('wizard.payment.internetBankingEn')}</p>
                      </div>
                    </button>
                    )}

                    {/* Mobile Banking */}
                    {enabledChannels.includes('mobile_banking') && (
                    <button
                      onClick={() => setSelectedPaymentChannel('mobile_banking')}
                      className="p-4 rounded-xl border-2 border-bliss-200 hover:border-bliss-600 hover:bg-bliss-100 transition text-left flex items-center gap-3"
                    >
                      <div className="w-12 h-12 bg-bliss-600 rounded-lg flex items-center justify-center">
                        <Smartphone className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-bliss-900">{t('wizard.payment.mobileBanking')}</h3>
                        <p className="text-xs text-bliss-700">{t('wizard.payment.mobileBankingEn')}</p>
                      </div>
                    </button>
                    )}
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
                    className="text-bliss-600 hover:text-bliss-700 text-sm flex items-center gap-1 mb-4"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('wizard.payment.changeChannel')}
                  </button>

                  {/* Saved Payment Methods */}
                  {paymentMethods && paymentMethods.length > 0 && !showManualPaymentForm ? (
                    <div className="space-y-4">
                      <p className="text-bliss-700 mb-4">{t('wizard.payment.selectSavedCard')}</p>

                      {/* Saved Payment Method Cards */}
                      <div className="space-y-3">
                        {paymentMethods.map((pm) => (
                          <button
                            key={pm.id}
                            onClick={() => setSelectedPaymentMethodId(pm.id)}
                            className={`w-full p-4 rounded-xl border-2 text-left transition ${
                              selectedPaymentMethodId === pm.id
                                ? 'border-bliss-600 bg-bliss-100'
                                : 'border-bliss-200 hover:border-bliss-400 hover:bg-bliss-100'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="w-12 h-8 bg-gradient-to-br from-bliss-700 to-bliss-900 rounded flex items-center justify-center text-white text-xs font-bold">
                                  <CreditCard className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-bliss-900">
                                      {pm.card_brand} •••• {pm.card_last_digits}
                                    </span>
                                    {pm.is_default && (
                                      <span className="inline-block px-2 py-1 bg-bliss-200 text-bliss-600 text-xs rounded">
                                        {t('wizard.payment.default')}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-bliss-700">
                                    {t('wizard.payment.expires')} {String(pm.card_expiry_month).padStart(2, '0')}/{pm.card_expiry_year}
                                  </p>
                                </div>
                              </div>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                                selectedPaymentMethodId === pm.id
                                  ? 'border-bliss-600 bg-bliss-600'
                                  : 'border-bliss-300'
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
                        className="w-full p-4 rounded-xl border-2 border-dashed border-bliss-300 text-bliss-700 hover:border-bliss-600 hover:text-bliss-600 hover:bg-bliss-100 transition flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="font-medium">{t('wizard.payment.addNewCard')}</span>
                      </button>

                      {/* Pay with Selected Card Button */}
                      {selectedPaymentMethodId && (
                        <button
                          onClick={handlePayWithSavedCard}
                          disabled={isProcessingPayment}
                          className="w-full bg-bliss-600 text-white py-4 rounded-xl font-medium hover:bg-bliss-700 transition disabled:bg-bliss-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                          className="text-bliss-600 hover:text-bliss-700 text-sm flex items-center gap-1 mb-4"
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
                          alert(t('booking:error.paymentFailedAlert', { error }))
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : selectedPaymentChannel === 'promptpay' ? (
                /* PromptPay QR Payment */
                <div className="space-y-4">
                  {enabledChannels.length > 1 && (
                  <button
                    onClick={() => {
                      setSelectedPaymentChannel(null)
                      setPromptpayQRCode(null)
                      setIsProcessingPayment(false)
                    }}
                    className="text-bliss-600 hover:text-bliss-700 text-sm flex items-center gap-1 mb-4"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('wizard.payment.changeChannel')}
                  </button>
                  )}

                  {!promptpayQRCode ? (
                    <div className="text-center py-8">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <QrCode className="w-12 h-12 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-bliss-900 mb-2">{t('wizard.payment.promptpayTitle')}</h3>
                      <p className="text-bliss-700 mb-2">{t('wizard.payment.amount')}</p>
                      <p className="text-3xl font-bold text-bliss-600 mb-6">฿{totalPrice.toLocaleString()}</p>
                      <p className="text-sm text-bliss-700 mb-6">
                        {t('wizard.payment.qrInstruction1')}<br />
                        {t('wizard.payment.qrInstruction2')}
                      </p>
                      <button
                        onClick={handlePayWithPromptPay}
                        disabled={isProcessingPayment}
                        className="px-8 py-4 bg-bliss-600 text-white rounded-xl font-medium hover:bg-bliss-700 transition disabled:bg-bliss-300 disabled:cursor-not-allowed"
                      >
                        {isProcessingPayment ? t('wizard.payment.generatingQR') : t('wizard.payment.generateQR')}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <h3 className="text-xl font-bold text-bliss-900 mb-4">{t('wizard.payment.scanQR')}</h3>
                      <div className="bg-bliss-50 p-6 rounded-2xl shadow-lg inline-block mb-4">
                        <img src={promptpayQRCode} alt="PromptPay QR Code" className="w-64 h-64 mx-auto" />
                      </div>
                      <p className="text-lg font-semibold text-bliss-600 mb-2">฿{totalPrice.toLocaleString()}</p>
                      <p className="text-sm text-bliss-700 mb-6">
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
                    className="text-bliss-600 hover:text-bliss-700 text-sm flex items-center gap-1 mb-4"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('wizard.payment.changeChannel')}
                  </button>

                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-bliss-900 mb-2">
                      {selectedPaymentChannel === 'internet_banking' ? t('wizard.payment.internetBanking') : t('wizard.payment.mobileBanking')}
                    </h3>
                    <p className="text-bliss-700">{t('wizard.payment.selectBank')}</p>
                    <p className="text-2xl font-bold text-bliss-600 mt-4">฿{totalPrice.toLocaleString()}</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {/* SCB */}
                    <button
                      onClick={() => handlePayWithBank('scb', selectedPaymentChannel === 'mobile_banking')}
                      disabled={isProcessingPayment}
                      className="p-4 rounded-xl border-2 border-bliss-200 hover:border-purple-500 hover:bg-purple-50 transition disabled:opacity-50"
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 bg-purple-600 rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-bold text-xs">
                          SCB
                        </div>
                        <p className="text-xs font-medium text-bliss-900">{t('wizard.payment.scb')}</p>
                      </div>
                    </button>

                    {/* Kbank */}
                    <button
                      onClick={() => handlePayWithBank('kbank', selectedPaymentChannel === 'mobile_banking')}
                      disabled={isProcessingPayment}
                      className="p-4 rounded-xl border-2 border-bliss-200 hover:border-green-500 hover:bg-green-50 transition disabled:opacity-50"
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 bg-green-600 rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-bold text-xs">
                          K
                        </div>
                        <p className="text-xs font-medium text-bliss-900">{t('wizard.payment.kbank')}</p>
                      </div>
                    </button>

                    {/* BBL */}
                    <button
                      onClick={() => handlePayWithBank('bbl', selectedPaymentChannel === 'mobile_banking')}
                      disabled={isProcessingPayment}
                      className="p-4 rounded-xl border-2 border-bliss-200 hover:border-blue-500 hover:bg-blue-50 transition disabled:opacity-50"
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 bg-blue-600 rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-bold text-xs">
                          BBL
                        </div>
                        <p className="text-xs font-medium text-bliss-900">{t('wizard.payment.bbl')}</p>
                      </div>
                    </button>

                    {/* KTB */}
                    <button
                      onClick={() => handlePayWithBank('ktb', selectedPaymentChannel === 'mobile_banking')}
                      disabled={isProcessingPayment}
                      className="p-4 rounded-xl border-2 border-bliss-200 hover:border-cyan-500 hover:bg-cyan-50 transition disabled:opacity-50"
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 bg-cyan-600 rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-bold text-xs">
                          KTB
                        </div>
                        <p className="text-xs font-medium text-bliss-900">{t('wizard.payment.ktb')}</p>
                      </div>
                    </button>

                    {/* BAY */}
                    <button
                      onClick={() => handlePayWithBank('bay', selectedPaymentChannel === 'mobile_banking')}
                      disabled={isProcessingPayment}
                      className="p-4 rounded-xl border-2 border-bliss-200 hover:border-yellow-500 hover:bg-yellow-50 transition disabled:opacity-50"
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 bg-yellow-500 rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-bold text-xs">
                          BAY
                        </div>
                        <p className="text-xs font-medium text-bliss-900">{t('wizard.payment.bay')}</p>
                      </div>
                    </button>

                    {/* TTB */}
                    <button
                      onClick={() => handlePayWithBank('ttb', selectedPaymentChannel === 'mobile_banking')}
                      disabled={isProcessingPayment}
                      className="p-4 rounded-xl border-2 border-bliss-200 hover:border-orange-500 hover:bg-orange-50 transition disabled:opacity-50"
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 bg-orange-500 rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-bold text-xs">
                          TTB
                        </div>
                        <p className="text-xs font-medium text-bliss-900">{t('wizard.payment.ttb')}</p>
                      </div>
                    </button>
                  </div>

                  {isProcessingPayment && (
                    <div className="text-center py-4">
                      <div className="flex items-center justify-center gap-2 text-bliss-600">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-bliss-600"></div>
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
                    className="text-bliss-600 hover:text-bliss-700 text-sm flex items-center gap-1 mb-4"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('wizard.payment.changeChannel')}
                  </button>

                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-bliss-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="w-8 h-8 text-bliss-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-bliss-900 mb-2">
                      {t('wizard.payment.channelDeveloping')}
                    </h3>
                    <p className="text-bliss-700 mb-6">
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
              className="px-6 py-3 bg-bliss-100 text-bliss-700 rounded-xl font-medium hover:bg-bliss-200 transition flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              {t('wizard.back')}
            </button>

            {currentStep < 5 ? (
              <button
                onClick={handleNext}
                disabled={
                  (currentStep === 2 && (!selectedDate || !selectedTime)) ||
                  (currentStep === 4 && (!address.name || !address.phone || !address.address || !address.province ||
                    (showManualAddressForm && (!address.zipcode || !manualAddressLocation.latitude || !manualAddressLocation.longitude))))
                }
                className="px-6 py-3 bg-bliss-600 text-white rounded-xl font-medium hover:bg-bliss-700 transition disabled:bg-bliss-300 disabled:cursor-not-allowed"
              >
                {t('wizard.next')}
              </button>
            ) : (
              <button
                onClick={handleCompleteBooking}
                className="px-8 py-3 bg-bliss-600 text-white rounded-xl font-medium hover:shadow-lg transition flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {t('wizard.step5.confirmBooking')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Health declaration gate — required before first booking */}
      {showHealthModal && customer && (
        <HealthDeclarationModal
          customerId={customer.id}
          onCompleted={() => {
            setHealthDeclared(true)
            setShowHealthModal(false)
            handleCompleteBooking()
          }}
          onClose={() => setShowHealthModal(false)}
        />
      )}
    </div>
  )
}

export default BookingWizard
