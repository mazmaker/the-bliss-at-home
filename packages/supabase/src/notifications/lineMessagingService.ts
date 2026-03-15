/**
 * LINE Messaging API Service
 * Replaces LINE Notify which was discontinued on March 31, 2025
 *
 * Setup Instructions:
 * 1. Create LINE Official Account: https://manager.line.biz/
 * 2. Enable Messaging API
 * 3. Get Channel Access Token
 * 4. Add token to environment variables:
 *    - VITE_LINE_CHANNEL_ACCESS_TOKEN
 */

interface LineMessage {
  type: 'text' | 'flex'
  text?: string
  altText?: string
  contents?: any
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

class LineMessagingService {
  private readonly API_URL = 'https://api.line.me/v2/bot/message'
  private readonly channelAccessToken: string

  constructor() {
    // Get channel access token from environment
    this.channelAccessToken = import.meta.env.VITE_LINE_CHANNEL_ACCESS_TOKEN || ''

    if (!this.channelAccessToken) {
      console.warn('LINE Messaging API: Channel Access Token not configured')
    }
  }

  /**
   * Push message to user by User ID
   */
  private async pushMessage(to: string, messages: LineMessage[]): Promise<boolean> {
    if (!this.channelAccessToken) {
      console.error('LINE Messaging API: Channel Access Token is required')
      return false
    }

    try {
      const response = await fetch(`${this.API_URL}/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.channelAccessToken}`,
        },
        body: JSON.stringify({
          to,
          messages,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`LINE Messaging API error: ${JSON.stringify(error)}`)
      }

      return true
    } catch (error) {
      console.error('Failed to send LINE message:', error)
      return false
    }
  }

  /**
   * Broadcast message to all followers
   */
  private async broadcast(messages: LineMessage[]): Promise<boolean> {
    if (!this.channelAccessToken) {
      console.error('LINE Messaging API: Channel Access Token is required')
      return false
    }

    try {
      const response = await fetch(`${this.API_URL}/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.channelAccessToken}`,
        },
        body: JSON.stringify({
          messages,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`LINE Messaging API error: ${JSON.stringify(error)}`)
      }

      return true
    } catch (error) {
      console.error('Failed to broadcast LINE message:', error)
      return false
    }
  }

  /**
   * Notify admin when new document is uploaded
   * Note: This will broadcast to all followers of the Official Account
   */
  async notifyAdminNewDocument(data: DocumentNotificationData): Promise<boolean> {
    const message: LineMessage = {
      type: 'text',
      text: `📄 มีเอกสารใหม่รอตรวจสอบ\n\n` +
            `👤 พนักงาน: ${data.staffName}\n` +
            `📱 เบอร์: ${data.staffPhone}\n` +
            `📋 ประเภทเอกสาร: ${data.documentType}\n` +
            `🔗 Document ID: ${data.documentId}\n\n` +
            `กรุณาตรวจสอบและอนุมัติเอกสารผ่านระบบ Admin`,
    }

    return this.broadcast([message])
  }

  /**
   * Notify staff when document is verified
   * Requires staff's LINE User ID
   */
  async notifyStaffDocumentVerified(
    staffLineUserId: string,
    data: DocumentNotificationData
  ): Promise<boolean> {
    const message: LineMessage = {
      type: 'text',
      text: `✅ เอกสารได้รับการอนุมัติแล้ว!\n\n` +
            `📋 ประเภทเอกสาร: ${data.documentType}\n` +
            `👨‍💼 อนุมัติโดย: ${data.adminName || 'Admin'}\n` +
            `📅 วันที่: ${new Date().toLocaleDateString('th-TH')}\n\n` +
            `ขอบคุณที่ส่งเอกสาร เอกสารของคุณผ่านการตรวจสอบเรียบร้อยแล้ว`,
    }

    return this.pushMessage(staffLineUserId, [message])
  }

  /**
   * Notify staff when document is rejected
   * Requires staff's LINE User ID
   */
  async notifyStaffDocumentRejected(
    staffLineUserId: string,
    data: DocumentNotificationData
  ): Promise<boolean> {
    const message: LineMessage = {
      type: 'text',
      text: `❌ เอกสารถูกปฏิเสธ\n\n` +
            `📋 ประเภทเอกสาร: ${data.documentType}\n` +
            `⚠️ เหตุผล: ${data.rejectionReason || 'ไม่ระบุ'}\n` +
            `👨‍💼 ตรวจสอบโดย: ${data.adminName || 'Admin'}\n\n` +
            `กรุณาตรวจสอบและอัปโหลดเอกสารใหม่ผ่านระบบ\n` +
            `หากมีข้อสงสัย กรุณาติดต่อ Admin`,
    }

    return this.pushMessage(staffLineUserId, [message])
  }

  /**
   * Send custom message
   */
  async sendCustomMessage(
    to: string,
    message: string,
  ): Promise<boolean> {
    return this.pushMessage(to, [{
      type: 'text',
      text: message,
    }])
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
}

// Export singleton instance
export const lineMessagingService = new LineMessagingService()

// Export types
export type { DocumentNotificationData, LineMessage }
