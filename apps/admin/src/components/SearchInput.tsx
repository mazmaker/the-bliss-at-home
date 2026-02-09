import React, { useState, useEffect, useRef, memo } from 'react'
import { Search } from 'lucide-react'

interface SearchInputProps {
  onDebouncedChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
}

const SearchInput = memo(function SearchInput({
  onDebouncedChange,
  placeholder = "ค้นหา...",
  debounceMs = 500
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const wasFocusedRef = useRef(false)

  // Debounce the onChange callback
  useEffect(() => {
    const timer = setTimeout(() => {
      onDebouncedChange(localValue)
    }, debounceMs)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localValue, debounceMs])

  // Restore focus after re-renders if input was previously focused
  useEffect(() => {
    if (wasFocusedRef.current && document.activeElement !== inputRef.current) {
      inputRef.current?.focus()
    }
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
  }

  const handleFocus = () => {
    wasFocusedRef.current = true
  }

  const handleBlur = () => {
    wasFocusedRef.current = false
  }

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="w-full pl-10 pr-4 py-2 bg-stone-100 border-0 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
      />
    </div>
  )
})

export default SearchInput
