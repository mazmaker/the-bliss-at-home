import { InputHTMLAttributes, forwardRef } from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '../utils/cn'

export interface DatePickerProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const dateId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={dateId} className="block text-sm font-medium text-stone-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={dateId}
            type="date"
            className={cn(
              'w-full px-4 py-3 pr-12 border rounded-xl transition-all duration-200',
              'focus:outline-none focus:ring-2',
              error
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-stone-300 focus:ring-amber-500 focus:border-amber-500',
              'disabled:bg-stone-100 disabled:cursor-not-allowed',
              className
            )}
            {...props}
          />
          <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 pointer-events-none" />
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-stone-500">{helperText}</p>
        )}
      </div>
    )
  }
)

DatePicker.displayName = 'DatePicker'

export default DatePicker
