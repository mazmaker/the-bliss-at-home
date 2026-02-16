import { Users, ArrowRight } from 'lucide-react'
import { CoupleFormat } from '../types/booking'

interface CoupleFormatSelectorProps {
  selectedFormat?: CoupleFormat
  onFormatSelect: (format: CoupleFormat) => void
  disabled?: boolean
}

function CoupleFormatSelector({ selectedFormat, onFormatSelect, disabled = false }: CoupleFormatSelectorProps) {
  const formats = [
    {
      value: 'simultaneous' as CoupleFormat,
      title: 'พร้อมกัน',
      subtitle: 'ผู้ให้บริการ 2 คน',
      description: 'บริการ 2 ท่านพร้อมกันในเวลาเดียวกัน ใช้ผู้ให้บริการ 2 คน',
      features: [
        'บริการพร้อมกัน',
        'ผู้ให้บริการ 2 คน'
      ],
      icon: Users,
      color: 'from-green-600 to-green-700'
    },
    {
      value: 'sequential' as CoupleFormat,
      title: 'ทีละท่าน',
      subtitle: 'ผู้ให้บริการ 1 คน',
      description: 'บริการทีละท่านตามลำดับ ใช้ผู้ให้บริการ 1 คน',
      features: [
        'บริการทีละท่าน',
        'ผู้ให้บริการ 1 คน'
      ],
      icon: ArrowRight,
      color: 'from-blue-600 to-blue-700'
    }
  ]

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-stone-900 mb-2">
          รูปแบบการรับบริการ <span className="text-red-500">*</span>
        </h3>
        <p className="text-sm text-stone-600">
          เลือกรูปแบบการให้บริการสำหรับ 2 ท่าน
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {formats.map((format) => {
          const IconComponent = format.icon
          const isSelected = selectedFormat === format.value

          return (
            <button
              key={format.value}
              onClick={() => onFormatSelect(format.value)}
              disabled={disabled}
              className={`
                relative p-6 rounded-2xl border-2 text-left transition-all duration-300 min-h-[240px] flex flex-col shadow-sm
                ${isSelected
                  ? 'border-[#d29b25] bg-gradient-to-br from-[#ffe79d] to-[#ffe79d]/70 shadow-lg transform scale-[1.01]'
                  : 'border-stone-300 bg-white hover:border-[#d29b25] hover:bg-[#ffe79d]/20 hover:shadow-md'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                focus:outline-none focus:ring-2 focus:ring-[#d29b25] focus:ring-offset-2
              `}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4">
                  <div className="w-6 h-6 bg-[#d29b25] rounded-full flex items-center justify-center shadow-md">
                    <div className="w-2.5 h-2.5 bg-white rounded-full" />
                  </div>
                </div>
              )}

              {/* Icon */}
              <div className={`
                inline-flex p-4 rounded-xl mb-4 ${isSelected ? 'bg-[#d29b25]' : 'bg-gradient-to-r from-[#b6d387] to-[#b6d387]/80'}
                shadow-sm
              `}>
                <IconComponent className="w-7 h-7 text-white" />
              </div>

              {/* Content */}
              <div className="space-y-4 flex-1 flex flex-col">
                {/* Title and subtitle */}
                <div>
                  <h4 className="font-semibold text-stone-900 mb-1">
                    {format.title}
                  </h4>
                  <p className="text-sm font-medium text-stone-700">
                    {format.subtitle}
                  </p>
                </div>

                {/* Description */}
                <p className="text-sm text-stone-600 leading-relaxed">
                  {format.description}
                </p>

                {/* Features */}
                <div className="space-y-2">
                  {format.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-stone-400 rounded-full flex-shrink-0" />
                      <span className="text-xs text-stone-600">{feature}</span>
                    </div>
                  ))}
                </div>

              </div>

              {/* Visual feedback for selection */}
              {isSelected && (
                <div className="absolute inset-0 rounded-2xl bg-amber-100/20 pointer-events-none" />
              )}
            </button>
          )
        })}
      </div>

    </div>
  )
}

export default CoupleFormatSelector