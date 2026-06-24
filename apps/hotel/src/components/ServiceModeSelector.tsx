import { Users, User } from 'lucide-react'
import { BookingMode } from '../types/booking'

interface ServiceModeSelectorProps {
  selectedMode: BookingMode
  onModeSelect: (mode: BookingMode) => void
  disabled?: boolean
}

function ServiceModeSelector({ selectedMode, onModeSelect, disabled = false }: ServiceModeSelectorProps) {
  const modes = [
    {
      value: 'single' as BookingMode,
      title: 'เดี่ยว',
      subtitle: 'บริการสำหรับ 1 ท่าน',
      description: 'เลือกบริการสำหรับผู้รับบริการ 1 ท่าน',
      icon: User,
      color: 'from-bliss-600 to-bliss-700'
    },
    {
      value: 'couple' as BookingMode,
      title: 'คู่',
      subtitle: 'บริการสำหรับ 2 ท่าน',
      description: 'เลือกบริการสำหรับผู้รับบริการ 2 ท่าน',
      icon: Users,
      color: 'from-bliss-600 to-bliss-700'
    }
  ]

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-bliss-900 mb-2">
          จำนวนผู้รับบริการ <span className="text-red-500">*</span>
        </h3>
        <p className="text-sm text-bliss-600">
          เลือกจำนวนผู้รับบริการที่ต้องการ
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modes.map((mode) => {
          const IconComponent = mode.icon
          const isSelected = selectedMode === mode.value

          return (
            <button
              key={mode.value}
              onClick={() => onModeSelect(mode.value)}
              disabled={disabled}
              className={`
                relative p-6 rounded-2xl border-2 text-left transition-all duration-300 min-h-[180px] flex flex-col shadow-sm
                ${isSelected
                  ? 'border-bliss-600 bg-gradient-to-br from-bliss-100 to-bliss-50 shadow-lg transform scale-[1.02]'
                  : 'border-bliss-300 bg-white hover:border-bliss-500 hover:bg-bliss-50 hover:shadow-md'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                focus:outline-none focus:ring-2 focus:ring-bliss-500 focus:ring-offset-2
              `}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4">
                  <div className="w-6 h-6 bg-bliss-600 rounded-full flex items-center justify-center shadow-md">
                    <div className="w-2.5 h-2.5 bg-white rounded-full" />
                  </div>
                </div>
              )}

              {/* Icon */}
              <div className={`
                inline-flex p-4 rounded-xl mb-4 ${isSelected ? 'bg-bliss-600' : 'bg-gradient-to-r from-bliss-400 to-bliss-500'}
                shadow-sm
              `}>
                <IconComponent className="w-7 h-7 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <h4 className="font-semibold text-bliss-900 mb-1">
                  {mode.title}
                </h4>
                <p className="text-sm font-medium text-bliss-700 mb-2">
                  {mode.subtitle}
                </p>
                <p className="text-xs text-bliss-600 leading-relaxed">
                  {mode.description}
                </p>
              </div>

              {/* Visual feedback for selection */}
              {isSelected && (
                <div className="absolute inset-0 rounded-2xl bg-bliss-100/20 pointer-events-none" />
              )}
            </button>
          )
        })}
      </div>

      {/* Help text */}
      <div className="mt-4 p-3 bg-bliss-50 rounded-xl">
        <p className="text-xs text-bliss-800">
          <span className="font-medium">เคล็ดลับ:</span>
          {selectedMode === 'single'
            ? ' เลือกบริการสำหรับผู้รับบริการ 1 ท่าน และระยะเวลาที่ต้องการ'
            : ' เลือกแบบการรับบริการ และบริการสำหรับผู้รับบริการแต่ละท่าน'
          }
        </p>
      </div>
    </div>
  )
}

export default ServiceModeSelector