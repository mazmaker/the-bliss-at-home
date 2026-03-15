/**
 * LINE Notify Service
 * Sends notifications to users via LINE Notify API
 *
 * Setup Instructions:
 * 1. Get LINE Notify Token: https://notify-bot.line.me/
 * 2. Add token to environment variables:
 *    - VITE_LINE_NOTIFY_TOKEN_ADMIN (for admin notifications)
 *    - VITE_LINE_NOTIFY_TOKEN_STAFF (for staff notifications - per staff)
 */

interface LineNotifyOptions {
  message: string
  imageThumbnail?: string
  imageFullsize?: string
  stickerPackageId?: number
  stickerId?: number
}

interface DocumentNotificationData {
  staffName: string
  staffPhone: string
  documentType: string
  documentId: string
  status: 'uploaded' | 'verified' | 'rejected'
  rejectionReason?: string
  adminName?: string
}

class LineNotifyService {
  private readonly API_URL = 'https://notify-api.line.me/api/notify'
  private readonly adminToken: string

  constructor() {
    // Get admin token from environment
    this.adminToken = import.meta.env.VITE_LINE_NOTIFY_TOKEN_ADMIN || ''

    if (!this.adminToken) {
      console.warn('LINE Notify: Admin token not configured')
    }
  }

  /**
   * Send notification via LINE Notify
   */
  private async sendNotification(token: string, options: LineNotifyOptions): Promise<boolean> {
    if (!token) {
      console.error('LINE Notify: Token is required')
      return false
    }

    try {
      const formData = new FormData()
      formData.append('message', options.message)

      if (options.imageThumbnail) {
        formData.append('imageThumbnail', options.imageThumbnail)
      }
      if (options.imageFullsize) {
        formData.append('imageFullsize', options.imageFullsize)
      }
      if (options.stickerPackageId && options.stickerId) {
        formData.append('stickerPackageId', options.stickerPackageId.toString())
        formData.append('stickerId', options.stickerId.toString())
      }

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`LINE Notify API error: ${response.status}`)
      }

      const result = await response.json()
      return result.status === 200
    } catch (error) {
      console.error('Failed to send LINE notification:', error)
      return false
    }
  }

  /**
   * Notify admin when new document is uploaded
   */
  async notifyAdminNewDocument(data: DocumentNotificationData): Promise<boolean> {
    const message = `
📄 มีเอกสารใหม่รอตรวจสอบ

👤 พนักงาน: ${data.staffName}
📱 เบอร์: ${data.staffPhone}
📋 ประเภทเอกสาร: ${data.documentType}
🔗 Document ID: ${data.documentId}

กรุณาตรวจสอบและอนุมัติเอกสารผ่านระบบ Admin
    `.trim()

    return this.sendNotification(this.adminToken, {
      message,
      stickerPackageId: 11537,
      stickerId: 52002734, // Document sticker
    })
  }

  /**
   * Notify staff when document is verified
   */
  async notifyStaffDocumentVerified(
    staffToken: string,
    data: DocumentNotificationData
  ): Promise<boolean> {
    const message = `
✅ เอกสารได้รับการอนุมัติแล้ว!

📋 ประเภทเอกสาร: ${data.documentType}
👨‍💼 อนุมัติโดย: ${data.adminName || 'Admin'}
📅 วันที่: ${new Date().toLocaleDateString('th-TH')}

ขอบคุณที่ส่งเอกสาร เอกสารของคุณผ่านการตรวจสอบเรียบร้อยแล้ว
    `.trim()

    return this.sendNotification(staffToken, {
      message,
      stickerPackageId: 11537,
      stickerId: 52002735, // Success sticker
    })
  }

  /**
   * Notify staff when document is rejected
   */
  async notifyStaffDocumentRejected(
    staffToken: string,
    data: DocumentNotificationData
  ): Promise<boolean> {
    const message = `
❌ เอกสารถูกปฏิเสธ

📋 ประเภทเอกสาร: ${data.documentType}
⚠️ เหตุผล: ${data.rejectionReason || 'ไม่ระบุ'}
👨‍💼 ตรวจสอบโดย: ${data.adminName || 'Admin'}

กรุณาตรวจสอบและอัปโหลดเอกสารใหม่ผ่านระบบ
หากมีข้อสงสัย กรุณาติดต่อ Admin
    `.trim()

    return this.sendNotification(staffToken, {
      message,
      stickerPackageId: 11537,
      stickerId: 52002744, // Warning sticker
    })
  }

  /**
   * Send custom notification
   */
  async sendCustomNotification(
    token: string,
    message: string,
    options?: Partial<LineNotifyOptions>
  ): Promise<boolean> {
    return this.sendNotification(token, {
      message,
      ...options,
    })
  }

  /**
   * Get document type label in Thai
   */
  private getDocumentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      id_card: 'สำเนาบัตรประชาชน',
      license: 'ใบประกอบวิชาชีพ',
      certificate: 'ใบรับรองการอบรม',
      bank_statement: 'สำเนาบัญชีธนาคาร',
      other: 'เอกสารอื่นๆ',
    }
    return labels[type] || type
  }

  /**
   * Test LINE Notify connection
   */
  async testConnection(token: string): Promise<boolean> {
    return this.sendNotification(token, {
      message: '🔔 ทดสอบการเชื่อมต่อ LINE Notify สำเร็จ!',
      stickerPackageId: 11537,
      stickerId: 52002734,
    })
  }
}

// Export singleton instance
export const lineNotifyService = new LineNotifyService()

// Export types
export type { DocumentNotificationData, LineNotifyOptions }
