import { useState, useCallback } from 'react'
import { ArrowLeft, ArrowRight, Check, AlertCircle, User, Calendar, Users, CreditCard, CheckCircle } from 'lucide-react'
import CustomerSearch from './CustomerSearch'
import ServiceSelection from './ServiceSelection'
import PaymentRecording from './PaymentRecording'
import BookingConfirmation from './BookingConfirmation'

// Types from actual database structure
interface Customer {
  id: string
  profile_id?: string
  full_name: string
  phone: string
  email?: string
  birth_date?: string
  gender?: string
  avatar_url?: string
  total_bookings: number
  total_spent: number
  loyalty_points: number
  created_at: string
  updated_at: string
  status: string
  created_by_admin?: boolean
}

interface Service {
  id: string
  name_th: string
  name_en: string
  description_th?: string
  description_en?: string
  category: string
  base_price: number
  duration: number
  duration_options?: number[]
  price_60?: number
  price_90?: number
  price_120?: number
  hotel_price?: number
  image_url?: string
  is_active: boolean
  sort_order: number
  staff_commission_rate?: number
  use_fixed_rate?: boolean
  staff_earning_60?: number
  staff_earning_90?: number
  staff_earning_120?: number
}

interface BookingData {
  customer?: Customer
  service?: Service
  // The admin-picked duration. `service` is the raw Service row whose `.duration` is only the
  // DB default, so the chosen 60/90/120 must be threaded separately (P15). Primary source for
  // the single-booking duration/earnings/display in BookingConfirmation.
  selectedDuration?: number
  addOns?: Service[]
  bookingDate?: string
  bookingTime?: string
  isHotelBooking?: boolean
  hotelId?: string
  hotelRoomNumber?: string
  address?: string
  latitude?: number
  longitude?: number
  discountCode?: string
  appliedDiscount?: any
  basePricing?: {
    base_price: number
    discount_amount: number
    final_price: number
  }
  paymentMethod?: string
  paymentNotes?: string
  adminNotes?: string
  overrideRestrictions?: boolean
  providerPreference?: string
  addressDetails?: any
  // Couple / simultaneous booking (P8). recipient_count>1 => server createJobsFromBooking
  // fans out 1 job per recipient from the booking_services rows written on confirm.
  serviceFormat?: 'single' | 'simultaneous'
  recipientCount?: number
  recipients?: Array<{
    service_id: string
    service?: Service
    duration: number
    price: number
    recipient_index: number
    recipient_name?: string | null
    sort_order: number
  }>
}

const steps = [
  { id: 1, name: 'ค้นหาลูกค้า', icon: User, description: 'ค้นหาหรือสร้างข้อมูลลูกค้า' },
  { id: 2, name: 'เลือกบริการ', icon: Calendar, description: 'เลือกบริการและกำหนดเวลา' },
  { id: 3, name: 'บันทึกการชำระเงิน', icon: CreditCard, description: 'บันทึกช่องทางการชำระเงิน' },
  { id: 4, name: 'ยืนยันการจอง', icon: CheckCircle, description: 'ตรวจสอบและสร้างการจอง' }
]

