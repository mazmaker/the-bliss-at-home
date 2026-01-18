import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ChevronLeft, Clock, Calendar, MapPin, CreditCard, Building2, Banknote, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react'

// Mock service data
const mockServices: Record<string, any> = {
  'thai-massage-2hr': {
    name: 'Thai Massage (2 hours)',
    price: 800,
    duration: 2,
    category: 'massage',
    description: 'นวดไทยแบบดั้งเดิม ช่วยผ่อนคลายกล้ามเนื้อและเสริมสร้างความยืดหยุ่น',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80'
  },
  'oil-massage-2hr': {
    name: 'Oil Massage (2 hours)',
    price: 1000,
    duration: 2,
    category: 'massage',
    description: 'นวดน้ำมันอโรม่า ช่วยผ่อนคลายและบำรุงผิว',
    image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800&q=80'
  },
  'gel-manicure': {
    name: 'Gel Manicure',
    price: 450,
    duration: 1,
    category: 'nail',
    description: 'ทำเล็บเจล สีสดสวยงาม ทนทานนาน',
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80'
  },
  'luxury-spa': {
    name: 'Luxury Spa Package',
    price: 2500,
    duration: 3,
    category: 'spa',
    description: 'แพ็กเกจสปาหรู ครบครันด้วยบริการระดับพรีเมียม',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80'
  },
  'gel-pedicure': {
    name: 'Gel Pedicure',
    price: 550,
    duration: 1.5,
    category: 'nail',
    description: 'ทำเล็บเจลเท้า สวยงามและดูแลเป็นอย่างดี',
    image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059e98b?w=800&q=80'
  },
}

// Mock add-ons data
const mockAddOns = [
  { id: 1, name: 'Aromatherapy Oil', price: 100 },
  { id: 2, name: 'Hot Herbal Compress', price: 150 },
  { id: 3, name: 'Face Massage', price: 200 },
  { id: 4, name: 'Foot Scrub', price: 120 },
]

type Step = 1 | 2 | 3 | 4 | 5

function BookingWizard() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const serviceSlug = searchParams.get('service') || 'thai-massage-2hr'
  const addOnsParam = searchParams.get('addons')?.split(',').map(Number) || []
  const qtyParam = Number(searchParams.get('qty')) || 1

  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [address, setAddress] = useState({
    name: '',
    phone: '',
    address: '',
    district: '',
    subdistrict: '',
    province: '',
    zipcode: '',
  })
  const [notes, setNotes] = useState('')

  const service = mockServices[serviceSlug] || mockServices['thai-massage-2hr']
  const selectedAddOns = mockAddOns.filter(a => addOnsParam.includes(a.id))
  const addOnPrice = selectedAddOns.reduce((sum, a) => sum + a.price, 0)
  const totalPrice = (service.price + addOnPrice) * qtyParam

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
    { num: 3, label: 'Address' },
    { num: 4, label: 'Confirm' },
    { num: 5, label: 'Payment' },
  ]

  const handleNext = () => {
    if (currentStep < 5) {
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

  const handleCompleteBooking = () => {
    // Mock booking completion
    navigate('/bookings?success=true')
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
              <h2 className="text-xl font-bold text-stone-900 mb-6">Address and Contact Information</h2>

              <div className="space-y-4">
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

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Our team will arrive at your location on time
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
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

          {/* Step 5: Payment */}
          {currentStep === 5 && (
            <div>
              <h2 className="text-xl font-bold text-stone-900 mb-6">Payment</h2>

              <div className="mb-6">
                <div className="p-4 bg-stone-50 rounded-xl mb-6">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-stone-900">Net Amount</span>
                    <span className="text-2xl font-bold text-amber-700">฿{totalPrice}</span>
                  </div>
                </div>

                <h3 className="font-medium text-stone-900 mb-3">Select Payment Method</h3>

                <div className="space-y-3">
                  <label className="flex items-center gap-4 p-4 border-2 border-amber-500 bg-stone-50 rounded-xl cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      defaultChecked
                      className="w-5 h-5 text-amber-700"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-stone-900">Credit/Debit Card</div>
                      <div className="text-sm text-stone-500">Visa, Mastercard, JCB</div>
                    </div>
                    <CreditCard className="w-8 h-8 text-amber-700" />
                  </label>

                  <label className="flex items-center gap-4 p-4 border-2 border-stone-200 hover:border-amber-300 rounded-xl cursor-pointer">
                    <input type="radio" name="payment" className="w-5 h-5 text-amber-700" />
                    <div className="flex-1">
                      <div className="font-medium text-stone-900">Bank Transfer</div>
                      <div className="text-sm text-stone-500">KBANK, KTB, SCB</div>
                    </div>
                    <Building2 className="w-8 h-8 text-stone-600" />
                  </label>

                  <label className="flex items-center gap-4 p-4 border-2 border-stone-200 hover:border-amber-300 rounded-xl cursor-pointer">
                    <input type="radio" name="payment" className="w-5 h-5 text-amber-700" />
                    <div className="flex-1">
                      <div className="font-medium text-stone-900">Cash</div>
                      <div className="text-sm text-stone-500">Pay cash to staff after service</div>
                    </div>
                    <Banknote className="w-8 h-8 text-stone-600" />
                  </label>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Booking will be confirmed only after payment is completed
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
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
                (currentStep === 3 && (!address.name || !address.phone || !address.address || !address.province))
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
      </div>
    </div>
  )
}

export default BookingWizard
