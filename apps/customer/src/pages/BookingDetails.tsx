import { useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Calendar, Clock, MapPin, Map, Star, CreditCard, Sparkles, MessageCircle, XCircle, Download, FileText, Users } from 'lucide-react'
import { useBookingByNumber } from '@bliss/supabase/hooks/useBookings'
import { useTranslation, getStoredLanguage } from '@bliss/i18n'
import { CancelBookingModal } from '../components/CancelBookingModal'
import { RescheduleModal } from '../components/RescheduleModal'
import { ReviewModal } from '../components/ReviewModal'
import { supabase, isSpecificPreference, getProviderPreferenceLabel, getProviderPreferenceBadgeStyle } from '@bliss/supabase'
import { downloadReceipt, downloadCreditNote, type ReceiptPdfData, type CreditNotePdfData } from '../utils/receiptPdfGenerator'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function BookingDetails() {
  const { t } = useTranslation(['booking', 'common'])
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)

  // Fetch booking data from Supabase
  const { data: bookingData, isLoading, error, refetch } = useBookingByNumber(id)

  // Transform booking data to match UI format
  const booking = useMemo(() => {
    if (!bookingData) return null

    return {
      id: bookingData.booking_number,
      serviceName: bookingData.service?.name_en || bookingData.service?.name_th || 'Unknown Service',
      serviceSlug: bookingData.service?.slug || '',
      date: bookingData.booking_date,
      time: bookingData.booking_time || '00:00',
      status: bookingData.status,
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
      provider: bookingData.staff
        ? {
            name: bookingData.staff.name_en || bookingData.staff.name_th || '',
            rating: 4.8, // TODO: Calculate from reviews
            reviews: 0, // TODO: Count from reviews
          }
        : {
            name: 'Staff TBA',
            rating: 0,
            reviews: 0,
          },
      payment: {
        method: bookingData.payment_method || 'cash',
        status: bookingData.payment_status || 'pending',
      },
      createdAt: new Date(bookingData.created_at!).toISOString().split('T')[0],
      image: bookingData.service?.image_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',
      providerPreference: (bookingData as any).provider_preference || null,
    }
  }, [bookingData])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 mx-auto"></div>
            <p className="text-stone-600 mt-4">{t('common:loading.bookingDetails')}</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-stone-900 mt-4 mb-2">{t('details.errorLoading')}</h2>
            <p className="text-stone-600 mb-6">{error.message}</p>
            <Link
              to="/bookings"
              className="inline-block bg-amber-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-amber-800 transition"
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
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <XCircle className="w-16 h-16 text-stone-400 mx-auto" />
            <h2 className="text-2xl font-bold text-stone-900 mt-4 mb-2">{t('details.notFound')}</h2>
            <p className="text-stone-600 mb-6">{t('details.notFoundMessage')}</p>
            <Link
              to="/bookings"
              className="inline-block bg-amber-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-amber-800 transition"
            >
              {t('details.backToHistory')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-700'
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return t('common:status.confirmed')
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
      default:
        return method
    }
  }

  const totalAddOnsPrice = booking.addOns.reduce((sum: number, a: any) => sum + a.price, 0)
  const totalPrice = booking.price + totalAddOnsPrice

  // Handle cancel booking
  const handleCancelBooking = async (reason: string) => {
    if (!bookingData) throw new Error('Booking data not available')

    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bookings/${bookingData.id}/cancel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      throw new Error(errorData.error || 'ไม่สามารถยกเลิกการจองได้')
    }

    // Refetch booking data to update UI
    await refetch()
  }

  // Handle reschedule booking - calls server API which:
  // 1. Updates booking date/time
  // 2. Unassigns staff (they need to re-accept based on availability)
  // 3. Sends LINE + In-App notifications to previously assigned staff
  const handleRescheduleBooking = async (newDate: string, newTime: string) => {
    if (!bookingData) throw new Error('Booking data not available')

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

    const response = await fetch(`${apiUrl}/api/bookings/${bookingData.id}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        new_date: newDate,
        new_time: newTime,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'ไม่สามารถเลื่อนนัดได้')
    }

    const result = await response.json()
    console.log('[Reschedule] Success:', result)

    // Refetch booking data to update UI
    await refetch()
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
        alert('ไม่พบข้อมูลธุรกรรม')
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
        alert('ไม่พบข้อมูลการคืนเงิน')
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
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link to="/bookings" className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-4">
            <ChevronLeft className="w-5 h-5" />
            {t('details.backToHistory')}
          </Link>
          <h1 className="text-2xl font-bold text-stone-900">{t('details.title')}</h1>
        </div>

        {/* Status Banner */}
        <div className={`p-6 rounded-2xl mb-6 ${
          booking.status === 'confirmed'
            ? 'bg-blue-50 border-2 border-blue-200'
            : booking.status === 'completed'
            ? 'bg-green-50 border-2 border-green-200'
            : 'bg-stone-50 border-2 border-stone-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-600 mb-1">{t('details.bookingNumber')}</p>
              <p className="font-bold text-stone-900">{booking.id}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(booking.status ?? '')}`}>
              {getStatusText(booking.status ?? '')}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Service Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-stone-900 mb-4">{t('details.bookedService')}</h2>

              <div className="flex items-start gap-4 p-4 bg-stone-50 rounded-xl">
                <div className="w-20 h-20 bg-gradient-to-br from-stone-100 to-amber-100 rounded-xl overflow-hidden">
                  <img src={booking.image} alt={booking.serviceName} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-stone-900 mb-1">{booking.serviceName}</h3>
                  <p className="text-sm text-stone-600 mb-2 flex items-center gap-1"><Clock className="w-4 h-4" /> {booking.duration} {t('details.hours')}</p>
                  <p className="text-lg font-bold text-amber-700">฿{booking.price}</p>
                </div>
              </div>

              {booking.addOns.length > 0 && (
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <h4 className="font-medium text-stone-900 mb-3">{t('details.addons')}</h4>
                  {booking.addOns.map((addon: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-2">
                      <span className="text-stone-600">{addon.name}</span>
                      <span className="text-amber-700 font-medium">+฿{addon.price}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Date & Time */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2"><Calendar className="w-5 h-5" /> {t('details.dateTime')}</h2>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-stone-900 font-semibold">
                    {new Date(booking.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-stone-600 flex items-center gap-1"><Clock className="w-4 h-4" /> {booking.time}</p>
                </div>
                {(booking.status === 'confirmed' || booking.status === 'pending') && (
                  <div className="text-right">
                    <button
                      onClick={() => setShowRescheduleModal(true)}
                      className="text-amber-700 hover:text-amber-900 font-medium text-sm"
                    >
                      {t('details.reschedule')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2"><MapPin className="w-5 h-5" /> {t('details.location')}</h2>
              <div className="space-y-2">
                <p className="text-stone-900 font-medium">{booking.address.name}</p>
                <p className="text-stone-600">{booking.address.phone}</p>
                <p className="text-stone-600">{booking.address.address}</p>
                <p className="text-stone-600">
                  {booking.address.subdistrict} {booking.address.district}
                </p>
                <p className="text-stone-600">
                  {booking.address.province} {booking.address.zipcode}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-stone-100">
                <button className="text-amber-700 hover:text-amber-900 font-medium text-sm flex items-center gap-1">
                  <Map className="w-4 h-4" />
                  {t('details.viewMap')}
                </button>
              </div>
            </div>

            {/* Notes */}
            {booking.notes && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-stone-900 mb-4">{t('details.notes')}</h2>
                <p className="text-stone-600 bg-stone-50 p-4 rounded-xl">{booking.notes}</p>
              </div>
            )}

            {/* Provider Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-stone-900 mb-4">{t('details.provider')}</h2>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-stone-100 to-amber-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-amber-700" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-stone-900">{booking.provider.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-stone-600">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span>{booking.provider.rating}</span>
                    <span>•</span>
                    <span>{booking.provider.reviews} {t('details.reviews')}</span>
                  </div>
                  {isSpecificPreference(booking.providerPreference) && (
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${getProviderPreferenceBadgeStyle(booking.providerPreference)}`}>
                        <Users className="w-3 h-3" />
                        {getProviderPreferenceLabel(booking.providerPreference)}
                      </span>
                    </div>
                  )}
                </div>
                {(booking.status === 'confirmed' || booking.status === 'pending') && (
                  <button className="text-amber-700 hover:text-amber-900 font-medium text-sm flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    {t('details.chat')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="space-y-6">
            {/* Price Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-stone-900 mb-4">{t('details.priceSummary')}</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-stone-600">
                  <span>{t('details.mainService')}</span>
                  <span>฿{booking.price}</span>
                </div>
                {booking.addOns.map((addon: any, index: number) => (
                  <div key={index} className="flex justify-between text-stone-600">
                    <span>{addon.name}</span>
                    <span>฿{addon.price}</span>
                  </div>
                ))}
                <div className="flex justify-between text-stone-600">
                  <span>{t('details.serviceFee')}</span>
                  <span>฿0</span>
                </div>
                <div className="pt-3 border-t border-stone-200">
                  <div className="flex justify-between">
                    <span className="font-bold text-stone-900">{t('details.total')}</span>
                    <span className="font-bold text-xl text-amber-700">฿{totalPrice}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5" /> {t('details.paymentTitle')}</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-stone-600">
                  <span>{t('details.paymentMethod')}</span>
                  <span className="text-stone-900 font-medium">{getPaymentMethodText(booking.payment.method)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>{t('common:status.label')}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    booking.payment.status === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : booking.payment.status === 'refunded'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {booking.payment.status === 'paid' ? t('common:status.paid') : booking.payment.status === 'refunded' ? 'คืนเงินแล้ว' : t('common:status.pending')}
                  </span>
                </div>
              </div>

              {/* Receipt & Credit Note Downloads */}
              {(booking.payment.status === 'paid' || booking.payment.status === 'refunded') && (
                <div className="mt-4 pt-4 border-t border-stone-100 space-y-2">
                  <button
                    onClick={handleDownloadReceipt}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl font-medium hover:bg-amber-100 transition text-sm"
                  >
                    <Download className="w-4 h-4" />
                    ดาวน์โหลดใบเสร็จ
                  </button>

                  {(bookingData as any)?.refund_status === 'completed' && (
                    <button
                      onClick={handleDownloadCreditNote}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700 rounded-xl font-medium hover:bg-purple-100 transition text-sm"
                    >
                      <FileText className="w-4 h-4" />
                      ดาวน์โหลดใบลดหนี้
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {(booking.status === 'confirmed' || booking.status === 'pending') && (
                <>
                  <button
                    onClick={() => setShowRescheduleModal(true)}
                    className="w-full bg-amber-700 text-white py-3 rounded-xl font-medium hover:bg-amber-800 transition"
                  >
                    {t('details.reschedule')}
                  </button>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="w-full border-2 border-red-200 text-red-600 py-3 rounded-xl font-medium hover:bg-red-50 transition"
                  >
                    {t('details.cancelBooking')}
                  </button>
                </>
              )}

              {booking.status === 'completed' && (
                <>
                  <button className="w-full bg-amber-700 text-white py-3 rounded-xl font-medium hover:bg-amber-800 transition">
                    {t('details.bookAgain')}
                  </button>
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="w-full border-2 border-amber-200 text-amber-700 py-3 rounded-xl font-medium hover:bg-amber-50 transition"
                  >
                    {t('details.rateReview')}
                  </button>
                </>
              )}

              <button
                onClick={() => navigate(`/services/${booking.serviceSlug}`)}
                className="w-full border-2 border-stone-200 text-stone-700 py-3 rounded-xl font-medium hover:bg-stone-50 transition"
              >
                {t('details.viewService')}
              </button>

              <button className="w-full text-stone-500 py-2 text-sm hover:text-stone-700">
                {t('details.contactSupport')}
              </button>
            </div>

            {/* Booking Info */}
            <div className="bg-stone-50 rounded-xl p-4 text-sm">
              <p className="text-stone-600">
                {t('details.bookedOn', { date: new Date(booking.createdAt).toLocaleDateString('en-US', {
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