export default function QuickBooking() {
  const [currentStep, setCurrentStep] = useState(1)
  const [bookingData, setBookingData] = useState<BookingData>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update booking data
  const updateBookingData = useCallback((updates: Partial<BookingData>) => {
    setBookingData(prev => {
      const newData = { ...prev, ...updates }

      // Auto-navigate to next step when current step becomes complete
      setTimeout(() => {
        const updatedCanProceed = isStepCompleteForData(currentStep, newData)
        if (updatedCanProceed && currentStep < steps.length) {
          setCurrentStep(currentStep + 1)
        }
      }, 50)

      return newData
    })
    setError(null)
  }, [currentStep])

  // Helper function to check step completion with specific data
  const isStepCompleteForData = (stepNumber: number, data: BookingData): boolean => {
    switch (stepNumber) {
      case 1:
        return !!data.customer
      case 2:
        return !!data.service && !!data.basePricing
      case 3:
        return !!data.paymentMethod
      case 4:
        return true
      default:
        return false
    }
  }

  // Navigation handlers
  const goToNextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (stepNumber: number) => {
    setCurrentStep(stepNumber)
  }

  // Step validation
  const isStepComplete = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        return !!bookingData.customer
      case 2:
        return !!bookingData.service && !!bookingData.basePricing
      case 3:
        return !!bookingData.paymentMethod
      case 4:
        return true
      default:
        return false
    }
  }

  const canProceed = isStepComplete(currentStep)

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <CustomerSearch
            selectedCustomer={bookingData.customer}
            onCustomerSelect={(customer) => updateBookingData({ customer })}
            onNext={undefined}
          />
        )
      case 2:
        return (
          <ServiceSelection
            customer={bookingData.customer!}
            selectedService={bookingData.service}
            selectedAddOns={bookingData.addOns}
            basePricing={bookingData.basePricing}
            onServiceSelect={(service, addOns, pricing, details) =>
              updateBookingData({
                service,
                selectedDuration: details.selectedDuration,
                addOns,
                basePricing: pricing,
                bookingDate: details.bookingDate,
                bookingTime: details.bookingTime,
                isHotelBooking: details.isHotelBooking,
                hotelId: details.hotelId,
                hotelRoomNumber: details.hotelRoomNumber,
                addressDetails: details.addressDetails,
                discountCode: details.discountCode,
                appliedDiscount: details.appliedDiscount,
                providerPreference: details.providerPreference,
                serviceFormat: details.serviceFormat,
                recipientCount: details.recipientCount,
                recipients: details.recipients
              })
            }
            onNext={undefined}
            onBack={goToPreviousStep}
          />
        )
      case 3:
        return (
          <PaymentRecording
            totalAmount={bookingData.basePricing!.final_price}
            paymentMethod={bookingData.paymentMethod}
            paymentNotes={bookingData.paymentNotes}
            adminNotes={bookingData.adminNotes}
            customerId={bookingData.customer?.id}
            onPaymentRecord={(method, notes, adminNotes) =>
              updateBookingData({
                paymentMethod: method,
                paymentNotes: notes,
                adminNotes: adminNotes
              })
            }
            onNext={undefined}
            onBack={goToPreviousStep}
          />
        )
      case 4:
        return (
          <BookingConfirmation
            bookingData={bookingData}
            onConfirm={() => {
              // Booking creation will be handled in BookingConfirmation component
            }}
            onBack={goToPreviousStep}
            isLoading={isLoading}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-bliss-900">จองแบบเร่งด่วน</h1>
          <p className="text-bliss-500">Quick Booking - สำหรับลูกค้าโทรเข้าหรือเดินเข้า</p>
        </div>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-bliss-100 text-bliss-700 rounded-xl font-medium hover:bg-bliss-200 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          กลับ
        </button>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-bliss-100">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              {/* Step Circle */}
              <div
                className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 cursor-pointer transition-all
                  ${currentStep === step.id
                    ? 'bg-[#565b34] border-[#565b34] text-white'
                    : isStepComplete(step.id)
                    ? 'bg-[#c8c29c] border-[#c8c29c] text-white'
                    : 'bg-white border-bliss-300 text-bliss-500'
                  }
                `}
                onClick={() => goToStep(step.id)}
              >
                {isStepComplete(step.id) && currentStep !== step.id ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </div>

              {/* Step Label */}
              <div className="ml-3 hidden md:block">
                <p className={`text-sm font-medium ${
                  currentStep === step.id ? 'text-[#565b34]' :
                  isStepComplete(step.id) ? 'text-[#c8c29c]' : 'text-bliss-500'
                }`}>
                  {step.name}
                </p>
                <p className="text-xs text-bliss-400">{step.description}</p>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-4 ${
                  isStepComplete(step.id) ? 'bg-[#c8c29c]' : 'bg-bliss-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-2xl shadow-lg border border-bliss-100">
        <div className="p-6">
          {renderStepContent()}
        </div>
      </div>

    </div>
  )
}