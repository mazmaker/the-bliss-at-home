import { useMemo, useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, Calendar, Clock, MapPin, Map, Star, CreditCard, Sparkles, XCircle, Download, FileText, Users, Car } from 'lucide-react'
import { useBookingByNumber } from '@bliss/supabase/hooks/useBookings'
import { useTranslation, getStoredLanguage } from '@bliss/i18n'
import { pickLang } from '../utils/serviceUtils'
import { CancelBookingModal } from '../components/CancelBookingModal'
import { RescheduleModal } from '../components/RescheduleModal'
import { ReviewModal } from '../components/ReviewModal'
import { ExtendServiceButtonLarge } from '../components/ExtendServiceButton'
import { StaffTrackingMap } from '../components'
import BookingStatusCardEnhanced from '../components/BookingStatusCardEnhanced'
import { supabase, isSpecificPreference, getProviderPreferenceLabel, getProviderPreferenceBadgeStyle } from '@bliss/supabase'
import { downloadReceipt, downloadCreditNote, type ReceiptPdfData, type CreditNotePdfData } from '../utils/receiptPdfGenerator'
import { BookingWithExtensions } from '../types/extendService'
import { LINE_CONTACT_URL } from '../config/contact'
import { getServiceImage } from '../utils/imageUtils'
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')

// ใช้ regular supabase client แทน service role เพื่อหลีกเลี่ยง multiple instances

