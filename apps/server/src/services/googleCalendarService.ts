/**
 * Google Calendar Service
 * Creates/updates/deletes calendar events for hotel credit due dates
 *
 * Prerequisites:
 * 1. Google Cloud project with Calendar API enabled
 * 2. Service Account with JSON key
 * 3. Google Calendar shared with Service Account email
 *
 * Environment variables:
 * - GOOGLE_CALENDAR_ID: Calendar ID (e.g., xxx@group.calendar.google.com)
 * - GOOGLE_SERVICE_ACCOUNT_KEY: Base64-encoded Service Account JSON key
 */

import { google, calendar_v3 } from 'googleapis'
import { getSupabaseClient } from '../lib/supabase.js'

// ============================================
// Configuration
// ============================================

// Cache settings from DB
let cachedDbConfig: { calendarId: string; serviceAccountKey: string } | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getConfigFromDb(): Promise<{ calendarId: string; serviceAccountKey: string }> {
  const now = Date.now()
  if (cachedDbConfig && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedDbConfig
  }

  try {
    const supabase = getSupabaseClient()
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['google_calendar_id', 'google_service_account_key'])

    const map = Object.fromEntries((data || []).map(s => [s.key, typeof s.value === 'string' ? s.value : '']))
    cachedDbConfig = {
      calendarId: map.google_calendar_id || '',
      serviceAccountKey: map.google_service_account_key || '',
    }
    cacheTimestamp = now
    return cachedDbConfig
  } catch {
    return { calendarId: '', serviceAccountKey: '' }
  }
}

async function getConfig() {
  // Env vars take priority, fallback to DB settings
  const envCalendarId = process.env.GOOGLE_CALENDAR_ID || ''
  const envKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || ''

  if (envCalendarId && envKey) {
    return { calendarId: envCalendarId, serviceAccountKey: envKey }
  }

  const dbConfig = await getConfigFromDb()
  return {
    calendarId: envCalendarId || dbConfig.calendarId,
    serviceAccountKey: envKey || dbConfig.serviceAccountKey,
  }
}

async function isConfigured(): Promise<boolean> {
  const config = await getConfig()
  return !!(config.calendarId && config.serviceAccountKey)
}

// ============================================
// Auth
// ============================================

let cachedCalendar: calendar_v3.Calendar | null = null
let cachedKeyHash: string | null = null

async function getCalendarClient(): Promise<calendar_v3.Calendar | null> {
  const config = await getConfig()
  if (!config.calendarId || !config.serviceAccountKey) {
    return null
  }

  // Reuse cached client if key hasn't changed
  if (cachedCalendar && cachedKeyHash === config.serviceAccountKey.slice(0, 20)) {
    return cachedCalendar
  }

  try {
    // Decode base64 service account key
    const keyJson = JSON.parse(Buffer.from(config.serviceAccountKey, 'base64').toString('utf-8'))

    const auth = new google.auth.GoogleAuth({
      credentials: keyJson,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })

    cachedCalendar = google.calendar({ version: 'v3', auth })
    cachedKeyHash = config.serviceAccountKey.slice(0, 20)
    return cachedCalendar
  } catch (err) {
    console.error('[GoogleCalendar] Failed to initialize:', err)
    return null
  }
}

// ============================================
// Event Management
// ============================================

export interface CreditDueEventData {
  hotelId: string
  hotelName: string
  dueDate: Date
  totalOutstanding: number
  billNumbers: string[]
  period?: string
}

/**
 * Create a credit due event on Google Calendar
 */
