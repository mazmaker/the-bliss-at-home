import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import {
  BookingConfiguration,
  ServiceSelection,
  BookingMode,
  CoupleFormat,
  ServiceFormat,
  BookingData,
  BookingValidation,
  ProviderPreference
} from '../types/booking'
import { PriceCalculator } from '../utils/priceCalculator'
import { EnhancedPriceCalculator } from '../utils/enhancedPriceCalculator'

interface BookingStore {
  // Configuration state
  serviceConfiguration: BookingConfiguration
  currentStep: number

  // Booking data
  guestName: string
  roomNumber: string
  phoneNumber: string
  date: string
  time: string
  notes: string
  providerPreference: ProviderPreference

  // UI state
  isLoading: boolean
  error: string | null
  validation: BookingValidation

  // Configuration actions
  setServiceMode: (mode: BookingMode) => void
  setCoupleFormat: (format: CoupleFormat) => void
  addServiceSelection: (selection: ServiceSelection) => void
  updateServiceSelection: (index: number, updates: Partial<ServiceSelection>) => void
  removeServiceSelection: (index: number) => void
  clearServiceSelections: () => void
  setRecipientName: (recipientIndex: number, name: string) => void

  // Guest data actions
  setGuestName: (name: string) => void
  setRoomNumber: (room: string) => void
  setPhoneNumber: (phone: string) => void
  setDate: (date: string) => void
  setTime: (time: string) => void
  setNotes: (notes: string) => void
  setProviderPreference: (preference: ProviderPreference) => void

  // Step management
  setCurrentStep: (step: number) => void
  nextStep: () => void
  previousStep: () => void

  // Calculation actions
  calculateTotals: () => void
  validateConfiguration: () => BookingValidation
  validateGuestInfo: () => string[]
  validateDateTime: () => string[]

  // Utility actions
  resetConfiguration: () => void
  resetBookingData: () => void
  resetAll: () => void
  canProceedToStep: (step: number) => boolean

  // Loading and error management
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Get computed values
  getServiceFormat: () => ServiceFormat
  getTotalPrice: () => number
  getTotalDuration: () => number
  getBookingData: () => BookingData
  isConfigurationComplete: () => boolean
}

// Default configuration
const defaultConfiguration: BookingConfiguration = {
  mode: 'single',
  coupleFormat: undefined,
  selections: [],
  totalDuration: 0,
  totalPrice: 0,
  recipientCount: 1
}

// Default validation
const defaultValidation: BookingValidation = {
  isValid: false,
  errors: {}
}

// Business logic functions
const calculateTotalDuration = (
  selections: ServiceSelection[],
  format: ServiceFormat
): number => {
  return EnhancedPriceCalculator.calculateTotalDuration(selections, format)
}

const calculateTotalPrice = (selections: ServiceSelection[]): number => {
  return EnhancedPriceCalculator.calculateTotalPrice(selections)
}

