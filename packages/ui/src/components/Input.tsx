import { InputHTMLAttributes, forwardRef, useState } from 'react'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import { cn } from '../utils/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, type, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    const isPassword = type === 'password'
    const [showPassword, setShowPassword] = useState(false)
    // For a password field, swap type to 'text' when the eye toggle is on.
    const effectiveType = isPassword && showPassword ? 'text' : type

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-stone-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={effectiveType}
            className={cn(
              'w-full px-4 py-3 border rounded-xl transition-all duration-200',
              'focus:outline-none focus:ring-2',
              error
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-stone-300 focus:ring-amber-500 focus:border-amber-500',
              'disabled:bg-stone-100 disabled:cursor-not-allowed',
              // room for the show/hide-password eye button
              isPassword && 'pr-12',
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              disabled={props.disabled}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-stone-400 hover:text-stone-600 disabled:cursor-not-allowed"
            >
              {showPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
            </button>
          )}
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

Input.displayName = 'Input'

export default Input
