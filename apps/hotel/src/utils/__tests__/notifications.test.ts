import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted for all mocks referenced inside vi.mock factories
const { mockToast, mockSuccess, mockError, mockLoading, mockDismiss, mockPromise } = vi.hoisted(() => {
  const mockSuccess = vi.fn()
  const mockError = vi.fn()
  const mockLoading = vi.fn().mockReturnValue('toast-id-1')
  const mockDismiss = vi.fn()
  const mockPromise = vi.fn()
  const mockToast = vi.fn()
  return { mockToast, mockSuccess, mockError, mockLoading, mockDismiss, mockPromise }
})

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: Object.assign(mockToast, {
    success: mockSuccess,
    error: mockError,
    loading: mockLoading,
    dismiss: mockDismiss,
    promise: mockPromise,
  }),
}))

import {
  showSuccess,
  showError,
  showLoading,
  showInfo,
  updateToast,
  dismissAllToasts,
  dismissToast,
  notifications,
  createLoadingToast,
  showErrorByType,
  showPromiseToast,
  type NotificationType,
} from '../notifications'

describe('notifications utility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('showSuccess', () => {
    it('should call toast.success with message and options', () => {
      showSuccess('Operation successful')

      expect(mockSuccess).toHaveBeenCalledWith('Operation successful', {
        duration: 4000,
        position: 'bottom-right',
      })
    })
  })

  describe('showError', () => {
    it('should call toast.error with message and options', () => {
      showError('Operation failed')

      expect(mockError).toHaveBeenCalledWith('Operation failed', {
        duration: 5000,
        position: 'bottom-right',
      })
    })
  })

  describe('showLoading', () => {
    it('should call toast.loading with message and options', () => {
      showLoading('Loading...')

      expect(mockLoading).toHaveBeenCalledWith('Loading...', {
        position: 'bottom-right',
      })
    })
  })

  describe('showInfo', () => {
    it('should call toast with info icon', () => {
      showInfo('Info message')

      expect(mockToast).toHaveBeenCalledWith('Info message', {
        duration: 4000,
        position: 'bottom-right',
        icon: 'ℹ️',
      })
    })
  })

  describe('updateToast', () => {
    it('should update toast with success type', () => {
      updateToast('toast-1', 'success', 'Done!')

      expect(mockSuccess).toHaveBeenCalledWith('Done!', { id: 'toast-1' })
    })

    it('should update toast with error type', () => {
      updateToast('toast-1', 'error', 'Failed!')

      expect(mockError).toHaveBeenCalledWith('Failed!', { id: 'toast-1' })
    })
  })

  describe('dismissAllToasts', () => {
    it('should call toast.dismiss with no args', () => {
      dismissAllToasts()

      expect(mockDismiss).toHaveBeenCalledWith()
    })
  })

  describe('dismissToast', () => {
    it('should call toast.dismiss with specific id', () => {
      dismissToast('toast-1')

      expect(mockDismiss).toHaveBeenCalledWith('toast-1')
    })
  })

  describe('notifications object', () => {
    it('should have booking notifications', () => {
      expect(notifications.booking.createSuccess).toBeDefined()
      expect(notifications.booking.createError).toBeDefined()
      expect(notifications.booking.updateSuccess).toBeDefined()
      expect(notifications.booking.cancelSuccess).toBeDefined()
      expect(notifications.booking.confirmSuccess).toBeDefined()
      expect(notifications.booking.createLoading).toBeDefined()
    })

    it('should have payment notifications', () => {
      expect(notifications.payment.processSuccess).toBeDefined()
      expect(notifications.payment.processError).toBeDefined()
      expect(notifications.payment.refundSuccess).toBeDefined()
    })

    it('should have profile notifications', () => {
      expect(notifications.profile.updateSuccess).toBeDefined()
      expect(notifications.profile.uploadSuccess).toBeDefined()
    })

    it('should have settings notifications', () => {
      expect(notifications.settings.updateSuccess).toBeDefined()
      expect(notifications.settings.resetSuccess).toBeDefined()
    })

    it('should have general notifications', () => {
      expect(notifications.general.saveSuccess).toBeDefined()
      expect(notifications.general.deleteSuccess).toBeDefined()
      expect(notifications.general.loadError).toBeDefined()
      expect(notifications.general.networkError).toBeDefined()
      expect(notifications.general.unauthorized).toBeDefined()
      expect(notifications.general.validationError).toBeDefined()
    })

    it('should have export notifications', () => {
      expect(notifications.export.success).toBeDefined()
      expect(notifications.export.error).toBeDefined()
      expect(notifications.export.loading).toBeDefined()
    })

    it('booking messages should contain Thai text', () => {
      expect(notifications.booking.createSuccess).toMatch(/สร้างการจอง/)
      expect(notifications.booking.cancelSuccess).toMatch(/ยกเลิก/)
    })
  })

  describe('createLoadingToast', () => {
    it('should create a loading toast and return control methods', () => {
      const controller = createLoadingToast('Processing...')

      expect(mockLoading).toHaveBeenCalledWith('Processing...', {
        position: 'bottom-right',
      })

      expect(typeof controller.success).toBe('function')
      expect(typeof controller.error).toBe('function')
      expect(typeof controller.dismiss).toBe('function')
    })

    it('should update to success when success method called', () => {
      const controller = createLoadingToast('Processing...')
      controller.success('Done!')

      expect(mockSuccess).toHaveBeenCalledWith('Done!', { id: 'toast-id-1' })
    })

    it('should update to error when error method called', () => {
      const controller = createLoadingToast('Processing...')
      controller.error('Failed!')

      expect(mockError).toHaveBeenCalledWith('Failed!', { id: 'toast-id-1' })
    })

    it('should dismiss when dismiss method called', () => {
      const controller = createLoadingToast('Processing...')
      controller.dismiss()

      expect(mockDismiss).toHaveBeenCalledWith('toast-id-1')
    })
  })

  describe('showErrorByType', () => {
    it('should show generic save error for null/undefined error', () => {
      showErrorByType(null)

      expect(mockError).toHaveBeenCalledWith(
        notifications.general.saveError,
        expect.any(Object)
      )
    })

    it('should show network error for Network-related errors', () => {
      showErrorByType({ message: 'Network error occurred' })

      expect(mockError).toHaveBeenCalledWith(
        notifications.general.networkError,
        expect.any(Object)
      )
    })

    it('should show unauthorized error for 401 errors', () => {
      showErrorByType({ message: '401 Unauthorized' })

      expect(mockError).toHaveBeenCalledWith(
        notifications.general.unauthorized,
        expect.any(Object)
      )
    })

    it('should show unauthorized error for Unauthorized message', () => {
      showErrorByType({ message: 'Unauthorized access' })

      expect(mockError).toHaveBeenCalledWith(
        notifications.general.unauthorized,
        expect.any(Object)
      )
    })

    it('should show validation error for validation-related errors', () => {
      showErrorByType({ message: 'validation failed' })

      expect(mockError).toHaveBeenCalledWith(
        notifications.general.validationError,
        expect.any(Object)
      )
    })

    it('should show validation error for invalid data errors', () => {
      showErrorByType({ message: 'invalid input data' })

      expect(mockError).toHaveBeenCalledWith(
        notifications.general.validationError,
        expect.any(Object)
      )
    })

    it('should show custom error message for unmatched errors', () => {
      showErrorByType({ message: 'Something custom went wrong' })

      expect(mockError).toHaveBeenCalledWith(
        'Something custom went wrong',
        expect.any(Object)
      )
    })
  })

  describe('showPromiseToast', () => {
    it('should call toast.promise with promise and messages', async () => {
      const promise = Promise.resolve('result')
      mockPromise.mockResolvedValue('result')

      const messages = {
        loading: 'Loading...',
        success: 'Done!',
        error: 'Failed!',
      }

      await showPromiseToast(promise, messages)

      expect(mockPromise).toHaveBeenCalledWith(
        promise,
        messages,
        { position: 'bottom-right' }
      )
    })
  })

  describe('NotificationType', () => {
    it('should accept valid notification types', () => {
      const types: NotificationType[] = ['success', 'error', 'loading', 'info']
      expect(types).toHaveLength(4)
      expect(types).toContain('success')
      expect(types).toContain('error')
      expect(types).toContain('loading')
      expect(types).toContain('info')
    })
  })
})