export const useBookingStore = create<BookingStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        serviceConfiguration: defaultConfiguration,
        currentStep: 0,
        guestName: '',
        roomNumber: '',
        phoneNumber: '',
        date: '',
        time: '',
        notes: '',
        providerPreference: 'no-preference',
        isLoading: false,
        error: null,
        validation: defaultValidation,

        // Configuration actions
        setServiceMode: (mode) =>
          set((state) => {
            const newConfig = {
              ...state.serviceConfiguration,
              mode,
              recipientCount: mode === 'single' ? 1 : 2,
              coupleFormat: mode === 'single' ? undefined : state.serviceConfiguration.coupleFormat,
              selections: [] // Reset selections when mode changes
            }

            return {
              serviceConfiguration: newConfig,
              validation: get().validateConfiguration()
            }
          }),

        setCoupleFormat: (format) =>
          set((state) => {
            const newConfig = {
              ...state.serviceConfiguration,
              coupleFormat: format
            }

            // Recalculate totals with new format
            const serviceFormat = format || 'single'
            newConfig.totalDuration = calculateTotalDuration(newConfig.selections, serviceFormat)

            return {
              serviceConfiguration: newConfig,
              validation: get().validateConfiguration()
            }
          }),

        addServiceSelection: (selection) =>
          set((state) => {
            // Remove existing selection for the same recipient if replacing
            const filteredSelections = state.serviceConfiguration.selections.filter(
              s => s.recipientIndex !== selection.recipientIndex
            )

            const newSelections = [...filteredSelections, selection]
            const serviceFormat = get().getServiceFormat()

            const newConfig = {
              ...state.serviceConfiguration,
              selections: newSelections,
              totalDuration: calculateTotalDuration(newSelections, serviceFormat),
              totalPrice: calculateTotalPrice(newSelections)
            }

            return {
              serviceConfiguration: newConfig,
              validation: get().validateConfiguration()
            }
          }),

        updateServiceSelection: (index, updates) =>
          set((state) => {
            const newSelections = [...state.serviceConfiguration.selections]
            if (newSelections[index]) {
              newSelections[index] = { ...newSelections[index], ...updates }

              // Recalculate price if service or duration changed
              if (updates.service || updates.duration) {
                const service = updates.service || newSelections[index].service
                const duration = updates.duration || newSelections[index].duration

                // Use enhanced calculator with hotel discount if available
                if (service.discount_rate) {
                  newSelections[index].price = EnhancedPriceCalculator.calculateServicePriceWithDiscount(
                    service,
                    duration,
                    service.discount_rate,
                    state.serviceConfiguration.mode
                  )
                } else {
                  // Fallback to original calculator
                  newSelections[index].price = PriceCalculator.calculateServicePrice(service, duration, state.serviceConfiguration.mode)
                }
              }

              const serviceFormat = get().getServiceFormat()

              const newConfig = {
                ...state.serviceConfiguration,
                selections: newSelections,
                totalDuration: calculateTotalDuration(newSelections, serviceFormat),
                totalPrice: calculateTotalPrice(newSelections)
              }

              return {
                serviceConfiguration: newConfig,
                validation: get().validateConfiguration()
              }
            }
            return state
          }),

        removeServiceSelection: (index) =>
          set((state) => {
            const newSelections = state.serviceConfiguration.selections.filter((_, i) => i !== index)
            const serviceFormat = get().getServiceFormat()

            const newConfig = {
              ...state.serviceConfiguration,
              selections: newSelections,
              totalDuration: calculateTotalDuration(newSelections, serviceFormat),
              totalPrice: calculateTotalPrice(newSelections)
            }

            return {
              serviceConfiguration: newConfig,
              validation: get().validateConfiguration()
            }
          }),

        clearServiceSelections: () =>
          set((state) => ({
            serviceConfiguration: {
              ...state.serviceConfiguration,
              selections: [],
              totalDuration: 0,
              totalPrice: 0
            },
            validation: get().validateConfiguration()
          })),

        setRecipientName: (recipientIndex, name) =>
          set((state) => {
            const newSelections = state.serviceConfiguration.selections.map(selection =>
              selection.recipientIndex === recipientIndex
                ? { ...selection, recipientName: name }
                : selection
            )

            return {
              serviceConfiguration: {
                ...state.serviceConfiguration,
                selections: newSelections
              }
            }
          }),

        // Guest data actions
        setGuestName: (name) =>
          set((state) => ({
            guestName: name,
            validation: get().validateConfiguration()
          })),

        setRoomNumber: (room) =>
          set((state) => ({
            roomNumber: room,
            validation: get().validateConfiguration()
          })),

        setPhoneNumber: (phone) =>
          set((state) => ({
            phoneNumber: phone,
            validation: get().validateConfiguration()
          })),

        setDate: (date) =>
          set((state) => ({
            date,
            validation: get().validateConfiguration()
          })),

        setTime: (time) =>
          set((state) => ({
            time,
            validation: get().validateConfiguration()
          })),

        setNotes: (notes) =>
          set(() => ({ notes })),

        setProviderPreference: (preference) =>
          set(() => ({ providerPreference: preference })),

        // Step management
        setCurrentStep: (step) =>
          set(() => ({ currentStep: step })),

        nextStep: () =>
          set((state) => {
            const nextStep = Math.min(state.currentStep + 1, 3)
            return { currentStep: nextStep }
          }),

        previousStep: () =>
          set((state) => {
            const prevStep = Math.max(state.currentStep - 1, 0)
            return { currentStep: prevStep }
          }),

        // Calculation actions
        calculateTotals: () =>
          set((state) => {
            const serviceFormat = get().getServiceFormat()
            const { selections } = state.serviceConfiguration

            return {
              serviceConfiguration: {
                ...state.serviceConfiguration,
                totalDuration: calculateTotalDuration(selections, serviceFormat),
                totalPrice: calculateTotalPrice(selections)
              }
            }
          }),

        validateConfiguration: () => {
          const state = get()
          const { serviceConfiguration, currentStep } = state
          const errors: BookingValidation['errors'] = {}

          // Only show validation errors for current step - not future steps
          if (currentStep === 0) {
            // Step 0: Only validate service selection
            const serviceErrors: string[] = []
            if (serviceConfiguration.mode === 'couple' && !serviceConfiguration.coupleFormat) {
              serviceErrors.push('กรุณาเลือกรูปแบบการรับบริการ')
            }
            if (serviceConfiguration.selections.length === 0) {
              serviceErrors.push('กรุณาเลือกบริการอย่างน้อย 1 บริการ')
            }
            if (serviceConfiguration.mode === 'couple' && serviceConfiguration.selections.length < 2) {
              serviceErrors.push('กรุณาเลือกบริการสำหรับผู้รับบริการทั้ง 2 ท่าน')
            }
            if (serviceErrors.length > 0) {
              errors.serviceSelection = serviceErrors
            }
          } else if (currentStep === 1) {
            // Step 1: Only validate guest info
            const guestErrors = get().validateGuestInfo()
            if (guestErrors.length > 0) {
              errors.guestInfo = guestErrors
            }
          } else if (currentStep === 2) {
            // Step 2: Only validate date/time
            const dateTimeErrors = get().validateDateTime()
            if (dateTimeErrors.length > 0) {
              errors.dateTime = dateTimeErrors
            }
          }

          return {
            isValid: Object.keys(errors).length === 0,
            errors
          }
        },

        validateGuestInfo: () => {
          const { guestName, roomNumber, phoneNumber } = get()
          const errors: string[] = []

          if (!guestName.trim()) errors.push('กรุณากรอกชื่อแขก')
          if (!roomNumber.trim()) errors.push('กรุณากรอกเลขห้อง')
          if (!phoneNumber.trim()) errors.push('กรุณากรอกเบอร์โทรศัพท์')

          return errors
        },

        validateDateTime: () => {
          const { date, time } = get()
          const errors: string[] = []

          if (!date) errors.push('กรุณาเลือกวันที่')
          if (!time) errors.push('กรุณาเลือกเวลา')

          return errors
        },

        // Utility actions
        resetConfiguration: () =>
          set(() => ({
            serviceConfiguration: defaultConfiguration,
            validation: defaultValidation
          })),

        resetBookingData: () =>
          set(() => ({
            guestName: '',
            roomNumber: '',
            phoneNumber: '',
            date: '',
            time: '',
            notes: '',
            providerPreference: 'no-preference'
          })),

        resetAll: () =>
          set(() => ({
            serviceConfiguration: defaultConfiguration,
            currentStep: 0,
            guestName: '',
            roomNumber: '',
            phoneNumber: '',
            date: '',
            time: '',
            notes: '',
            providerPreference: 'no-preference',
            isLoading: false,
            error: null,
            validation: defaultValidation
          })),

        canProceedToStep: (step) => {
          const state = get()
          const validation = state.validation

          switch (step) {
            case 0: // Service configuration
              return true
            case 1: // Guest info
              return !validation.errors.serviceSelection
            case 2: // Date/time
              return !validation.errors.serviceSelection && !validation.errors.guestInfo
            case 3: // Confirmation
              return validation.isValid
            default:
              return false
          }
        },

        // Loading and error management
        setLoading: (loading) =>
          set(() => ({ isLoading: loading })),

        setError: (error) =>
          set(() => ({ error })),

        // Computed values
        getServiceFormat: () => {
          const { serviceConfiguration } = get()
          if (serviceConfiguration.mode === 'single') return 'single'
          if (serviceConfiguration.coupleFormat === 'simultaneous') return 'simultaneous'
          if (serviceConfiguration.coupleFormat === 'sequential') return 'sequential'
          return 'single'
        },

        getTotalPrice: () => get().serviceConfiguration.totalPrice,

        getTotalDuration: () => get().serviceConfiguration.totalDuration,

        getBookingData: (): BookingData => {
          const state = get()
          return {
            guestName: state.guestName,
            roomNumber: state.roomNumber,
            phoneNumber: state.phoneNumber,
            numberOfGuests: state.serviceConfiguration.recipientCount,
            selectedDuration: state.serviceConfiguration.totalDuration,
            date: state.date,
            time: state.time,
            notes: state.notes,
            providerPreference: state.providerPreference,
            serviceConfiguration: state.serviceConfiguration
          }
        },

        isConfigurationComplete: () => {
          const { serviceConfiguration } = get()
          const hasValidMode = serviceConfiguration.mode === 'single' ||
            (serviceConfiguration.mode === 'couple' && serviceConfiguration.coupleFormat)
          const hasSelections = serviceConfiguration.selections.length > 0
          const hasEnoughSelections = serviceConfiguration.mode === 'single' ||
            serviceConfiguration.selections.length >= 2

          return hasValidMode && hasSelections && hasEnoughSelections
        }
      }),
      {
        name: 'booking-store',
        partialize: (state) => ({
          serviceConfiguration: state.serviceConfiguration,
          guestName: state.guestName,
          roomNumber: state.roomNumber,
          phoneNumber: state.phoneNumber,
          date: state.date,
          time: state.time,
          notes: state.notes
        }),
      }
    ),
    {
      name: 'booking-store',
    }
  )
)