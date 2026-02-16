import { useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n, { getStoredLanguage, setStoredLanguage } from './config'

interface I18nProviderProps {
  children: React.ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  useEffect(() => {
    const lang = getStoredLanguage()
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang)
    }
  }, [])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}

export function changeAppLanguage(lang: string) {
  setStoredLanguage(lang)
  i18n.changeLanguage(lang)
}
