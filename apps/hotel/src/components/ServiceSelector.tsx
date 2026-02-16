import { useState, useEffect } from 'react'
import { Clock, Check, ChevronRight, User } from 'lucide-react'
import { Service, ServiceSelection, DurationOption } from '../types/booking'
import { PriceCalculator } from '../utils/priceCalculator'
import { EnhancedPriceCalculator } from '../utils/enhancedPriceCalculator'

interface ServiceSelectorProps {
  services: Service[]
  recipientIndex: number
  recipientName?: string
  selectedService?: ServiceSelection
  onServiceSelect: (selection: ServiceSelection) => void
  onClearSelection?: () => void
  disabled?: boolean
  showPrice?: boolean
}

function ServiceSelector({
  services,
  recipientIndex,
  recipientName,
  selectedService,
  onServiceSelect,
  onClearSelection,
  disabled = false,
  showPrice = true
}: ServiceSelectorProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    selectedService?.service.id || null
  )
  const [selectedDuration, setSelectedDuration] = useState<number | null>(
    selectedService?.duration || null
  )
  const [step, setStep] = useState<'service' | 'duration'>('service')

  // Reset when recipient changes
  useEffect(() => {
    if (selectedService) {
      setSelectedServiceId(selectedService.service.id)
      setSelectedDuration(selectedService.duration)
      setStep('duration')
    } else {
      setSelectedServiceId(null)
      setSelectedDuration(null)
      setStep('service')
    }
  }, [selectedService, recipientIndex])

  // Get duration options for selected service
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

  const handleServiceClick = (service: Service) => {
    if (disabled) return

    setSelectedServiceId(service.id)
    const durationOptions = getDurationOptions(service)

    // Don't auto-select, always go to duration step
    setSelectedDuration(null)
    setStep('duration')
  }

  const handleDurationSelect = (duration: number) => {
    if (disabled || !selectedServiceId) return

    const service = services.find(s => s.id === selectedServiceId)
    if (!service) return

    setSelectedDuration(duration)

    // Calculate the correct price for the selected duration with hotel discount

    const calculatedPrice = service.discount_rate && service.discount_rate > 0
      ? EnhancedPriceCalculator.calculateServicePriceWithDiscount(service, duration, service.discount_rate, 'single')
      : PriceCalculator.calculateServicePrice(service, duration, 'single')

    onServiceSelect({
      id: `${recipientIndex}-${service.id}-${duration}`,
      service,
      duration,
      recipientIndex,
      recipientName,
      price: calculatedPrice,
      sortOrder: recipientIndex
    })
  }

  const handleBackToServices = () => {
    setStep('service')
    setSelectedDuration(null)
  }

  const handleClearSelection = () => {
    setSelectedServiceId(null)
    setSelectedDuration(null)
    setStep('service')
    onClearSelection?.()
  }

  const selectedServiceData = selectedServiceId ? services.find(s => s.id === selectedServiceId) : null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-amber-600 to-amber-700 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="font-medium text-stone-900">
              {recipientName || `ผู้รับบริการ ${recipientIndex + 1}`}
            </h4>
            <p className="text-xs text-stone-600">
              {step === 'service' ? 'เลือกบริการ' : 'เลือกระยะเวลา'}
            </p>
          </div>
        </div>

        {selectedService && (
          <button
            onClick={handleClearSelection}
            disabled={disabled}
            className="text-xs text-stone-500 hover:text-red-600 transition"
          >
            เคลียร์การเลือก
          </button>
        )}
      </div>

      {/* Step 1: Service Selection */}
      {step === 'service' && (
        <div className="space-y-3">
          <div
            className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto scroll-smooth"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#d6d3d1 #f5f5f4'
            }}
          >
            {services.filter(service => service.is_active).map((service) => {
              const isSelected = selectedServiceId === service.id

              return (
                <button
                  key={service.id}
                  onClick={() => handleServiceClick(service)}
                  disabled={disabled}
                  className={`
                    p-4 rounded-xl border-2 text-left transition-all duration-300 shadow-sm
                    ${isSelected
                      ? 'border-[#d29b25] bg-gradient-to-r from-[#ffe79d] to-[#ffe79d]/70 shadow-md transform scale-[1.01]'
                      : 'border-stone-300 bg-white hover:border-[#d29b25]/50 hover:bg-[#ffe79d]/20 hover:shadow-md'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    focus:outline-none focus:ring-2 focus:ring-[#d29b25] focus:ring-offset-1
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

                      {showPrice && (
                        <div className={`text-sm font-bold ${isSelected ? 'text-[#d29b25]' : 'text-[#b6d387]'}`}>
                          ฿{service.hotel_price.toLocaleString()}
                        </div>
                      )}
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
        </div>
      )}

      {/* Step 2: Duration Selection */}
      {step === 'duration' && selectedServiceData && (
        <div className="space-y-4">
          {/* Back button */}
          <button
            onClick={handleBackToServices}
            disabled={disabled}
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
                // Calculate the correct price for this duration option with hotel discount
                const calculatedPrice = selectedServiceData.discount_rate && selectedServiceData.discount_rate > 0
                  ? EnhancedPriceCalculator.calculateServicePriceWithDiscount(selectedServiceData, option.value, selectedServiceData.discount_rate, 'single')
                  : PriceCalculator.calculateServicePrice(selectedServiceData, option.value, 'single')

                return (
                  <button
                    key={option.value}
                    onClick={() => handleDurationSelect(option.value)}
                    disabled={disabled || !option.isAvailable}
                    className={`
                      p-3 rounded-lg border-2 text-center transition-all duration-300 shadow-sm
                      ${isSelected
                        ? 'border-[#d29b25] bg-[#d29b25] text-white shadow-md transform scale-[1.05]'
                        : 'border-stone-300 bg-white text-stone-700 hover:border-[#d29b25]/50 hover:bg-[#ffe79d]/20 hover:shadow-md'
                      }
                      ${(!option.isAvailable || disabled) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      focus:outline-none focus:ring-2 focus:ring-[#d29b25] focus:ring-offset-1
                    `}
                  >
                    <div className="text-sm font-medium">
                      {option.label}
                    </div>
                    {showPrice && (
                      <div className={`text-xs mt-1 font-semibold ${isSelected ? 'text-amber-100' : 'text-[#d29b25]'}`}>
                        ฿{calculatedPrice.toLocaleString()}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Selection Summary */}
      {selectedService && (
        <div className="p-4 bg-gradient-to-r from-[#b6d387]/20 to-[#b6d387]/10 border-2 border-[#b6d387]/30 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 bg-[#b6d387] rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold text-[#b6d387]">เลือกแล้ว</span>
          </div>
          <div className="text-sm font-medium text-stone-800">
            {selectedService.service.name_th} • {selectedService.duration} นาที
            {showPrice && (
              <span className="text-[#d29b25] font-bold"> • ฿{selectedService.price.toLocaleString()}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ServiceSelector