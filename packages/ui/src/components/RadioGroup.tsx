import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../utils/cn'

export interface RadioOption {
  value: string
  label: string
  description?: string
}

export interface RadioGroupProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> {
  label?: string
  options: RadioOption[]
  value: string
  name: string
  onChange: (value: string) => void
}

const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, label, options, value, name, onChange, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-3', className)} {...props}>
        {label && (
          <label className="block text-sm font-medium text-stone-700">{label}</label>
        )}
        <div className="space-y-2">
          {options.map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all duration-200',
                value === option.value
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-stone-200 hover:border-amber-300'
              )}
            >
              <div className="relative flex items-start">
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange(e.target.value)}
                  className="sr-only"
                />
                <div
                  className={cn(
                    'w-5 h-5 border-2 rounded-full transition-all duration-200 flex items-center justify-center',
                    value === option.value
                      ? 'border-amber-700'
                      : 'border-stone-300'
                  )}
                >
                  {value === option.value && (
                    <div className="w-2.5 h-2.5 bg-amber-700 rounded-full" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-stone-900">{option.label}</span>
                {option.description && (
                  <p className="text-xs text-stone-500 mt-1">{option.description}</p>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>
    )
  }
)

RadioGroup.displayName = 'RadioGroup'

export default RadioGroup
