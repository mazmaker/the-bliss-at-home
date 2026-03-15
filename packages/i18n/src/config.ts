import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Import all locale files
import thCommon from './locales/th/common.json'
import thHome from './locales/th/home.json'
import thAuth from './locales/th/auth.json'
import thServices from './locales/th/services.json'
import thBooking from './locales/th/booking.json'
import thProfile from './locales/th/profile.json'

import enCommon from './locales/en/common.json'
import enHome from './locales/en/home.json'
import enAuth from './locales/en/auth.json'
import enServices from './locales/en/services.json'
import enBooking from './locales/en/booking.json'
import enProfile from './locales/en/profile.json'

import cnCommon from './locales/cn/common.json'
import cnHome from './locales/cn/home.json'
import cnAuth from './locales/cn/auth.json'
import cnServices from './locales/cn/services.json'
import cnBooking from './locales/cn/booking.json'
import cnProfile from './locales/cn/profile.json'

const STORAGE_KEY = 'bliss-language'

export function getStoredLanguage(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'th'
  } catch {
    return 'th'
  }
}

export function setStoredLanguage(lang: string) {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // localStorage not available
  }
}

i18n.use(initReactI18next).init({
  resources: {
    th: {
      common: thCommon,
      home: thHome,
      auth: thAuth,
      services: thServices,
      booking: thBooking,
      profile: thProfile,
    },
    en: {
      common: enCommon,
      home: enHome,
      auth: enAuth,
      services: enServices,
      booking: enBooking,
      profile: enProfile,
    },
    cn: {
      common: cnCommon,
      home: cnHome,
      auth: cnAuth,
      services: cnServices,
      booking: cnBooking,
      profile: cnProfile,
    },
  },
  lng: getStoredLanguage(),
  fallbackLng: 'th',
  defaultNS: 'common',
  ns: ['common', 'home', 'auth', 'services', 'booking', 'profile'],
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
