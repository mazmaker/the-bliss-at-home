import { InputHTMLAttributes, forwardRef } from 'react'
import { Check } from 'lucide-react'
import { cn } from '../utils/cn'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, checked, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            className="sr-only"
            checked={checked}
            {...props}
          />
          <div
            onClick={() => {
              if (ref && 'current' in ref && ref.current) {
                ref.current.click()
              }
            }}
            className={cn(
              'w-5 h-5 border-2 rounded transition-all duration-200 cursor-pointer flex items-center justify-center',
              checked
                ? 'bg-amber-700 border-amber-700'
                : 'border-stone-300 hover:border-amber-500'
            )}
          >
            {checked && <Check className="w-3.5 h-3.5 text-white" />}
          </div>
        </div>
        {label && (
          <label htmlFor={checkboxId} className="text-sm text-stone-700 cursor-pointer select-none">
            {label}
          </label>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'

export default Checkbox
