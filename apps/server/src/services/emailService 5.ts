/**
 * Email Service for The Bliss at Home
 * Handles email sending for hotel invitations and password resets
 */

import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

export interface EmailTemplate {
  subject: string
  html: string
  text?: string
}

export interface HotelInvitationData {
  hotelName: string
  loginEmail: string
  temporaryPassword: string
  loginUrl: string
  adminName?: string
}

export interface PasswordResetData {
  hotelName: string
  loginEmail: string
  resetUrl: string
  expiresIn: string
}

class EmailService {
  private transporter: Transporter | null = null
  private isConfigured: boolean = false

  constructor() {
    // Don't initialize immediately - do it lazily when needed
    console.log('📧 Email service created (will initialize on first use)')
  }

  /**
   * Initialize email transporter based on environment variables
   */
  private async initialize(): Promise<void> {
    try {
      const emailProvider = process.env.EMAIL_PROVIDER || 'gmail'

      switch (emailProvider) {
        case 'gmail':
          this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.GMAIL_USER,
              pass: process.env.GMAIL_APP_PASSWORD, // Gmail App Password
            },
          })
          break

        case 'sendgrid':
          this.transporter = nodemailer.createTransport({
            service: 'SendGrid',
            auth: {
              user: 'apikey',
              pass: process.env.SENDGRID_API_KEY,
            },
          })
          break

