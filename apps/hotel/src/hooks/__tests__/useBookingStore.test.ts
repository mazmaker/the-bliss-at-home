import { describe, it, expect, beforeEach } from 'vitest'

// We need to mock the zustand middleware imports and dependent modules
// Since useBookingStore is a zustand store, we can test it by invoking the store directly

import { vi } from 'vitest'

// Mock the dependent calculators
vi.mock('../../utils/priceCalculator', () => ({
  PriceCalculator: {
    calculateServicePrice: vi.fn((service: any, duration: number, _mode: string) => {
      return service.hotel_price || 800
    }),
  },
}))

vi.mock('../../utils/enhancedPriceCalculator', () => ({
  EnhancedPriceCalculator: {
    calculateTotalDuration: vi.fn((selections: any[], _format: string) => {
      return selections.reduce((sum: number, s: any) => sum + s.duration, 0)
    }),
    calculateTotalPrice: vi.fn((selections: any[]) => {
      return selections.reduce((sum: number, s: any) => sum + s.price, 0)
    }),
    calculateServicePriceWithDiscount: vi.fn(
      (_service: any, _duration: number, _discountRate: number, _mode: string) => {
        return 700
      }
    ),
  },
}))

// Import after mocking
import { useBookingStore } from '../useBookingStore'

// Helper to create a mock service selection
function makeMockSelection(overrides: Record<string, any> = {}) {
  return {
    id: 'sel-1',
    service: {
      id: 'svc-1',
      name_th: 'นวดแผนไทย',
      name_en: 'Thai Massage',
      category: 'massage' as const,
      duration: 60,
      base_price: 1000,
      hotel_price: 800,
      is_active: true,
      created_at: null,
      updated_at: null,
    },
    duration: 60,
    recipientIndex: 0,
    price: 800,
    sortOrder: 0,
    ...overrides,
  }
}

