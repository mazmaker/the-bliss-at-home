// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Notification API
const mockNotification = vi.fn()
let mockPermission = 'default' as NotificationPermission
const mockRequestPermission = vi.fn()

// Use vi.stubGlobal to properly mock Notification on window in jsdom
const NotificationMock: any = Object.assign(mockNotification, {
  requestPermission: mockRequestPermission,
})
Object.defineProperty(NotificationMock, 'permission', {
  get: () => mockPermission,
  configurable: true,
})
vi.stubGlobal('Notification', NotificationMock)

// Must import after mocking
import { NotificationService } from '../notificationService'

describe('NotificationService', () => {
  let service: NotificationService

  beforeEach(() => {
    vi.clearAllMocks()
    mockPermission = 'granted'
    // Reset singleton by accessing private constructor via getInstance pattern
    // @ts-ignore - testing internal state
    NotificationService['instance'] = undefined as any
    service = NotificationService.getInstance()
  })

  describe('getInstance', () => {
    it('returns singleton instance', () => {
      const a = NotificationService.getInstance()
      const b = NotificationService.getInstance()
      expect(a).toBe(b)
    })
  })

  describe('requestPermission', () => {
    it('returns true when already granted', async () => {
      mockPermission = 'granted'
      // @ts-ignore
      NotificationService['instance'] = undefined as any
      service = NotificationService.getInstance()
      const result = await service.requestPermission()
      expect(result).toBe(true)
    })

    it('returns false when denied', async () => {
      mockPermission = 'denied'
      // @ts-ignore
      NotificationService['instance'] = undefined as any
      service = NotificationService.getInstance()
      const result = await service.requestPermission()
      expect(result).toBe(false)
    })

    it('requests permission when default', async () => {
      mockPermission = 'default'
      mockRequestPermission.mockResolvedValue('granted')
      // @ts-ignore
      NotificationService['instance'] = undefined as any
      service = NotificationService.getInstance()
      const result = await service.requestPermission()
      expect(mockRequestPermission).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('returns false when permission request denied', async () => {
      mockPermission = 'default'
      mockRequestPermission.mockResolvedValue('denied')
      // @ts-ignore
      NotificationService['instance'] = undefined as any
      service = NotificationService.getInstance()
      const result = await service.requestPermission()
      expect(result).toBe(false)
    })

    it('returns false when requestPermission throws', async () => {
      mockPermission = 'default'
      mockRequestPermission.mockRejectedValue(new Error('fail'))
      // @ts-ignore
      NotificationService['instance'] = undefined as any
      service = NotificationService.getInstance()
      const result = await service.requestPermission()
      expect(result).toBe(false)
    })
  })

  describe('isAvailable', () => {
    it('returns true when notification supported and granted', () => {
      mockPermission = 'granted'
      // @ts-ignore
      NotificationService['instance'] = undefined as any
      service = NotificationService.getInstance()
      expect(service.isAvailable()).toBe(true)
    })

    it('returns false when permission not granted', () => {
      mockPermission = 'denied'
      // @ts-ignore
      NotificationService['instance'] = undefined as any
      service = NotificationService.getInstance()
      expect(service.isAvailable()).toBe(false)
    })
  })

  describe('getPermissionStatus', () => {
    it('returns current permission status', () => {
      mockPermission = 'granted'
      expect(service.getPermissionStatus()).toBe('granted')
    })
  })

  describe('showSOSNotification', () => {
    it('creates notification with correct data', () => {
      mockPermission = 'granted'
      // @ts-ignore
      NotificationService['instance'] = undefined as any
      service = NotificationService.getInstance()

      service.showSOSNotification({
        title: 'SOS Alert',
        message: 'Emergency',
        priority: 'high',
        sourceType: 'customer',
        alertId: 'sos-1',
      })

      expect(mockNotification).toHaveBeenCalledWith(
        'SOS Alert',
        expect.objectContaining({
          tag: 'sos-sos-1',
          requireInteraction: true,
        })
      )
    })

    it('does not create notification when permission not granted', () => {
      mockPermission = 'denied'
      // @ts-ignore
      NotificationService['instance'] = undefined as any
      service = NotificationService.getInstance()

      service.showSOSNotification({
        title: 'SOS',
        message: 'Test',
        priority: 'low',
        sourceType: 'staff',
        alertId: 'sos-2',
      })

      expect(mockNotification).not.toHaveBeenCalled()
    })

    it('sets requireInteraction for critical priority', () => {
      mockPermission = 'granted'
      // @ts-ignore
      NotificationService['instance'] = undefined as any
      service = NotificationService.getInstance()

      service.showSOSNotification({
        title: 'Critical',
        message: 'Urgent',
        priority: 'critical',
        sourceType: 'customer',
        alertId: 'sos-3',
      })

      expect(mockNotification).toHaveBeenCalledWith(
        'Critical',
        expect.objectContaining({
          requireInteraction: true,
        })
      )
    })

    it('does not require interaction for low priority', () => {
      mockPermission = 'granted'
      // @ts-ignore
      NotificationService['instance'] = undefined as any
      service = NotificationService.getInstance()

      service.showSOSNotification({
        title: 'Low',
        message: 'Info',
        priority: 'low',
        sourceType: 'staff',
        alertId: 'sos-4',
      })

      expect(mockNotification).toHaveBeenCalledWith(
        'Low',
        expect.objectContaining({
          requireInteraction: false,
        })
      )
    })
  })
})
