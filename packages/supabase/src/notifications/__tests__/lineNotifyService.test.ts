import { describe, it, expect, vi, beforeEach } from 'vitest'

// Stub env before importing
vi.stubEnv('VITE_LINE_NOTIFY_TOKEN_ADMIN', 'test-admin-token')

// Proper FormData mock as a class
class MockFormData {
  _data: Record<string, string> = {}
  append(key: string, val: string) {
    this._data[key] = val
  }
}

describe('LineNotifyService', () => {
  let lineNotifyService: any

  beforeEach(async () => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    global.FormData = MockFormData as any

    vi.resetModules()
    vi.stubEnv('VITE_LINE_NOTIFY_TOKEN_ADMIN', 'test-admin-token')
    const mod = await import('../lineNotifyService')
    lineNotifyService = mod.lineNotifyService
  })

  const mockDocData = {
    staffName: 'สมชาย',
    staffPhone: '0812345678',
    documentType: 'สำเนาบัตรประชาชน',
    documentId: 'doc-1',
    status: 'uploaded' as const,
  }

  describe('notifyAdminNewDocument', () => {
    it('should send notification via LINE Notify API', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 200 }),
      })

      const result = await lineNotifyService.notifyAdminNewDocument(mockDocData)

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://notify-api.line.me/api/notify',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-admin-token',
          }),
        })
      )
    })

    it('should return false on fetch error', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const result = await lineNotifyService.notifyAdminNewDocument(mockDocData)
      expect(result).toBe(false)
    })

    it('should return false on non-ok response', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      const result = await lineNotifyService.notifyAdminNewDocument(mockDocData)
      expect(result).toBe(false)
    })

    it('should return false when status is not 200', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 401 }),
      })

      const result = await lineNotifyService.notifyAdminNewDocument(mockDocData)
      expect(result).toBe(false)
    })
  })

  describe('notifyStaffDocumentVerified', () => {
    it('should send verification notification to staff', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 200 }),
      })

      const result = await lineNotifyService.notifyStaffDocumentVerified('staff-token-1', {
        ...mockDocData,
        status: 'verified' as const,
        adminName: 'Admin A',
      })

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://notify-api.line.me/api/notify',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer staff-token-1',
          }),
        })
      )
    })

    it('should return false when staff token is empty', async () => {
      const result = await lineNotifyService.notifyStaffDocumentVerified('', {
        ...mockDocData,
        status: 'verified' as const,
      })

      expect(result).toBe(false)
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('notifyStaffDocumentRejected', () => {
    it('should send rejection notification to staff', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 200 }),
      })

      const result = await lineNotifyService.notifyStaffDocumentRejected('staff-token-2', {
        ...mockDocData,
        status: 'rejected' as const,
        rejectionReason: 'ภาพไม่ชัด',
      })

      expect(result).toBe(true)
    })

    it('should return false on error', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('timeout'))

      const result = await lineNotifyService.notifyStaffDocumentRejected('staff-token-2', {
        ...mockDocData,
        status: 'rejected' as const,
        rejectionReason: 'ข้อมูลไม่ถูกต้อง',
      })

      expect(result).toBe(false)
    })
  })

  describe('sendCustomNotification', () => {
    it('should send a custom notification', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 200 }),
      })

      const result = await lineNotifyService.sendCustomNotification('some-token', 'Hello custom')

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should return false when token is empty', async () => {
      const result = await lineNotifyService.sendCustomNotification('', 'Hello')
      expect(result).toBe(false)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should accept optional options', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 200 }),
      })

      const result = await lineNotifyService.sendCustomNotification('token', 'Msg', {
        stickerPackageId: 123,
        stickerId: 456,
      })

      expect(result).toBe(true)
    })
  })

  describe('testConnection', () => {
    it('should send a test notification', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 200 }),
      })

      const result = await lineNotifyService.testConnection('test-token')
      expect(result).toBe(true)
    })

    it('should return false on failure', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('fail'))

      const result = await lineNotifyService.testConnection('test-token')
      expect(result).toBe(false)
    })
  })

  describe('no admin token configured', () => {
    it('should return false when admin token is empty', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_LINE_NOTIFY_TOKEN_ADMIN', '')
      const mod = await import('../lineNotifyService')

      const result = await mod.lineNotifyService.notifyAdminNewDocument(mockDocData)
      expect(result).toBe(false)
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })
})