function BookingDetails() {
  const { t, i18n } = useTranslation(['booking', 'common'])
  const dateLocale = i18n.language === 'cn' ? 'zh-CN' : i18n.language === 'en' ? 'en-US' : 'th-TH'
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)

  // Journey tracking state
  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(null)
  const [activeJourneyStatus, setActiveJourneyStatus] = useState<string | null>(null)
  const [isTrackingLoading, setIsTrackingLoading] = useState(false)

  // Extension payment polling (for banking redirect return)
  const [extensionPolling, setExtensionPolling] = useState(false)
  const [extensionSuccess, setExtensionSuccess] = useState(false)
  const extPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch booking data from Supabase with cache busting
  const { data: bookingData, isLoading, error, refetch } = useBookingByNumber(id)

  // Refresh booking data when component mounts
  useEffect(() => {
    refetch()
  }, [id, refetch])

  // Poll extension payment status after banking redirect return
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('type') !== 'extension' || !id) return

    const chargeId = sessionStorage.getItem(`ext_charge_${id}`)
    if (!chargeId) return

    setExtensionPolling(true)
    sessionStorage.removeItem(`ext_charge_${id}`)

    // Remove query params from URL without navigation
    window.history.replaceState({}, '', `/bookings/${id}`)

    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/payments/status/${chargeId}`)
        const data = await res.json()
        if (data.status === 'successful') {
          if (extPollRef.current) clearInterval(extPollRef.current)
          setExtensionPolling(false)
          setExtensionSuccess(true)
          refetch()
        } else if (data.status === 'failed') {
          if (extPollRef.current) clearInterval(extPollRef.current)
          setExtensionPolling(false)
        }
      } catch {
        // transient error — keep polling
      }
    }

    poll()
    extPollRef.current = setInterval(poll, 3000)
    const timeout = setTimeout(() => {
      if (extPollRef.current) clearInterval(extPollRef.current)
      setExtensionPolling(false)
    }, 10 * 60 * 1000)

    return () => {
      if (extPollRef.current) clearInterval(extPollRef.current)
      clearTimeout(timeout)
    }
  }, [id, location.search, refetch])

  // Transform booking data to match UI format
  const booking = useMemo(() => {
    if (!bookingData) return null


    return {
      id: bookingData.booking_number,
      serviceName: pickLang(bookingData.service, 'name', i18n.language) || 'Unknown Service',
      serviceSlug: bookingData.service?.slug || '',
      date: bookingData.booking_date,
      time: bookingData.booking_time || '00:00',
      status: bookingData.status,
      status_v2: bookingData.status, // Use existing status since status_v2 column doesn't exist
      travel_started_at: (bookingData as any).travel_started_at,
      service_started_at: (bookingData as any).service_started_at,
      actual_arrival: (bookingData as any).actual_arrival,
      price: Number(bookingData.final_price || bookingData.base_price || 0),
      duration: (bookingData.duration || 60) / 60,
      addOns: bookingData.addons?.map((a) => ({
        name: a.addon?.name_en || a.addon?.name_th || 'Add-on',
        price: Number(a.total_price),
      })) || [],
      address: {
        name: bookingData.customer?.full_name || '',
        phone: bookingData.customer?.phone || '',
        address: bookingData.address || '',
        district: '',
        subdistrict: '',
        province: '',
        zipcode: '',
      },
      notes: bookingData.customer_notes || '',
      provider: (() => {
        // Check for assigned staff in jobs first
        const assignedJob = bookingData.jobs?.find(job => job.staff_id && job.staff);
        if (assignedJob?.staff) {
          // jobs.staff_id → profiles, so assignedJob.staff IS the provider's profile;
          // rating/reviews live in the nested staff_record (profiles ← staff.profile_id).
          const prov = assignedJob.staff as any;
          return {
            name: prov.full_name || t('booking:provider.unnamedProvider'),
            rating: Number(prov.staff_record?.rating) || 0,
            reviews: prov.staff_record?.total_reviews || 0,
            avatar: prov.avatar_url,
            phone: prov.phone,
            jobStatus: assignedJob.status,
            jobId: assignedJob.id,
          };
        }

        // Fallback to booking-level staff assignment
        if (bookingData.staff?.profile) {
          return {
            name: bookingData.staff.profile.full_name || t('booking:provider.unnamedProvider'),
            rating: Number(bookingData.staff.rating) || 0,
            reviews: bookingData.staff.total_reviews || 0,
            avatar: bookingData.staff.profile.avatar_url,
            phone: bookingData.staff.profile.phone,
            jobStatus: bookingData.status === 'confirmed' ? 'confirmed' : 'pending', // Default job status based on booking status
          };
        }

        // No staff assigned
        return {
          name: t('booking:provider.notAssigned'),
          rating: 0,
          reviews: 0,
          avatar: null,
          phone: null,
        };
      })(),
      payment: {
        method: bookingData.payment_method || 'pending_payment',
        status: bookingData.payment_status || 'pending',
      },
      // R-5 G17: manual-QR marker — single source of truth read across the render tree
      // (receipt-hide / payment relabel / Pay-Now hide / cancel-modal prop). admin_notes is
      // returned by getBookingByNumber's select('*') but is off the typed shape (cast as any).
      isManualQr: ((bookingData as any)?.admin_notes || '').includes('[MANUAL_QR'),
      createdAt: new Date(bookingData.created_at!).toISOString().split('T')[0],
      image: getServiceImage(bookingData.service?.image_url, bookingData.service?.category || 'massage'),
      providerPreference: (bookingData as any).provider_preference || null,
    }
  }, [bookingData, i18n.language])

  // Fetch active journey for this booking
  useEffect(() => {
    const fetchActiveJourney = async () => {
      if (!bookingData?.id) return

      setIsTrackingLoading(true)
      try {

        // Check if there's an active journey for this booking
        console.log('🔍 Customer App: Searching for journey with booking_id:', bookingData.id)
        console.log('🔍 Customer App: BookingData details:', {
          id: bookingData.id,
          booking_number: bookingData.booking_number,
          status: bookingData.status
        })

        // Search through jobs table relationship (this works!)
        const { data: journeys, error } = await supabase
          .from('staff_journeys')
          .select(`
            id, status, staff_id, booking_id,
            jobs!inner(id, booking_id)
          `)
          .eq('jobs.booking_id', bookingData.id)
          .in('status', ['traveling', 'arrived'])
          .order('started_at', { ascending: false })
          .limit(1)

        console.log('🔍 Customer App: Journey search result:', { journeys, error, bookingId: bookingData.id })

        console.log('📊 Journey query result:', { journeys, error, bookingId: bookingData.id })

        if (error) {
          console.log('❌ Journey query error:', error.message)
          setActiveJourneyId(null)
          setActiveJourneyStatus(null)
        } else if (journeys && journeys.length > 0) {
          console.log('✅ Found active journey:', journeys[0])
          setActiveJourneyId(journeys[0].id)
          setActiveJourneyStatus((journeys[0] as any).status ?? null)
        } else {
          console.log('⚠️ No active journeys found for this booking')
          setActiveJourneyId(null)
          setActiveJourneyStatus(null)
        }
      } catch (err) {
        setActiveJourneyId(null)
        setActiveJourneyStatus(null)
      } finally {
        setIsTrackingLoading(false)
      }
    }

    fetchActiveJourney()

    // Set up real-time subscription for journey changes
    if (bookingData?.id) {
      const channel = supabase
        .channel('booking-journey-tracking')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'staff_journeys',
          filter: `booking_id=eq.${bookingData.id}`
        }, () => {
          fetchActiveJourney()
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [bookingData?.id])

  // Transform booking data for extension system
  const extendableBooking = useMemo((): BookingWithExtensions | null => {
    if (!bookingData) return null

    return {
      id: bookingData.id,
      booking_number: bookingData.booking_number,
      customer_id: bookingData.customer_id,
      status: bookingData.status,
      final_price: Number(bookingData.final_price || bookingData.base_price || 0),
      duration: bookingData.duration || 60,
      extension_count: bookingData.extension_count || 0,
      total_extensions_price: Number(bookingData.total_extensions_price || 0),
      last_extended_at: bookingData.last_extended_at,
      payment_method: bookingData.payment_method || 'pending_payment',
      payment_status: bookingData.payment_status || 'pending',
      booking_date: bookingData.booking_date,
      booking_time: bookingData.booking_time,
      service: {
        id: bookingData.service?.id || '',
        name_th: bookingData.service?.name_th || '',
        name_en: bookingData.service?.name_en || '',
        name_cn: bookingData.service?.name_cn || '',
        slug: bookingData.service?.slug || '',
        category: bookingData.service?.category || '',
        image_url: bookingData.service?.image_url
      },
      booking_services: bookingData.booking_services?.map(bs => ({
        id: bs.id,
        service_id: bs.service_id,
        duration: bs.duration,
        price: Number(bs.price),
        is_extension: bs.is_extension || false,
        extended_at: bs.extended_at,
        recipient_index: bs.recipient_index || 0,
        recipient_name: bs.recipient_name || t('booking:recipient.default'),
        created_at: bs.created_at,
        services: {
          name_th: bs.service?.name_th || bookingData.service?.name_th || '',
          name_en: bs.service?.name_en || bookingData.service?.name_en || '',
          name_cn: (bs.service as any)?.name_cn || bookingData.service?.name_cn || ''
        }
      })) || []
    }
  }, [bookingData])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bliss-100 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bliss-600 mx-auto"></div>
            <p className="text-bliss-700 mt-4">{t('common:loading.bookingDetails')}</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-bliss-100 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-bliss-900 mt-4 mb-2">{t('details.errorLoading')}</h2>
            <p className="text-bliss-700 mb-6">{error.message}</p>
            <Link
              to="/bookings"
              className="inline-block bg-bliss-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-bliss-700 transition"
            >
              {t('details.backToHistory')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-bliss-100 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <XCircle className="w-16 h-16 text-bliss-400 mx-auto" />
            <h2 className="text-2xl font-bold text-bliss-900 mt-4 mb-2">{t('details.notFound')}</h2>
            <p className="text-bliss-700 mb-6">{t('details.notFoundMessage')}</p>
            <Link
              to="/bookings"
              className="inline-block bg-bliss-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-bliss-700 transition"
            >
              {t('details.backToHistory')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string, journeyStatus: string | null = null) => {
    // If there's an active journey on a confirmed booking, reflect its live sub-state
    // (arrived → purple; travelling → bliss). bookings.status itself stays 'confirmed'.
    if (journeyStatus && status === 'confirmed') {
      return journeyStatus === 'arrived' ? 'bg-purple-100 text-purple-700' : 'bg-bliss-200 text-bliss-600'
    }

    switch (status) {
      case 'confirmed':
        return 'bg-bliss-200 text-bliss-600'
      case 'traveling':
        return 'bg-bliss-200 text-bliss-600'
      case 'arrived':
        return 'bg-purple-100 text-purple-700'
      case 'in_progress':
        return 'bg-purple-100 text-purple-700'
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'pending':
        return 'bg-yellow-100 text-bliss-600'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusText = (status: string, journeyStatus: string | null = null) => {
    // If there's an active journey on a confirmed booking, show its live sub-state label
    // (มาถึงแล้ว / กำลังเดินทาง). bookings.status itself stays 'confirmed'.
    if (journeyStatus && status === 'confirmed') {
      return journeyStatus === 'arrived' ? t('common:status.arrived') : t('common:status.traveling')
    }

    switch (status) {
      case 'confirmed':
        return t('common:status.confirmed')
      case 'traveling':
        return t('common:status.traveling')
      case 'arrived':
        return t('common:status.arrived')
      case 'in_progress':
        return t('common:status.inProgress')
      case 'completed':
        return t('common:status.completed')
      case 'pending':
        return t('common:status.pending')
      case 'cancelled':
        return t('common:status.cancelled')
      default:
        return status
    }
  }

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'credit_card':
        return t('details.creditCard')
      case 'bank_transfer':
        return t('details.bankTransfer')
      case 'cash':
        return t('details.cash')
      case 'promptpay':
        return t('booking:paymentMethod.promptpay')
      case 'other':
        return t('booking:paymentMethod.pendingPayment')
      case 'pending_payment':
        return t('booking:paymentMethod.pendingPayment')
      default:
        return method
    }
  }

  const getJobStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return t('booking:jobStatus.pending')
      case 'confirmed':
        return t('booking:jobStatus.confirmed')
      case 'traveling':
        return t('booking:jobStatus.traveling')
      case 'arrived':
        return t('booking:jobStatus.arrived')
      case 'in_progress':
        return t('booking:jobStatus.inProgress')
      case 'completed':
        return t('booking:jobStatus.completed')
      case 'cancelled':
        return t('booking:jobStatus.cancelled')
      default:
        return status
    }
  }

  const totalAddOnsPrice = booking.addOns.reduce((sum: number, a: any) => sum + a.price, 0)
  const totalPrice = booking.price + totalAddOnsPrice

  // Handle cancel booking
  const handleCancelBooking = async (reason: string) => {
    if (!bookingData) throw new Error('Booking data not available')

    const response = await fetch(
      `${import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')}/api/bookings/${bookingData.id}/cancel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          reason,
          refund_option: 'auto', // Use auto to let policy decide
          notify_customer: true,
          notify_staff: true,
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || t('booking:cancelBooking.error'))
    }

    // Refetch booking data to update UI
    await refetch()
  }

  // Handle reschedule booking - calls server API which:
  // 1. Updates booking date/time
  // 2. Keeps the same staff if they are free at the new time, else re-opens the job for re-acceptance
  // 3. Sends LINE + In-App notifications (previously assigned staff + admins)
  const handleRescheduleBooking = async (newDate: string, newTime: string) => {
    if (!bookingData) throw new Error('Booking data not available')

    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')

    const response = await fetch(`${apiUrl}/api/bookings/${bookingData.id}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        new_date: newDate,
        new_time: newTime,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || t('booking:reschedule.unableTitle'))
    }

    const result = await response.json()

    // Refetch booking data to update UI
    await refetch()

    // Return the staff-lock outcome so the modal can tell the customer whether the same
    // therapist was kept or they must wait for a therapist to re-accept the new time.
    return result.data as { staff_kept?: boolean; staff_unassigned?: boolean }
  }

  // Handle receipt download
  const handleDownloadReceipt = async () => {
    if (!bookingData) return
    try {
      // Find the payment transaction for this booking (successful or refunded)
      const { data: txn } = await supabase
        .from('transactions')
        .select('id')
        .eq('booking_id', bookingData.id)
        .in('status', ['successful', 'refunded'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!txn) {
        alert(t('booking:receipt.noTransaction'))
        return
      }

      const resp = await fetch(`${API_URL}/api/receipts/${txn.id}`)
      const result = await resp.json()
      if (result.success) {
        const d = result.data
        const lang = getStoredLanguage() as 'th' | 'en' | 'cn'
        const dateLocale = lang === 'th' ? 'th-TH' : lang === 'cn' ? 'zh-CN' : 'en-US'
        downloadReceipt({
          receiptNumber: d.receipt_number,
          transactionDate: new Date(d.transaction_date).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' }),
          bookingNumber: d.booking_number,
          serviceName: d.service_name,
          serviceNameEn: d.service_name_en,
          bookingDate: new Date(d.booking_date).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' }),
          bookingTime: d.booking_time,
          amount: d.amount,
          servicePrice: d.service_price,
          paymentMethod: d.payment_method,
          cardBrand: d.card_brand,
          cardLastDigits: d.card_last_digits,
          customerName: d.customer_name,
          addons: d.addons,
          language: lang,
          company: {
            name: d.company.companyName,
            nameTh: d.company.companyNameTh,
            address: d.company.companyAddress,
            phone: d.company.companyPhone,
            email: d.company.companyEmail,
            taxId: d.company.companyTaxId,
          },
        } as ReceiptPdfData)
      }
    } catch (err) {
      console.error('Failed to download receipt:', err)
    }
  }

  // Handle credit note download
  const handleDownloadCreditNote = async () => {
    if (!bookingData) return
    try {
      // Find the refund transaction for this booking
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: refundTxn } = await (supabase as any)
        .from('refund_transactions')
        .select('id')
        .eq('booking_id', bookingData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!refundTxn) {
        alert(t('booking:creditNote.noRefundData'))
        return
      }

      const resp = await fetch(`${API_URL}/api/receipts/credit-note/${refundTxn.id}`)
      const result = await resp.json()
      if (result.success) {
        const d = result.data
        const lang = getStoredLanguage() as 'th' | 'en' | 'cn'
        const dateLocale = lang === 'th' ? 'th-TH' : lang === 'cn' ? 'zh-CN' : 'en-US'
        downloadCreditNote({
          creditNoteNumber: d.credit_note_number,
          originalReceiptNumber: d.original_receipt_number,
          refundDate: new Date(d.refund_date).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' }),
          bookingNumber: d.booking_number,
          serviceName: d.service_name,
          serviceNameEn: d.service_name_en,
          originalAmount: d.original_amount,
          refundAmount: d.refund_amount,
          refundPercentage: d.refund_percentage || (d.original_amount > 0 ? Math.round((d.refund_amount / d.original_amount) * 100) : 0),
          refundReason: d.reason || d.refund_reason,
          customerName: d.customer_name,
          paymentMethod: d.payment_method,
          cardLastDigits: d.card_last_digits,
          language: lang,
          company: {
            name: d.company.companyName,
            nameTh: d.company.companyNameTh,
            address: d.company.companyAddress,
            phone: d.company.companyPhone,
            email: d.company.companyEmail,
            taxId: d.company.companyTaxId,
          },
        } as CreditNotePdfData)
      }
    } catch (err) {
      console.error('Failed to download credit note:', err)
    }
  }


  return (
    <div className="min-h-screen bg-bliss-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link to="/bookings" className="inline-flex items-center text-bliss-600 hover:text-bliss-800 mb-4">
            <ChevronLeft className="w-5 h-5" />
            {t('details.backToHistory')}
          </Link>
          <h1 className="text-2xl font-bold text-bliss-900">{t('details.title')}</h1>
        </div>

        {/* Extension payment polling banner */}
        {extensionPolling && (
          <div className="p-4 rounded-xl mb-4 bg-bliss-100 border border-bliss-300 text-bliss-700 text-sm flex items-center gap-2">
            <svg className="animate-spin w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            กำลังตรวจสอบการชำระเงิน กรุณารอสักครู่...
          </div>
        )}
        {extensionSuccess && (
          <div className="p-4 rounded-xl mb-4 bg-green-50 border border-green-200 text-green-800 text-sm font-medium">
            ชำระเงินการขยายเวลาสำเร็จ ข้อมูลการจองได้รับการอัปเดตแล้ว
          </div>
        )}

        {/* Status Banner */}
        <div className={`p-6 rounded-2xl mb-6 ${
          booking.status === 'confirmed'
            ? 'bg-bliss-100 border-2 border-bliss-300'
            : booking.status === 'completed'
            ? 'bg-green-50 border-2 border-green-200'
            : 'bg-bliss-100 border-2 border-bliss-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-bliss-700 mb-1">{t('details.bookingNumber')}</p>
              <p className="font-bold text-bliss-900">{booking.id}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(booking.status ?? '', activeJourneyId ? activeJourneyStatus : null)}`}>
              {getStatusText(booking.status ?? '', activeJourneyId ? activeJourneyStatus : null)}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Service Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-bliss-900 mb-4">{t('details.bookedService')}</h2>

              <div className="flex items-start gap-4 p-4 bg-bliss-100 rounded-xl">
                <div className="w-20 h-20 bg-bliss-100 rounded-xl overflow-hidden">
                  <img src={booking.image} alt={booking.serviceName} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-bliss-900 mb-1">{booking.serviceName}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm text-bliss-700 flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {booking.duration} {t('details.hours')}
                    </p>
                    {extendableBooking && extendableBooking.extension_count > 0 && (
                      <span className="bg-bliss-200 text-bliss-600 text-xs px-2 py-1 rounded-full font-medium">
                        {t('booking:extension.times', { count: extendableBooking.extension_count })}
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-bold text-bliss-600">฿{booking.price}</p>
                  {extendableBooking && extendableBooking.total_extensions_price > 0 && (
                    <p className="text-sm text-bliss-600 mt-1">
                      {t('booking:extension.totalExtensionPrice', { amount: extendableBooking.total_extensions_price.toLocaleString() })}
                    </p>
                  )}
                </div>
              </div>

              {booking.addOns.length > 0 && (
                <div className="mt-4 pt-4 border-t border-bliss-100">
                  <h4 className="font-medium text-bliss-900 mb-3">{t('details.addons')}</h4>
                  {booking.addOns.map((addon: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-2">
                      <span className="text-bliss-700">{addon.name}</span>
                      <span className="text-bliss-600 font-medium">+฿{addon.price}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Extension History */}
            {extendableBooking && extendableBooking.booking_services?.some(bs => bs.is_extension) && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-bliss-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-bliss-600" />
                  การเพิ่มเวลาบริการ
                  <span className="ml-auto text-sm font-normal text-bliss-600 bg-bliss-100 px-3 py-1 rounded-full">
                    {extendableBooking.extension_count} ครั้ง
                  </span>
                </h2>

                <div className="space-y-3">
                  {extendableBooking.booking_services
                    .filter(bs => bs.is_extension)
                    .map((ext, index) => (
                      <div key={ext.id} className="flex items-center justify-between p-3 bg-bliss-100 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-bliss-200 rounded-full flex items-center justify-center text-bliss-600 font-bold text-sm shrink-0">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-bliss-900">+{ext.duration} นาที</p>
                            {ext.extended_at && (
                              <p className="text-xs text-bliss-500">
                                {new Date(ext.extended_at).toLocaleDateString(dateLocale, {
                                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="font-bold text-bliss-600">+฿{Number(ext.price).toLocaleString()}</p>
                      </div>
                    ))
                  }
                </div>

                <div className="mt-4 pt-4 border-t border-bliss-100 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-bliss-500">เวลารวมทั้งหมด</p>
                    <p className="font-semibold text-bliss-900">
                      {(() => {
                        // Per-recipient timeline: base (per-recipient) + THIS recipient's extensions.
                        // A couple's recipients run IN PARALLEL, so summing extensions across both
                        // would double the shown time (e.g. 120 base + 60+60 = 240 vs correct 180).
                        const extMin = extendableBooking.booking_services
                          .filter(bs => bs.is_extension && (bs.recipient_index ?? 0) === 0)
                          .reduce((sum, bs) => sum + bs.duration, 0)
                        const total = extendableBooking.duration + extMin
                        const mins = total % 60
                        return `${Math.floor(total / 60)} ชม.${mins > 0 ? ` ${mins} นาที` : ''}`
                      })()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-bliss-500">ค่าเพิ่มเวลารวม</p>
                    <p className="font-bold text-lg text-bliss-600">
                      +฿{extendableBooking.booking_services
                        .filter(bs => bs.is_extension)
                        .reduce((sum, bs) => sum + Number(bs.price), 0)
                        .toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Date & Time */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-bliss-900 mb-4 flex items-center gap-2"><Calendar className="w-5 h-5" /> {t('details.dateTime')}</h2>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-bliss-900 font-semibold">
                    {new Date(booking.date).toLocaleDateString(dateLocale, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-bliss-700 flex items-center gap-1"><Clock className="w-4 h-4" /> {booking.time}</p>
                </div>
                {/* P6: reschedule is admin-only — the customer self-reschedule button was removed here (see Actions block for the contact-admin hint). */}
              </div>
            </div>

            {/* Location */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-bliss-900 mb-4 flex items-center gap-2"><MapPin className="w-5 h-5" /> {t('details.location')}</h2>
              <div className="space-y-2">
                <p className="text-bliss-900 font-medium">{booking.address.name}</p>
                <p className="text-bliss-700">{booking.address.phone}</p>
                <p className="text-bliss-700">{booking.address.address}</p>
                <p className="text-bliss-700">
                  {booking.address.subdistrict} {booking.address.district}
                </p>
                <p className="text-bliss-700">
                  {booking.address.province} {booking.address.zipcode}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-bliss-100">
                <button
                  onClick={() => {
                    const addr = [booking.address.address, booking.address.subdistrict, booking.address.district, booking.address.province, booking.address.zipcode].filter(Boolean).join(' ')
                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`)
                  }}
                  className="text-bliss-600 hover:text-bliss-800 font-medium text-sm flex items-center gap-1"
                >
                  <Map className="w-4 h-4" />
                  {t('details.viewMap')}
                </button>
              </div>
            </div>

            {/* Notes */}
            {booking.notes && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-bliss-900 mb-4">{t('details.notes')}</h2>
                <p className="text-bliss-700 bg-bliss-100 p-4 rounded-xl">{booking.notes}</p>
              </div>
            )}



            {/* Enhanced Booking Status Display */}
            <BookingStatusCardEnhanced
              booking={booking}
              bookingData={bookingData}
              activeJourneyId={activeJourneyId}
              activeJourneyStatus={activeJourneyStatus}
            />

            {/* Staff Assignment Info - Show when staff is assigned */}
            {booking.provider && booking.provider.name !== t('booking:provider.notAssigned') && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-bliss-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" /> {t('booking:provider.assignedStaffInfo')}
                </h2>

                <div className="flex items-start gap-4">
                  {/* Staff Avatar */}
                  <div className="w-16 h-16 bg-bliss-200 rounded-full flex items-center justify-center flex-shrink-0">
                    {booking.provider.avatar ? (
                      <img
                        src={booking.provider.avatar}
                        alt={booking.provider.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-bliss-600 font-medium text-lg">
                        {booking.provider.name?.charAt(0) || t('booking:provider.avatarInitial')}
                      </span>
                    )}
                  </div>

                  {/* Staff Details */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-bliss-900 mb-1">{booking.provider.name}</h3>

                    {/* Job Status Badge */}
                    {booking.provider.jobStatus && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        {getJobStatusText(booking.provider.jobStatus)}
                      </div>
                    )}

                    {/* Rating */}
                    <div className="flex items-center gap-2 text-sm text-bliss-700">
                      <Star className="w-4 h-4 text-bliss-600" />
                      {booking.provider.reviews > 0 ? (
                        <span>{booking.provider.rating.toFixed(1)} ({booking.provider.reviews} {t('booking:provider.reviews')})</span>
                      ) : (
                        <span>{t('booking:provider.noReviews')}</span>
                      )}
                    </div>

                    {/* Phone */}
                    {booking.provider.phone && (
                      <div className="flex items-center gap-2 text-sm text-bliss-700 mt-1">
                        <span>📞 {booking.provider.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Description */}
                {booking.provider.jobStatus && (
                  <div className="mt-4 p-3 bg-bliss-100 border border-bliss-300 rounded-lg">
                    <p className="text-bliss-600 text-sm">
                      {booking.provider.jobStatus === 'pending' && t('booking:jobStatus.description.pending')}
                      {booking.provider.jobStatus === 'confirmed' && t('booking:jobStatus.description.confirmed')}
                      {booking.provider.jobStatus === 'traveling' && t('booking:jobStatus.description.traveling')}
                      {booking.provider.jobStatus === 'arrived' && t('booking:jobStatus.description.arrived')}
                      {booking.provider.jobStatus === 'in_progress' && t('booking:jobStatus.description.inProgress')}
                      {booking.provider.jobStatus === 'completed' && t('booking:jobStatus.description.completed')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Staff Tracking Map - Show when there's an active journey (staff traveling/arrived) */}
            {console.log('Map render check:', {
              activeJourneyId,
              bookingStatus: booking?.status,
              showMap: !!(activeJourneyId && (booking?.status === 'confirmed' || booking?.status === 'in_progress'))
            })}
            {activeJourneyId && (booking?.status === 'confirmed' || booking?.status === 'in_progress') && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-bliss-900 mb-4 flex items-center gap-2">
                  <Car className="w-5 h-5" /> {t('booking:tracking.title')}
                </h2>
                <div className="bg-bliss-100 border border-bliss-300 rounded-lg p-3 mb-4">
                  <p className="text-bliss-600 text-sm">
                    {t('booking:tracking.description')}
                  </p>
                </div>
                <StaffTrackingMap
                  journeyId={activeJourneyId}
                  height="350px"
                />
              </div>
            )}

            {/* Loading state for tracking */}
            {isTrackingLoading && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-bliss-600 mx-auto mb-2"></div>
                    <p className="text-gray-600 text-sm">{t('booking:tracking.loading')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="space-y-6">
            {/* Price Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-bliss-900 mb-4">{t('details.priceSummary')}</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-bliss-700">
                  <span>{t('details.mainService')}</span>
                  <span>฿{booking.price}</span>
                </div>
                {booking.addOns.map((addon: any, index: number) => (
                  <div key={index} className="flex justify-between text-bliss-700">
                    <span>{addon.name}</span>
                    <span>฿{addon.price}</span>
                  </div>
                ))}
                <div className="flex justify-between text-bliss-700">
                  <span>{t('details.serviceFee')}</span>
                  <span>฿0</span>
                </div>
                <div className="pt-3 border-t border-bliss-200">
                  <div className="flex justify-between">
                    <span className="font-bold text-bliss-900">{t('details.total')}</span>
                    <span className="font-bold text-xl text-bliss-600">฿{totalPrice}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-bliss-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" /> {t('details.paymentTitle')}
                </h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-bliss-700">
                  <span>{t('details.paymentMethod')}</span>
                  <span className="text-bliss-900 font-medium">{booking.isManualQr ? t('booking:paymentMethod.manualQrExternal') : getPaymentMethodText(booking.payment.method)}</span>
                </div>
                <div className="flex justify-between text-bliss-700">
                  <span>{t('common:status.label')}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    booking.payment.status === 'paid'
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : booking.payment.status === 'refunded'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : booking.payment.status === 'failed'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-yellow-100 text-bliss-600 border border-yellow-200'
                  }`}>
                    {booking.payment.status === 'paid'
                      ? t('booking:paymentStatus.paid')
                      : booking.payment.status === 'refunded'
                        ? t('booking:paymentStatus.refunded')
                        : booking.payment.status === 'failed'
                          ? t('booking:paymentStatus.failed')
                          : t('booking:paymentStatus.pending')
                    }
                  </span>
                </div>
              </div>

              {/* Pay Now Button for Pending Payments */}
              {/* R-5 G8/G26: hide the Omise Pay-Now CTA for manual-QR — no Omise charge exists */}
              {booking.payment.status === 'pending' && !booking.isManualQr && (
                <div className="mt-4 pt-4 border-t border-bliss-100">
                  <button
                    onClick={() => navigate(`/payment/${booking.id}`)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-bliss-600 text-white rounded-xl font-medium hover:bg-bliss-700 transition"
                  >
                    <CreditCard className="w-5 h-5" />
                    {t('booking:paymentAction.payNow')}
                  </button>
                  <p className="text-center text-xs text-bliss-500 mt-2">
                    {t('booking:paymentAction.note')}
                  </p>
                </div>
              )}

              {/* Receipt & Credit Note Downloads */}
              {/* R-5 D1: manual-QR has no Omise transaction → no receipt/credit-note (server also denies) */}
              {!booking.isManualQr && (booking.payment.status === 'paid' || booking.payment.status === 'refunded') && (
                <div className="mt-4 pt-4 border-t border-bliss-100 space-y-2">
                  <button
                    onClick={handleDownloadReceipt}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-bliss-100 text-bliss-600 rounded-xl font-medium hover:bg-bliss-200 transition text-sm"
                  >
                    <Download className="w-4 h-4" />
                    {t('booking:downloadReceipt.label')}
                  </button>

                  {(bookingData as any)?.refund_status === 'completed' && (
                    <button
                      onClick={handleDownloadCreditNote}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-bliss-100 text-bliss-600 rounded-xl font-medium hover:bg-bliss-200 transition text-sm"
                    >
                      <FileText className="w-4 h-4" />
                      {t('booking:downloadCreditNote.label')}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {(booking.status === 'confirmed' || booking.status === 'pending') && (
                <>
                  {/* P6: reschedule is now admin-only. The self-reschedule button was removed;
                      customers contact the admin (LINE) to reschedule. Cancel is unchanged. */}
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="w-full border-2 border-red-200 text-red-600 py-3 rounded-xl font-medium hover:bg-red-50 transition"
                  >
                    {t('details.cancelBooking')}
                  </button>
                  <button
                    onClick={() => window.open(LINE_CONTACT_URL, '_blank', 'noopener,noreferrer')}
                    className="w-full text-bliss-600 py-2 text-sm font-medium hover:text-bliss-800"
                  >
                    {t('details.rescheduleViaAdmin')}
                  </button>
                </>
              )}

              {/* Extension Feature for In Progress Bookings */}
              {booking.status === 'in_progress' && extendableBooking && (
                <>
                  <ExtendServiceButtonLarge
                    booking={extendableBooking}
                    onExtended={() => {
                      // Refresh booking data after extension
                      refetch()
                    }}
                    fullWidth={true}
                  />
                  <div className="p-4 bg-bliss-100 border border-bliss-300 rounded-xl">
                    <div className="flex items-center gap-2 text-bliss-600">
                      <Sparkles className="w-5 h-5" />
                      <span className="font-medium">{t('booking:extension.inProgressLabel')}</span>
                    </div>
                    <p className="text-sm text-bliss-600 mt-1">
                      {t('booking:extension.note')}
                    </p>
                  </div>
                </>
              )}

              {booking.status === 'completed' && (
                <>
                  <button className="w-full bg-bliss-600 text-white py-3 rounded-xl font-medium hover:bg-bliss-700 transition">
                    {t('details.bookAgain')}
                  </button>
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="w-full border-2 border-bliss-300 text-bliss-600 py-3 rounded-xl font-medium hover:bg-bliss-100 transition"
                  >
                    {t('details.rateReview')}
                  </button>
                </>
              )}

              <button
                onClick={() => navigate(`/services/${booking.serviceSlug}`)}
                className="w-full border-2 border-bliss-200 text-bliss-700 py-3 rounded-xl font-medium hover:bg-bliss-100 transition"
              >
                {t('details.viewService')}
              </button>

              <button
                onClick={() => window.open(LINE_CONTACT_URL, '_blank', 'noopener,noreferrer')}
                className="w-full text-bliss-500 py-2 text-sm hover:text-bliss-700"
              >
                {t('details.contactSupport')}
              </button>
            </div>

            {/* Booking Info */}
            <div className="bg-bliss-100 rounded-xl p-4 text-sm">
              <p className="text-bliss-700">
                {t('details.bookedOn', { date: new Date(booking.createdAt).toLocaleDateString(dateLocale, {
                  dateStyle: 'long',
                }) })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Booking Modal */}
      {bookingData && (
        <CancelBookingModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelBooking}
          bookingId={bookingData.id}
          bookingNumber={bookingData.booking_number}
          serviceName={booking.serviceName}
          bookingDate={booking.date}
          bookingTime={booking.time}
          totalPrice={totalPrice}
          paymentStatus={booking.payment.status as 'pending' | 'paid' | 'refunded'}
          isManualQr={booking.isManualQr}
        />
      )}

      {/* Reschedule Modal */}
      {bookingData && (
        <RescheduleModal
          isOpen={showRescheduleModal}
          onClose={() => setShowRescheduleModal(false)}
          onConfirm={handleRescheduleBooking}
          bookingId={bookingData.id}
          bookingNumber={bookingData.booking_number}
          serviceName={booking.serviceName}
          currentDate={booking.date}
          currentTime={booking.time}
          duration={booking.duration}
        />
      )}

      {/* Review Modal */}
      {bookingData && booking.status === 'completed' && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          bookingId={bookingData.id}
          bookingNumber={bookingData.booking_number}
          serviceName={booking.serviceName}
          staffName={booking.provider.name}
          staffId={bookingData.staff_id || ''}
          serviceId={bookingData.service_id}
          customerId={bookingData.customer_id || ''}
        />
      )}
    </div>
  )
}

export default BookingDetails
