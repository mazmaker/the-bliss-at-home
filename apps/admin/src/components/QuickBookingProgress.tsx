import { Check, User, Calendar, CreditCard, CheckCircle } from 'lucide-react'

interface QuickBookingProgressProps {
  currentStep: number
  steps: Array<{
    id: number
    title: string
    subtitle: string
    icon: React.ElementType
    isCompleted: boolean
  }>
}

export function QuickBookingProgress({ currentStep, steps }: QuickBookingProgressProps) {
  return (
    <div className="bg-white border border-bliss-200 rounded-xl p-6 shadow-sm">
      <h3 className="font-semibold text-bliss-900 mb-6 text-center">ขั้นตอนการจองด่วน</h3>

      {/* Progress Bar */}
      <div className="relative mb-8">
        <div className="absolute top-4 left-0 w-full h-0.5 bg-bliss-200"></div>
        <div
          className="absolute top-4 left-0 h-0.5 bg-[#565b34] transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        ></div>

        <div className="relative flex justify-between">
          {steps.map((step) => {
            const Icon = step.icon
            const isActive = step.id === currentStep
            const isCompleted = step.isCompleted
            const isPast = step.id < currentStep

            return (
              <div key={step.id} className="flex flex-col items-center">
                {/* Step Circle */}
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300
                  ${isCompleted || isPast
                    ? 'bg-[#565b34] text-white shadow-lg'
                    : isActive
                    ? 'bg-[#565b34] text-white shadow-lg scale-110'
                    : 'bg-bliss-200 text-bliss-500'
                  }
                `}>
                  {isCompleted || isPast ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                {/* Step Info */}
                <div className="text-center mt-3 max-w-[100px]">
                  <p className={`text-xs font-medium leading-tight ${
                    isActive ? 'text-[#565b34]' : isCompleted || isPast ? 'text-bliss-700' : 'text-bliss-500'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-bliss-500 mt-1 leading-tight">
                    {step.subtitle}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Current Step Highlight */}
      <div className="bg-bliss-50 border border-bliss-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-[#565b34] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">{currentStep}</span>
          </div>
          <div>
            <p className="font-medium text-bliss-900">
              {steps.find(s => s.id === currentStep)?.title}
            </p>
            <p className="text-sm text-bliss-700">
              {steps.find(s => s.id === currentStep)?.subtitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuickBookingProgress