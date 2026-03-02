import { describe, it, expect, vi, beforeEach } from 'vitest'

// Must mock import.meta.env before importing
vi.stubEnv('VITE_LINE_CHANNEL_ACCESS_TOKEN', 'test-token-123')

// Need to re-import after env stub - use dynamic import approach
// Reset module registry for each describe block

describe('LineMessagingService', () => {
  let lineMessagingService: any

  beforeEach(async () => {
    vi.clearAllMocks()
    global.fetch = vi.fn()

    // Re-import to get fresh instance with env
    vi.resetModules()
    vi.stubEnv('VITE_LINE_CHANNEL_ACCESS_TOKEN', 'test-token-123')
    const mod = await import('../lineMessagingService')
    lineMessagingService = mod.lineMessagingService
  })

  const mockDocData = {
    staffName: 'สมชาย',
    staffPhone: '0812345678',
    documentType: 'สำเนาบัตรประชาชน',
    documentId: 'doc-1',
    status: 'uploaded' as const,
  }

  describe('notifyAdminNewDocument', () => {
    it('should broadcast document notification', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({ ok: true })

      const result = await lineMessagingService.notifyAdminNewDocument(mockDocData)

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/message/broadcast',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token-123',
          }),
        })
      )
    })

    it('should include staff info in message', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({ ok: true })

      await lineMessagingService.notifyAdminNewDocument(mockDocData)

      const body = JSON.parse((global.fetch as any).mock.calls[0][1].body)
      expect(body.messages[0].text).toContain('สมชาย')
      expect(body.messages[0].text).toContain('0812345678')
    })

    it('should return false on fetch error', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const result = await lineMessagingService.notifyAdminNewDocument(mockDocData)
      expect(result).toBe(false)
    })

    it('should return false on non-ok response', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid token' }),
      })

      const result = await lineMessagingService.notifyAdminNewDocument(mockDocData)
      expect(result).toBe(false)
    })
  })

  describe('notifyStaffDocumentVerified', () => {
    it('should push verification message to staff', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({ ok: true })

      const result = await lineMessagingService.notifyStaffDocumentVerified('line-user-1', {
        ...mockDocData,
        status: 'verified' as const,
        adminName: 'Admin A',
      })

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/message/push',
        expect.objectContaining({ method: 'POST' })
      )

      const body = JSON.parse((global.fetch as any).mock.calls[0][1].body)
      expect(body.to).toBe('line-user-1')
      expect(body.messages[0].text).toContain('อนุมัติ')
    })
  })

  describe('notifyStaffDocumentRejected', () => {
    it('should push rejection message to staff', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({ ok: true })

      const result = await lineMessagingService.notifyStaffDocumentRejected('line-user-2', {
        ...mockDocData,
        status: 'rejected' as const,
        rejectionReason: 'ภาพไม่ชัด',
      })

      expect(result).toBe(true)
      const body = JSON.parse((global.fetch as any).mock.calls[0][1].body)
      expect(body.messages[0].text).toContain('ปฏิเสธ')
      expect(body.messages[0].text).toContain('ภาพไม่ชัด')
    })
  })

  describe('sendCustomMessage', () => {
    it('should send custom text message', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({ ok: true })

      const result = await lineMessagingService.sendCustomMessage('user-x', 'Hello world')

      expect(result).toBe(true)
      const body = JSON.parse((global.fetch as any).mock.calls[0][1].body)
      expect(body.to).toBe('user-x')
      expect(body.messages[0].text).toBe('Hello world')
    })

    it('should return false on network error', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('timeout'))

      const result = await lineMessagingService.sendCustomMessage('user-x', 'Hi')
      expect(result).toBe(false)
    })
  })

  describe('no token configured', () => {
    it('should return false when no token', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_LINE_CHANNEL_ACCESS_TOKEN', '')
      const mod = await import('../lineMessagingService')

      const result = await mod.lineMessagingService.sendCustomMessage('u1', 'test')
      expect(result).toBe(false)
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })
})