        case 'smtp':
          this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            },
          })
          break

        case 'test':
          // Test mode - generate ethereal email account
          console.log('🧪 Creating test email account...')
          const testAccount = await nodemailer.createTestAccount()

          this.transporter = nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          })

          console.log('📧 ✅ Test email account created!')
          console.log(`   👤 User: ${testAccount.user}`)
          console.log(`   🔐 Pass: ${testAccount.pass}`)
          console.log(`   🌐 View emails at: https://ethereal.email`)
          break

        default:
          throw new Error(`Unsupported email provider: ${emailProvider}`)
      }

      // Verify connection
      if (this.transporter) {
        await this.transporter.verify()
        this.isConfigured = true
        console.log('✅ Email service initialized successfully')
      }
    } catch (error) {
      console.error('❌ Email service initialization failed:', error)
      this.isConfigured = false
    }
  }

  /**
   * Send hotel invitation email
   */
  async sendHotelInvitation(
    toEmail: string,
    data: HotelInvitationData
  ): Promise<void> {
    // Initialize email service if not already done
    if (!this.isConfigured || !this.transporter) {
      await this.initialize()
    }

    if (!this.isConfigured || !this.transporter) {
      throw new Error('Email service not configured')
    }

    const template = this.generateHotelInvitationTemplate(data)

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@theblissathome.com',
      to: toEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    }

    try {
      const result = await this.transporter.sendMail(mailOptions)
      console.log(`✅ Hotel invitation sent to ${toEmail}:`, result.messageId)
    } catch (error) {
      console.error(`❌ Failed to send hotel invitation to ${toEmail}:`, error)
      throw error
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(
    toEmail: string,
    data: PasswordResetData
  ): Promise<void> {
    if (!this.isConfigured || !this.transporter) {
      throw new Error('Email service not configured')
    }

    const template = this.generatePasswordResetTemplate(data)

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@theblissathome.com',
      to: toEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    }

    try {
      const result = await this.transporter.sendMail(mailOptions)
      console.log(`✅ Password reset sent to ${toEmail}:`, result.messageId)
    } catch (error) {
      console.error(`❌ Failed to send password reset to ${toEmail}:`, error)
      throw error
    }
  }

  /**
   * Generate hotel invitation email template
   */
  private generateHotelInvitationTemplate(data: HotelInvitationData): EmailTemplate {
    const { hotelName, loginEmail, temporaryPassword, loginUrl, adminName } = data

    const subject = `🏨 เชิญเข้าร่วมระบบ The Bliss at Home - ${hotelName}`

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>เชิญเข้าร่วมระบบ The Bliss at Home</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ec4899, #8b5cf6); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px 20px; }
          .card { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 20px 0; }
          .credentials { background: #fef3c7; border: 1px solid #fbbf24; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .btn { display: inline-block; background: #ec4899; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .footer { background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; }
          .warning { color: #dc2626; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏨 ยินดีต้อนรับสู่ The Bliss at Home</h1>
            <p>ระบบจัดการโรงแรมพาร์ทเนอร์</p>
          </div>

          <div class="content">
            <div class="card">
              <h2>สวัสดีคะ ${hotelName}</h2>
              <p>ทีมงาน The Bliss at Home ยินดีที่ได้เชิญคุณเข้าร่วมเป็นพาร์ทเนอร์กับเรา! 🎉</p>
              <p>ตอนนี้คุณสามารถเข้าสู่ระบบจัดการโรงแรมของเราได้แล้ว เพื่อ:</p>
              <ul>
                <li>📋 จัดการการจองและรายการบริการ</li>
                <li>💰 ดูรายได้และสถิติ</li>
                <li>📊 ติดตามประสิทธิภาพโรงแรม</li>
                <li>⚙️ จัดการข้อมูลโรงแรม</li>
              </ul>
            </div>

            <div class="credentials">
              <h3>🔑 ข้อมูลการเข้าสู่ระบบ</h3>
              <p><strong>อีเมล:</strong> ${loginEmail}</p>
              <p><strong>รหัสผ่านชั่วคราว:</strong> <code>${temporaryPassword}</code></p>
              <p class="warning">⚠️ คุณจะต้องเปลี่ยนรหัสผ่านในการล็อกอินครั้งแรก</p>
            </div>

            <div style="text-align: center;">
              <a href="${loginUrl}" class="btn">เข้าสู่ระบบตอนนี้</a>
            </div>

            <div class="card">
              <h3>📖 ขั้นตอนการเริ่มต้น</h3>
              <ol>
                <li>คลิกปุ่ม "เข้าสู่ระบบตอนนี้" ด้านบน</li>
                <li>ใส่อีเมลและรหัสผ่านชั่วคราว</li>
                <li>ตั้งรหัสผ่านใหม่ตามความต้องการ</li>
                <li>เริ่มใช้งานระบบได้เลย!</li>
              </ol>
            </div>
          </div>

          <div class="footer">
            <p>หากมีคำถามหรือต้องการความช่วยเหลือ โปรดติดต่อทีมงานของเรา</p>
            <p>📞 02-123-4567 | 📧 support@theblissathome.com</p>
            <p style="margin-top: 15px; opacity: 0.8;">
              อีเมลนี้ส่งโดย The Bliss at Home${adminName ? ` โดย ${adminName}` : ''}
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    const text = `
เชิญเข้าร่วมระบบ The Bliss at Home

สวัสดี ${hotelName},

ยินดีต้อนรับสู่ The Bliss at Home! คุณสามารถเข้าสู่ระบบได้ด้วยข้อมูลต่อไปนี้:

อีเมล: ${loginEmail}
รหัสผ่านชั่วคราว: ${temporaryPassword}

เข้าสู่ระบบที่: ${loginUrl}

⚠️ คุณจะต้องเปลี่ยนรหัสผ่านในการล็อกอินครั้งแรก

ขั้นตอนการเริ่มต้น:
1. ไปที่ลิงค์เข้าสู่ระบบ
2. ใส่อีเมลและรหัสผ่านชั่วคราว
3. ตั้งรหัสผ่านใหม่
4. เริ่มใช้งานระบบ

หากมีปัญหาโปรดติดต่อ: support@theblissathome.com
    `

    return { subject, html, text }
  }

  /**
   * Generate password reset email template
   */
  private generatePasswordResetTemplate(data: PasswordResetData): EmailTemplate {
    const { hotelName, loginEmail, resetUrl, expiresIn } = data

    const subject = `🔑 รีเซ็ตรหัสผ่าน - ${hotelName}`

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>รีเซ็ตรหัสผ่าน</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ec4899, #8b5cf6); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px 20px; }
          .card { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 20px 0; }
          .btn { display: inline-block; background: #dc2626; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          .footer { background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; }
          .warning { color: #dc2626; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔑 รีเซ็ตรหัสผ่าน</h1>
            <p>The Bliss at Home</p>
          </div>

          <div class="content">
            <div class="card">
              <h2>สวัสดีคะ ${hotelName}</h2>
              <p>เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชี: <strong>${loginEmail}</strong></p>
              <p>หากคุณเป็นผู้ขอรีเซ็ตรหัสผ่าน โปรดคลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่</p>
            </div>

            <div style="text-align: center;">
              <a href="${resetUrl}" class="btn">รีเซ็ตรหัสผ่าน</a>
            </div>

            <div class="card">
              <p class="warning">⚠️ ลิงค์นี้จะหมดอายุใน ${expiresIn}</p>
              <p>หากคุณไม่ได้เป็นผู้ขอรีเซ็ตรหัสผ่าน โปรดเพิกเฉยอีเมลนี้</p>
              <p>รหัสผ่านของคุณจะไม่มีการเปลี่ยนแปลงหากคุณไม่คลิกลิงค์ด้านบน</p>
            </div>
          </div>

          <div class="footer">
            <p>หากมีคำถามโปรดติดต่อทีมงาน</p>
            <p>📧 support@theblissathome.com</p>
          </div>
        </div>
      </body>
      </html>
    `

    const text = `
รีเซ็ตรหัสผ่าน - ${hotelName}

สวัสดี,

เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชี: ${loginEmail}

รีเซ็ตรหัสผ่านที่: ${resetUrl}

⚠️ ลิงค์นี้จะหมดอายุใน ${expiresIn}

หากคุณไม่ได้เป็นผู้ขอรีเซ็ต โปรดเพิกเฉยอีเมลนี้

ติดต่อเรา: support@theblissathome.com
    `

    return { subject, html, text }
  }

  /**
   * Check if email service is configured and ready
   */
  isReady(): boolean {
    return this.isConfigured && this.transporter !== null
  }
}

// Export singleton instance
export const emailService = new EmailService()
export default emailService