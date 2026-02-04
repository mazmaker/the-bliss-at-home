/**
 * SMS Service
 * Handles SMS sending via Twilio
 */

import twilio from 'twilio'

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID || '',
  process.env.TWILIO_AUTH_TOKEN || ''
)

const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || ''

/**
 * Format phone number to E.164 format (+66...)
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '')

  // If starts with 0, replace with +66
  if (cleaned.startsWith('0')) {
    return `+66${cleaned.slice(1)}`
  }

  // If already starts with 66, add +
  if (cleaned.startsWith('66')) {
    return `+${cleaned}`
  }

  // Otherwise assume it's already formatted or add +66
  return cleaned.startsWith('+') ? cleaned : `+66${cleaned}`
}

/**
 * Send OTP SMS
 */
export async function sendOTP(phoneNumber: string, code: string): Promise<boolean> {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber)

    // In development mode, just log the OTP
    if (process.env.NODE_ENV === 'development') {
      console.log(`📱 [DEV MODE] SMS to ${formattedPhone}:`)
      console.log(`   OTP Code: ${code}`)
      console.log(`   Message: Your verification code is ${code}. Valid for 5 minutes.`)
      return true
    }

    // Send actual SMS via Twilio in production
    const message = await client.messages.create({
      body: `Your verification code is ${code}. Valid for 5 minutes. - The Bliss At Home`,
      from: TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    })

    console.log(`✅ SMS sent successfully to ${formattedPhone}. SID: ${message.sid}`)
    return true
  } catch (error: any) {
    console.error('SMS sending error:', error)
    throw new Error(error.message || 'Failed to send SMS')
  }
}

/**
 * Send booking confirmation SMS
 */
export async function sendBookingConfirmation(
  phoneNumber: string,
  bookingNumber: string,
  serviceName: string,
  dateTime: string
): Promise<boolean> {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber)

    const message = `Booking confirmed! ${bookingNumber}\n${serviceName}\n${dateTime}\nThank you - The Bliss At Home`

    // In development mode, just log
    if (process.env.NODE_ENV === 'development') {
      console.log(`📱 [DEV MODE] SMS to ${formattedPhone}:`)
      console.log(`   ${message}`)
      return true
    }

    // Send actual SMS via Twilio
    const sms = await client.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    })

    console.log(`✅ Booking confirmation sent to ${formattedPhone}. SID: ${sms.sid}`)
    return true
  } catch (error: any) {
    console.error('SMS sending error:', error)
    throw new Error(error.message || 'Failed to send SMS')
  }
}

export const smsService = {
  sendOTP,
  sendBookingConfirmation,
  formatPhoneNumber,
}