describe('useBookingStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    const { resetAll } = useBookingStore.getState()
    resetAll()
  })

  describe('initial state', () => {
    it('should have default configuration', () => {
      const state = useBookingStore.getState()
      expect(state.serviceConfiguration.mode).toBe('single')
      expect(state.serviceConfiguration.selections).toEqual([])
      expect(state.serviceConfiguration.totalDuration).toBe(0)
      expect(state.serviceConfiguration.totalPrice).toBe(0)
      expect(state.serviceConfiguration.recipientCount).toBe(1)
    })

    it('should have empty booking data', () => {
      const state = useBookingStore.getState()
      expect(state.guestName).toBe('')
      expect(state.roomNumber).toBe('')
      expect(state.phoneNumber).toBe('')
      expect(state.date).toBe('')
      expect(state.time).toBe('')
      expect(state.notes).toBe('')
      expect(state.providerPreference).toBe('no-preference')
    })

    it('should have step 0 as current step', () => {
      const state = useBookingStore.getState()
      expect(state.currentStep).toBe(0)
    })

    it('should have no loading or error state', () => {
      const state = useBookingStore.getState()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should have default validation state', () => {
      const state = useBookingStore.getState()
      expect(state.validation.isValid).toBe(false)
      expect(state.validation.errors).toEqual({})
    })
  })

  describe('setServiceMode', () => {
    it('should switch to couple mode and set recipientCount to 2', () => {
      useBookingStore.getState().setServiceMode('couple')
      const state = useBookingStore.getState()
      expect(state.serviceConfiguration.mode).toBe('couple')
      expect(state.serviceConfiguration.recipientCount).toBe(2)
    })

    it('should switch back to single mode and set recipientCount to 1', () => {
      useBookingStore.getState().setServiceMode('couple')
      useBookingStore.getState().setServiceMode('single')
      const state = useBookingStore.getState()
      expect(state.serviceConfiguration.mode).toBe('single')
      expect(state.serviceConfiguration.recipientCount).toBe(1)
    })

    it('should clear selections when mode changes', () => {
      // First add a selection
      useBookingStore.getState().addServiceSelection(makeMockSelection())
      expect(useBookingStore.getState().serviceConfiguration.selections.length).toBe(1)

      // Switch mode
      useBookingStore.getState().setServiceMode('couple')
      expect(useBookingStore.getState().serviceConfiguration.selections).toEqual([])
    })

    it('should clear coupleFormat when switching to single', () => {
      useBookingStore.getState().setServiceMode('couple')
      useBookingStore.getState().setCoupleFormat('simultaneous')
      useBookingStore.getState().setServiceMode('single')
      expect(useBookingStore.getState().serviceConfiguration.coupleFormat).toBeUndefined()
    })
  })

  describe('setCoupleFormat', () => {
    it('should set the couple format', () => {
      useBookingStore.getState().setServiceMode('couple')
      useBookingStore.getState().setCoupleFormat('simultaneous')
      expect(useBookingStore.getState().serviceConfiguration.coupleFormat).toBe('simultaneous')
    })

    it('should support sequential format', () => {
      useBookingStore.getState().setServiceMode('couple')
      useBookingStore.getState().setCoupleFormat('sequential')
      expect(useBookingStore.getState().serviceConfiguration.coupleFormat).toBe('sequential')
    })
  })

  describe('addServiceSelection', () => {
    it('should add a service selection', () => {
      useBookingStore.getState().addServiceSelection(makeMockSelection())
      const state = useBookingStore.getState()
      expect(state.serviceConfiguration.selections.length).toBe(1)
      expect(state.serviceConfiguration.selections[0].id).toBe('sel-1')
    })

    it('should replace existing selection for the same recipientIndex', () => {
      useBookingStore.getState().addServiceSelection(makeMockSelection({ id: 'sel-1', recipientIndex: 0 }))
      useBookingStore.getState().addServiceSelection(makeMockSelection({ id: 'sel-2', recipientIndex: 0 }))
      const state = useBookingStore.getState()
      expect(state.serviceConfiguration.selections.length).toBe(1)
      expect(state.serviceConfiguration.selections[0].id).toBe('sel-2')
    })

    it('should allow multiple selections for different recipients', () => {
      useBookingStore.getState().addServiceSelection(makeMockSelection({ id: 'sel-1', recipientIndex: 0 }))
      useBookingStore.getState().addServiceSelection(makeMockSelection({ id: 'sel-2', recipientIndex: 1 }))
      const state = useBookingStore.getState()
      expect(state.serviceConfiguration.selections.length).toBe(2)
    })
  })

  describe('removeServiceSelection', () => {
    it('should remove a service selection by index', () => {
      useBookingStore.getState().addServiceSelection(makeMockSelection({ id: 'sel-1', recipientIndex: 0 }))
      useBookingStore.getState().addServiceSelection(makeMockSelection({ id: 'sel-2', recipientIndex: 1 }))
      useBookingStore.getState().removeServiceSelection(0)
      const state = useBookingStore.getState()
      expect(state.serviceConfiguration.selections.length).toBe(1)
    })
  })

  describe('clearServiceSelections', () => {
    it('should clear all service selections', () => {
      useBookingStore.getState().addServiceSelection(makeMockSelection({ id: 'sel-1', recipientIndex: 0 }))
      useBookingStore.getState().addServiceSelection(makeMockSelection({ id: 'sel-2', recipientIndex: 1 }))
      useBookingStore.getState().clearServiceSelections()
      const state = useBookingStore.getState()
      expect(state.serviceConfiguration.selections).toEqual([])
      expect(state.serviceConfiguration.totalDuration).toBe(0)
      expect(state.serviceConfiguration.totalPrice).toBe(0)
    })
  })

  describe('setRecipientName', () => {
    it('should set recipient name for a specific recipient index', () => {
      useBookingStore.getState().addServiceSelection(makeMockSelection({ recipientIndex: 0 }))
      useBookingStore.getState().setRecipientName(0, 'John Doe')
      const state = useBookingStore.getState()
      expect(state.serviceConfiguration.selections[0].recipientName).toBe('John Doe')
    })
  })

  describe('guest data actions', () => {
    it('should set guest name', () => {
      useBookingStore.getState().setGuestName('Test Guest')
      expect(useBookingStore.getState().guestName).toBe('Test Guest')
    })

    it('should set room number', () => {
      useBookingStore.getState().setRoomNumber('101')
      expect(useBookingStore.getState().roomNumber).toBe('101')
    })

    it('should set phone number', () => {
      useBookingStore.getState().setPhoneNumber('0812345678')
      expect(useBookingStore.getState().phoneNumber).toBe('0812345678')
    })

    it('should set date', () => {
      useBookingStore.getState().setDate('2026-03-01')
      expect(useBookingStore.getState().date).toBe('2026-03-01')
    })

    it('should set time', () => {
      useBookingStore.getState().setTime('14:00')
      expect(useBookingStore.getState().time).toBe('14:00')
    })

    it('should set notes', () => {
      useBookingStore.getState().setNotes('Special request')
      expect(useBookingStore.getState().notes).toBe('Special request')
    })

    it('should set provider preference', () => {
      useBookingStore.getState().setProviderPreference('female-only')
      expect(useBookingStore.getState().providerPreference).toBe('female-only')
    })
  })

  describe('step management', () => {
    it('should set current step', () => {
      useBookingStore.getState().setCurrentStep(2)
      expect(useBookingStore.getState().currentStep).toBe(2)
    })

    it('should go to next step', () => {
      useBookingStore.getState().nextStep()
      expect(useBookingStore.getState().currentStep).toBe(1)
    })

    it('should not go beyond step 3', () => {
      useBookingStore.getState().setCurrentStep(3)
      useBookingStore.getState().nextStep()
      expect(useBookingStore.getState().currentStep).toBe(3)
    })

    it('should go to previous step', () => {
      useBookingStore.getState().setCurrentStep(2)
      useBookingStore.getState().previousStep()
      expect(useBookingStore.getState().currentStep).toBe(1)
    })

    it('should not go below step 0', () => {
      useBookingStore.getState().previousStep()
      expect(useBookingStore.getState().currentStep).toBe(0)
    })
  })

  describe('validation', () => {
    it('validateGuestInfo should return errors for empty guest info', () => {
      const errors = useBookingStore.getState().validateGuestInfo()
      expect(errors.length).toBe(3)
    })

    it('validateGuestInfo should return no errors when all info provided', () => {
      useBookingStore.getState().setGuestName('Test')
      useBookingStore.getState().setRoomNumber('101')
      useBookingStore.getState().setPhoneNumber('0812345678')
      const errors = useBookingStore.getState().validateGuestInfo()
      expect(errors.length).toBe(0)
    })

    it('validateDateTime should return errors for empty date/time', () => {
      const errors = useBookingStore.getState().validateDateTime()
      expect(errors.length).toBe(2)
    })

    it('validateDateTime should return no errors when date and time are set', () => {
      useBookingStore.getState().setDate('2026-03-01')
      useBookingStore.getState().setTime('14:00')
      const errors = useBookingStore.getState().validateDateTime()
      expect(errors.length).toBe(0)
    })
  })

  describe('canProceedToStep', () => {
    it('should always allow step 0', () => {
      expect(useBookingStore.getState().canProceedToStep(0)).toBe(true)
    })

    it('should not allow step 1 without selections', () => {
      expect(useBookingStore.getState().canProceedToStep(1)).toBe(false)
    })

    it('should allow step 1 when single mode has selections', () => {
      useBookingStore.getState().addServiceSelection(makeMockSelection())
      expect(useBookingStore.getState().canProceedToStep(1)).toBe(true)
    })

    it('should not allow step 1 for couple mode without couple format', () => {
      useBookingStore.getState().setServiceMode('couple')
      useBookingStore.getState().addServiceSelection(makeMockSelection({ recipientIndex: 0 }))
      useBookingStore.getState().addServiceSelection(makeMockSelection({ id: 'sel-2', recipientIndex: 1 }))
      expect(useBookingStore.getState().canProceedToStep(1)).toBe(false)
    })

    it('should not allow step 2 without guest info', () => {
      useBookingStore.getState().addServiceSelection(makeMockSelection())
      expect(useBookingStore.getState().canProceedToStep(2)).toBe(false)
    })

    it('should not allow step 3 without date/time', () => {
      useBookingStore.getState().addServiceSelection(makeMockSelection())
      useBookingStore.getState().setGuestName('Guest')
      useBookingStore.getState().setRoomNumber('101')
      useBookingStore.getState().setPhoneNumber('0812345678')
      expect(useBookingStore.getState().canProceedToStep(3)).toBe(false)
    })

    it('should allow step 3 with all data complete', () => {
      useBookingStore.getState().addServiceSelection(makeMockSelection())
      useBookingStore.getState().setGuestName('Guest')
      useBookingStore.getState().setRoomNumber('101')
      useBookingStore.getState().setPhoneNumber('0812345678')
      useBookingStore.getState().setDate('2026-03-01')
      useBookingStore.getState().setTime('14:00')
      expect(useBookingStore.getState().canProceedToStep(3)).toBe(true)
    })

    it('should not allow unknown steps', () => {
      expect(useBookingStore.getState().canProceedToStep(99)).toBe(false)
    })
  })

  describe('loading and error management', () => {
    it('should set loading state', () => {
      useBookingStore.getState().setLoading(true)
      expect(useBookingStore.getState().isLoading).toBe(true)
    })

    it('should set error state', () => {
      useBookingStore.getState().setError('Something went wrong')
      expect(useBookingStore.getState().error).toBe('Something went wrong')
    })

    it('should clear error', () => {
      useBookingStore.getState().setError('Error')
      useBookingStore.getState().setError(null)
      expect(useBookingStore.getState().error).toBeNull()
    })
  })

  describe('computed values', () => {
    it('getServiceFormat should return single for single mode', () => {
      expect(useBookingStore.getState().getServiceFormat()).toBe('single')
    })

    it('getServiceFormat should return simultaneous for couple simultaneous', () => {
      useBookingStore.getState().setServiceMode('couple')
      useBookingStore.getState().setCoupleFormat('simultaneous')
      expect(useBookingStore.getState().getServiceFormat()).toBe('simultaneous')
    })

    it('getServiceFormat should return sequential for couple sequential', () => {
      useBookingStore.getState().setServiceMode('couple')
      useBookingStore.getState().setCoupleFormat('sequential')
      expect(useBookingStore.getState().getServiceFormat()).toBe('sequential')
    })

    it('getTotalPrice should return 0 initially', () => {
      expect(useBookingStore.getState().getTotalPrice()).toBe(0)
    })

    it('getTotalDuration should return 0 initially', () => {
      expect(useBookingStore.getState().getTotalDuration()).toBe(0)
    })

    it('getBookingData should return complete booking data object', () => {
      useBookingStore.getState().setGuestName('Guest')
      useBookingStore.getState().setRoomNumber('101')
      useBookingStore.getState().setPhoneNumber('0812345678')
      useBookingStore.getState().setDate('2026-03-01')
      useBookingStore.getState().setTime('14:00')
      useBookingStore.getState().setNotes('Test note')

      const data = useBookingStore.getState().getBookingData()
      expect(data.guestName).toBe('Guest')
      expect(data.roomNumber).toBe('101')
      expect(data.phoneNumber).toBe('0812345678')
      expect(data.date).toBe('2026-03-01')
      expect(data.time).toBe('14:00')
      expect(data.notes).toBe('Test note')
      expect(data.providerPreference).toBe('no-preference')
      expect(data.numberOfGuests).toBe(1)
    })

    it('isConfigurationComplete should return false for no selections', () => {
      expect(useBookingStore.getState().isConfigurationComplete()).toBe(false)
    })

    it('isConfigurationComplete should return true for single mode with selection', () => {
      useBookingStore.getState().addServiceSelection(makeMockSelection())
      expect(useBookingStore.getState().isConfigurationComplete()).toBe(true)
    })
  })

  describe('reset actions', () => {
    it('resetConfiguration should reset only service configuration', () => {
      useBookingStore.getState().addServiceSelection(makeMockSelection())
      useBookingStore.getState().setGuestName('Guest')
      useBookingStore.getState().resetConfiguration()
      const state = useBookingStore.getState()
      expect(state.serviceConfiguration.selections).toEqual([])
      expect(state.guestName).toBe('Guest') // guest data preserved
    })

    it('resetBookingData should reset only booking data', () => {
      useBookingStore.getState().addServiceSelection(makeMockSelection())
      useBookingStore.getState().setGuestName('Guest')
      useBookingStore.getState().resetBookingData()
      const state = useBookingStore.getState()
      expect(state.guestName).toBe('')
      expect(state.serviceConfiguration.selections.length).toBe(1) // selections preserved
    })

    it('resetAll should reset everything', () => {
      useBookingStore.getState().addServiceSelection(makeMockSelection())
      useBookingStore.getState().setGuestName('Guest')
      useBookingStore.getState().setCurrentStep(2)
      useBookingStore.getState().setLoading(true)
      useBookingStore.getState().setError('err')
      useBookingStore.getState().resetAll()
      const state = useBookingStore.getState()
      expect(state.serviceConfiguration.selections).toEqual([])
      expect(state.guestName).toBe('')
      expect(state.currentStep).toBe(0)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })
})
