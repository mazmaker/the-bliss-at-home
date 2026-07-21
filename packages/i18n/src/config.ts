import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Import all locale files
import thCommon from './locales/th/common.json'
import thHome from './locales/th/home.json'
import thAuth from './locales/th/auth.json'
import thServices from './locales/th/services.json'
import thBooking from './locales/th/booking.json'
import thProfile from './locales/th/profile.json'
import thEmergency from './locales/th/emergency.json'
import thLegal from './locales/th/legal.json'
import thExtension from './locales/th/extension.json'

import enCommon from './locales/en/common.json'
import enHome from './locales/en/home.json'
import enAuth from './locales/en/auth.json'
import enServices from './locales/en/services.json'
import enBooking from './locales/en/booking.json'
import enProfile from './locales/en/profile.json'
import enEmergency from './locales/en/emergency.json'
import enLegal from './locales/en/legal.json'
import enExtension from './locales/en/extension.json'

import cnCommon from './locales/cn/common.json'
import cnHome from './locales/cn/home.json'
import cnAuth from './locales/cn/auth.json'
import cnServices from './locales/cn/services.json'
import cnBooking from './locales/cn/booking.json'
import cnProfile from './locales/cn/profile.json'
import cnEmergency from './locales/cn/emergency.json'
import cnLegal from './locales/cn/legal.json'
import cnExtension from './locales/cn/extension.json'

import krCommon from './locales/kr/common.json'
import krHome from './locales/kr/home.json'
import krAuth from './locales/kr/auth.json'
import krServices from './locales/kr/services.json'
import krBooking from './locales/kr/booking.json'
import krProfile from './locales/kr/profile.json'
import krEmergency from './locales/kr/emergency.json'
import krLegal from './locales/kr/legal.json'
import krExtension from './locales/kr/extension.json'

import jpCommon from './locales/jp/common.json'
import jpHome from './locales/jp/home.json'
import jpAuth from './locales/jp/auth.json'
import jpServices from './locales/jp/services.json'
import jpBooking from './locales/jp/booking.json'
import jpProfile from './locales/jp/profile.json'
import jpEmergency from './locales/jp/emergency.json'
import jpLegal from './locales/jp/legal.json'
import jpExtension from './locales/jp/extension.json'

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
      emergency: thEmergency,
      legal: thLegal,
      extension: thExtension,
    },
    en: {
      common: enCommon,
      home: enHome,
      auth: enAuth,
      services: enServices,
      booking: enBooking,
      profile: enProfile,
      emergency: enEmergency,
      legal: enLegal,
      extension: enExtension,
    },
    cn: {
      common: cnCommon,
      home: cnHome,
      auth: cnAuth,
      services: cnServices,
      booking: cnBooking,
      profile: cnProfile,
      emergency: cnEmergency,
      legal: cnLegal,
      extension: cnExtension,
    },
    kr: {
      common: krCommon,
      home: krHome,
      auth: krAuth,
      services: krServices,
      booking: krBooking,
      profile: krProfile,
      emergency: krEmergency,
      legal: krLegal,
      extension: krExtension,
    },
    jp: {
      common: jpCommon,
      home: jpHome,
      auth: jpAuth,
      services: jpServices,
      booking: jpBooking,
      profile: jpProfile,
      emergency: jpEmergency,
      legal: jpLegal,
      extension: jpExtension,
    },
  },
  lng: getStoredLanguage(),
  fallbackLng: { kr: ['en', 'th'], jp: ['en', 'th'], default: ['th'] },
  defaultNS: 'common',
  ns: ['common', 'home', 'auth', 'services', 'booking', 'profile', 'emergency', 'legal', 'extension'],
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
