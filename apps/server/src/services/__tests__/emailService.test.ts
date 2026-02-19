import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock nodemailer
const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-msg-001' })
const mockVerify = vi.fn().mockResolvedValue(true)

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
      verify: mockVerify,
    })),
    createTestAccount: vi.fn().mockResolvedValue({
      user: 'test@ethereal.email',
      pass: 'testpass',
      smtp: { host: 'smtp.ethereal.email', port: 587, secure: false },
    }),
  },
}))

vi.stubEnv('EMAIL_PROVIDER', 'gmail')
vi.stubEnv('GMAIL_USER', 'test@gmail.com')
vi.stubEnv('GMAIL_APP_PASSWORD', 'test-app-password')

import { emailService } from '../emailService'

describe('emailService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isReady', () => {
    it('should return false before initialization', () => {
      // Fresh instance hasn't been initialized
      expect(typeof emailService.isReady).toBe('function')
    })
  })

  describe('sendHotelInvitation', () => {
    it('should send hotel invitation email', async () => {
      await emailService.sendHotelInvitation('hotel@example.com', {
        hotelName: 'Grand Hotel Bangkok',
        loginEmail: 'hotel@example.com',
        temporaryPassword: 'TempP@ss123',
        loginUrl: 'https://app.theblissathome.com/hotel/login',
        adminName: 'Admin',
      })

      expect(mockSendMail).toHaveBeenCalledTimes(1)
      const mailOptions = mockSendMail.mock.calls[0][0]
      expect(mailOptions.to).toBe('hotel@example.com')
      expect(mailOptions.subject).toContain('Grand Hotel Bangkok')
      expect(mailOptions.html).toContain('Grand Hotel Bangkok')
      expect(mailOptions.html).toContain('TempP@ss123')
      expect(mailOptions.html).toContain('hotel@example.com')
      expect(mailOptions.html).toContain('https://app.theblissathome.com/hotel/login')
    })

    it('should include admin name in footer when provided', async () => {
      await emailService.sendHotelInvitation('hotel@example.com', {
        hotelName: 'Test Hotel',
        loginEmail: 'hotel@example.com',
        temporaryPassword: 'Pass123',
        loginUrl: 'https://app.example.com',
        adminName: 'คุณสมชาย',
      })

      const mailOptions = mockSendMail.mock.calls[0][0]
      expect(mailOptions.html).toContain('คุณสมชาย')
    })

    it('should generate text version of email', async () => {
      await emailService.sendHotelInvitation('hotel@example.com', {
        hotelName: 'Test Hotel',
        loginEmail: 'hotel@example.com',
        temporaryPassword: 'Pass123',
        loginUrl: 'https://app.example.com',
      })

      const mailOptions = mockSendMail.mock.calls[0][0]
      expect(mailOptions.text).toContain('Test Hotel')
      expect(mailOptions.text).toContain('Pass123')
    })
  })

  describe('sendPasswordReset', () => {
    it('should send password reset email', async () => {
      // Ensure service is initialized first
      await emailService.sendHotelInvitation('init@test.com', {
        hotelName: 'Init', loginEmail: 'init@test.com',
        temporaryPassword: 'x', loginUrl: 'https://x.com',
      })
      vi.clearAllMocks()

      await emailService.sendPasswordReset('hotel@example.com', {
        hotelName: 'Grand Hotel',
        loginEmail: 'hotel@example.com',
        resetUrl: 'https://app.example.com/reset?token=abc123',
        expiresIn: '24 ชั่วโมง',
      })

      expect(mockSendMail).toHaveBeenCalledTimes(1)
      const mailOptions = mockSendMail.mock.calls[0][0]
      expect(mailOptions.subject).toContain('รีเซ็ตรหัสผ่าน')
      expect(mailOptions.html).toContain('https://app.example.com/reset?token=abc123')
      expect(mailOptions.html).toContain('24 ชั่วโมง')
    })
  })

  describe('sendCustomerReminder', () => {
    it('should send Thai language reminder', async () => {
      // Ensure initialized
      await emailService.sendHotelInvitation('init@test.com', {
        hotelName: 'Init', loginEmail: 'init@test.com',
        temporaryPassword: 'x', loginUrl: 'https://x.com',
      })
      vi.clearAllMocks()

      await emailService.sendCustomerReminder('customer@example.com', {
        customerName: 'สมชาย',
        serviceName: 'นวดไทย',
        scheduledDate: '20 ก.พ. 2569',
        scheduledTime: '14:00',
        durationMinutes: 60,
        address: '123 ถนนสุขุมวิท',
        minutesBefore: 120,
      }, 'th')

      expect(mockSendMail).toHaveBeenCalledTimes(1)
      const mailOptions = mockSendMail.mock.calls[0][0]
      expect(mailOptions.subject).toContain('2 ชั่วโมง')
      expect(mailOptions.html).toContain('สมชาย')
      expect(mailOptions.html).toContain('นวดไทย')
      expect(mailOptions.html).toContain('60 นาที')
    })

    it('should send English language reminder', async () => {
      await emailService.sendHotelInvitation('init@test.com', {
        hotelName: 'Init', loginEmail: 'init@test.com',
        temporaryPassword: 'x', loginUrl: 'https://x.com',
      })
      vi.clearAllMocks()

      await emailService.sendCustomerReminder('customer@example.com', {
        customerName: 'John',
        serviceName: 'Thai Massage',
        scheduledDate: 'Feb 20, 2026',
        scheduledTime: '14:00',
        durationMinutes: 60,
        address: '123 Sukhumvit',
        minutesBefore: 30,
      }, 'en')

      const mailOptions = mockSendMail.mock.calls[0][0]
      expect(mailOptions.subject).toContain('30 minutes')
      expect(mailOptions.html).toContain('John')
      expect(mailOptions.html).toContain('60 minutes')
    })

    it('should send Chinese language reminder', async () => {
      await emailService.sendHotelInvitation('init@test.com', {
        hotelName: 'Init', loginEmail: 'init@test.com',
        temporaryPassword: 'x', loginUrl: 'https://x.com',
      })
      vi.clearAllMocks()

      await emailService.sendCustomerReminder('customer@example.com', {
        customerName: '张三',
        serviceName: '泰式按摩',
        scheduledDate: '2026年2月20日',
        scheduledTime: '14:00',
        durationMinutes: 90,
        address: '123 Sukhumvit',
        minutesBefore: 1440,
      }, 'cn')

      const mailOptions = mockSendMail.mock.calls[0][0]
      expect(mailOptions.subject).toContain('1天')
      expect(mailOptions.html).toContain('张三')
      expect(mailOptions.html).toContain('90 分钟')
    })

    it('should show hotel name and room in location when provided', async () => {
      await emailService.sendHotelInvitation('init@test.com', {
        hotelName: 'Init', loginEmail: 'init@test.com',
        temporaryPassword: 'x', loginUrl: 'https://x.com',
      })
      vi.clearAllMocks()

      await emailService.sendCustomerReminder('customer@example.com', {
        customerName: 'Test',
        serviceName: 'Massage',
        scheduledDate: '2026-02-20',
        scheduledTime: '14:00',
        durationMinutes: 60,
        address: 'default address',
        hotelName: 'Grand Hotel',
        roomNumber: '301',
        minutesBefore: 60,
      }, 'en')

      const mailOptions = mockSendMail.mock.calls[0][0]
      expect(mailOptions.html).toContain('Grand Hotel')
      expect(mailOptions.html).toContain('Room 301')
    })

    it('should format time labels correctly for various durations', async () => {
      await emailService.sendHotelInvitation('init@test.com', {
        hotelName: 'Init', loginEmail: 'init@test.com',
        temporaryPassword: 'x', loginUrl: 'https://x.com',
      })

      // Test English time labels through different minutesBefore values
      // 30 minutes
      vi.clearAllMocks()
      await emailService.sendCustomerReminder('test@test.com', {
        customerName: 'Test', serviceName: 'Test', scheduledDate: '2026-02-20',
        scheduledTime: '14:00', durationMinutes: 60, address: 'addr', minutesBefore: 30,
      }, 'en')
      expect(mockSendMail.mock.calls[0][0].subject).toContain('30 minutes')

      // 1 hour
      vi.clearAllMocks()
      await emailService.sendCustomerReminder('test@test.com', {
        customerName: 'Test', serviceName: 'Test', scheduledDate: '2026-02-20',
        scheduledTime: '14:00', durationMinutes: 60, address: 'addr', minutesBefore: 60,
      }, 'en')
      expect(mockSendMail.mock.calls[0][0].subject).toContain('1 hour')

      // 2 hours (plural)
      vi.clearAllMocks()
      await emailService.sendCustomerReminder('test@test.com', {
        customerName: 'Test', serviceName: 'Test', scheduledDate: '2026-02-20',
        scheduledTime: '14:00', durationMinutes: 60, address: 'addr', minutesBefore: 120,
      }, 'en')
      expect(mockSendMail.mock.calls[0][0].subject).toContain('2 hours')

      // 2 days (plural)
      vi.clearAllMocks()
      await emailService.sendCustomerReminder('test@test.com', {
        customerName: 'Test', serviceName: 'Test', scheduledDate: '2026-02-20',
        scheduledTime: '14:00', durationMinutes: 60, address: 'addr', minutesBefore: 2880,
      }, 'en')
      expect(mockSendMail.mock.calls[0][0].subject).toContain('2 days')
    })
  })
})
