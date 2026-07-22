import { useState, useEffect, useRef } from 'react'
import { Globe, ChevronDown, Check } from 'lucide-react'
import { changeAppLanguage, getStoredLanguage } from '@bliss/i18n'
import { supabase } from '@bliss/supabase/auth'

const LANGUAGES = [
  { code: 'th', label: 'ไทย', short: 'TH' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'cn', label: '中文', short: '中文' },
  { code: 'kr', label: '한국어', short: 'KR' },
  { code: 'jp', label: '日本語', short: 'JP' },
] as const

interface LanguageSwitcherProps {
  /** Full-width inline list for the mobile menu instead of a dropdown */
  variant?: 'dropdown' | 'inline'
}

function LanguageSwitcher({ variant = 'dropdown' }: LanguageSwitcherProps) {
  const [current, setCurrent] = useState<string>(getStoredLanguage())
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const selectLanguage = async (code: string) => {
    // Apply locally first so the UI never blocks on the DB write.
    changeAppLanguage(code)
    setCurrent(code)
    setOpen(false)
    // Best-effort: persist the choice to the customer's account so server-sent
    // emails (receipts / credit notes) render in the chosen language. On the
    // logged-out auth pages getUser() returns null -> localStorage only, as before.
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({ language: code }).eq('id', user.id)
      }
    } catch {
      /* ignore — language is still applied locally via changeAppLanguage */
    }
  }

  const activeLang = LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0]

  // Inline variant — used inside the mobile menu
  if (variant === 'inline') {
    return (
      <div className="px-3">
        <div className="flex items-center gap-2 px-1 py-2 text-xs text-bliss-500 font-medium">
          <Globe className="w-4 h-4" />
          <span>ภาษา / Language</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { void selectLanguage(lang.code) }}
              className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-medium text-sm transition ${
                current === lang.code
                  ? 'bg-bliss-600 text-white shadow-md'
                  : 'bg-bliss-100 text-bliss-700 hover:bg-bliss-200'
              }`}
            >
              <span>{lang.label}</span>
              {current === lang.code && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Dropdown variant — used in the desktop header
  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-bliss-700 hover:text-bliss-600 font-medium text-sm transition px-3 py-2 rounded-lg hover:bg-bliss-100"
        aria-label="Change language"
      >
        <Globe className="w-4 h-4" />
        <span>{activeLang.label}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-bliss-50 rounded-lg shadow-lg border border-bliss-200 py-1 z-50">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { void selectLanguage(lang.code) }}
              className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-sm transition ${
                current === lang.code
                  ? 'text-bliss-600 font-medium bg-bliss-100'
                  : 'text-bliss-700 hover:bg-bliss-100'
              }`}
            >
              <span>{lang.label}</span>
              {current === lang.code && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LanguageSwitcher