export async function createCreditDueEvent(data: CreditDueEventData): Promise<string | null> {
  const calendar = await getCalendarClient()
  if (!calendar) {
    console.log('[GoogleCalendar] Not configured, skipping event creation')
    return null
  }

  const config = await getConfig()
  const eventId = `credit-${data.hotelId.replace(/-/g, '').slice(0, 20)}-${data.dueDate.toISOString().slice(0, 10).replace(/-/g, '')}`

  // Check if event already exists
  try {
    const existing = await calendar.events.get({
      calendarId: config.calendarId,
      eventId,
    })
    if (existing.data) {
      console.log(`[GoogleCalendar] Event already exists: ${eventId}`)
      return eventId
    }
  } catch {
    // Event doesn't exist, proceed to create
  }

  const billInfo = data.billNumbers.length > 0
    ? `\nเลขที่บิล: ${data.billNumbers.join(', ')}`
    : ''

  const periodInfo = data.period ? `\nช่วงเวลา: ${data.period}` : ''

  try {
    const event = await calendar.events.insert({
      calendarId: config.calendarId,
      requestBody: {
        id: eventId,
        summary: `💰 ครบกำหนดชำระ: ${data.hotelName}`,
        description: `ยอดค้างชำระ: ฿${data.totalOutstanding.toLocaleString()}${billInfo}${periodInfo}\n\nHotel ID: ${data.hotelId}`,
        start: {
          dateTime: new Date(data.dueDate.getFullYear(), data.dueDate.getMonth(), data.dueDate.getDate(), 9, 0).toISOString(),
          timeZone: 'Asia/Bangkok',
        },
        end: {
          dateTime: new Date(data.dueDate.getFullYear(), data.dueDate.getMonth(), data.dueDate.getDate(), 10, 0).toISOString(),
          timeZone: 'Asia/Bangkok',
        },
        colorId: data.totalOutstanding > 0 ? '11' : '10', // 11=red, 10=green
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 24 * 60 }, // 1 day before
            { method: 'email', minutes: 24 * 60 },
          ],
        },
      },
    })

    console.log(`[GoogleCalendar] Event created: ${event.data.id} for ${data.hotelName}`)
    return event.data.id || eventId
  } catch (err) {
    console.error(`[GoogleCalendar] Failed to create event for ${data.hotelName}:`, err)
    return null
  }
}

/**
 * Update event color/description when payment status changes
 */
export async function updateCreditDueEvent(
  hotelId: string,
  dueDate: Date,
  status: 'paid' | 'overdue' | 'pending'
): Promise<boolean> {
  const calendar = await getCalendarClient()
  if (!calendar) return false

  const config = await getConfig()
  const eventId = `credit-${hotelId.replace(/-/g, '').slice(0, 20)}-${dueDate.toISOString().slice(0, 10).replace(/-/g, '')}`

  const colorMap: Record<string, string> = {
    paid: '10',    // green
    overdue: '11', // red
    pending: '5',  // yellow/amber
  }

  const statusLabels: Record<string, string> = {
    paid: '✅ จ่ายแล้ว',
    overdue: '🔴 เลยกำหนด',
    pending: '🟡 รอชำระ',
  }

  try {
    await calendar.events.patch({
      calendarId: config.calendarId,
      eventId,
      requestBody: {
        colorId: colorMap[status],
        summary: `${statusLabels[status]} ${status === 'paid' ? '(จ่ายแล้ว)' : ''}: ครบกำหนดชำระ`,
      },
    })

    console.log(`[GoogleCalendar] Event updated: ${eventId} → ${status}`)
    return true
  } catch (err) {
    console.error(`[GoogleCalendar] Failed to update event ${eventId}:`, err)
    return false
  }
}

/**
 * Delete a credit due event
 */
export async function deleteCreditDueEvent(hotelId: string, dueDate: Date): Promise<boolean> {
  const calendar = await getCalendarClient()
  if (!calendar) return false

  const config = await getConfig()
  const eventId = `credit-${hotelId.replace(/-/g, '').slice(0, 20)}-${dueDate.toISOString().slice(0, 10).replace(/-/g, '')}`

  try {
    await calendar.events.delete({
      calendarId: config.calendarId,
      eventId,
    })

    console.log(`[GoogleCalendar] Event deleted: ${eventId}`)
    return true
  } catch (err) {
    console.error(`[GoogleCalendar] Failed to delete event ${eventId}:`, err)
    return false
  }
}

// ============================================
// Export
// ============================================

export const googleCalendarService = {
  isConfigured,
  createCreditDueEvent,
  updateCreditDueEvent,
  deleteCreditDueEvent,
}
