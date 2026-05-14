/**
 * Job Reminder Service
 * ส่ง reminder ให้ staff ก่อนงาน 3 วัน, 1 วัน, 2 ชั่วโมง
 */

import { getSupabaseClient } from '../lib/supabase.js'
import { lineService } from './lineService.js'

export type ReminderType = '3_days' | '1_day' | '2_hours'

export interface JobToRemind {
  jobId: string
  staffId: string
  staffName: string
  profileId: string
  lineUserId?: string
  customerName: string
  serviceName: string
  scheduledDate: string
  scheduledTime: string
  location: string
  duration: number
}

export interface ReminderMessage {
  title: string
  body: string
  altText: string
}

class ReminderService {
  /**
   * Main function รันทุกชั่วโมงเพื่อเช็ค reminders
   */
  async sendScheduledReminders() {
    const now = new Date()

    try {
      console.log('🔔 [Reminder] Checking for jobs needing reminders...')

      // หา jobs ที่ต้องส่ง reminder สำหรับแต่ละช่วงเวลา
      const [jobsFor3Days, jobsFor1Day, jobsFor2Hours] = await Promise.all([
        this.getJobsNeedingReminder(now, '3_days'),
        this.getJobsNeedingReminder(now, '1_day'),
        this.getJobsNeedingReminder(now, '2_hours')
      ])

      console.log(`📊 [Reminder] Found jobs: 3-days(${jobsFor3Days.length}), 1-day(${jobsFor1Day.length}), 2-hours(${jobsFor2Hours.length})`)

      // ส่ง reminders
      await Promise.all([
        this.sendReminders(jobsFor3Days, '3_days'),
        this.sendReminders(jobsFor1Day, '1_day'),
        this.sendReminders(jobsFor2Hours, '2_hours')
      ])

      console.log('✅ [Reminder] All reminders processed successfully')
    } catch (error) {
      console.error('❌ [Reminder] Error processing reminders:', error)
      throw error
    }
  }

  /**
   * หา jobs ที่ต้องส่ง reminder สำหรับ type ที่กำหนด
   */
  private async getJobsNeedingReminder(now: Date, type: ReminderType): Promise<JobToRemind[]> {
    const targetTime = this.calculateTargetTime(now, type)
    const supabase = getSupabaseClient()

    console.log(`🔍 [Reminder] Checking ${type} reminders for timeframe:`, targetTime)

    // Query basic jobs first
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, scheduled_date, scheduled_time, staff_id, booking_id')
      .eq('status', 'confirmed')
      .gte('scheduled_date', targetTime.startDate)
      .lte('scheduled_date', targetTime.endDate)
      .not('staff_id', 'is', null)

    if (error) {
      console.error(`❌ [Reminder] Error querying ${type} jobs:`, error)
      return []
    }

    if (!jobs || jobs.length === 0) {
      console.log(`📭 [Reminder] No ${type} jobs found`)
      return []
    }

    console.log(`📋 [Reminder] Found ${jobs.length} ${type} jobs to check`)

    // กรอง jobs ที่ยังไม่ได้ส่ง reminder type นี้ และดึงข้อมูลเพิ่มเติม
    const filteredJobs: JobToRemind[] = []

    for (const job of jobs) {
      const reminderSent = await this.hasReminderBeenSent(job.id, type)
      if (!reminderSent) {
        // Get staff info
        const { data: staff } = await supabase
          .from('staff')
          .select('id, name_th, profile_id')
          .eq('id', job.staff_id)
          .single()

        if (!staff) continue

        // Get profile info for LINE user ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('line_user_id')
          .eq('id', staff.profile_id)
          .single()

        // Get booking info
        const { data: booking } = await supabase
          .from('bookings')
          .select(`
            address, hotel_room_number, hotel_id, duration,
            customer:customer_id (full_name),
            service:service_id (name_th),
            hotel:hotel_id (name_th)
          `)
          .eq('id', job.booking_id)
          .single()

        if (!booking) continue

        const location = this.buildLocationText(booking)

        filteredJobs.push({
          jobId: job.id,
          staffId: staff.id,
          staffName: staff.name_th,
          profileId: staff.profile_id,
          lineUserId: profile?.line_user_id || null,
          customerName: (booking.customer as any)?.full_name || 'ลูกค้า',
          serviceName: (booking.service as any)?.name_th || 'บริการ',
          scheduledDate: job.scheduled_date,
          scheduledTime: job.scheduled_time,
          location,
          duration: booking.duration || 60
        })
      }
    }

    console.log(`📋 [Reminder] Filtered ${type} jobs: ${filteredJobs.length}/${jobs.length}`)
    return filteredJobs
  }

  /**
   * ส่ง reminders สำหรับ jobs ใน list
   */
  private async sendReminders(jobs: JobToRemind[], type: ReminderType) {
    if (jobs.length === 0) return

    console.log(`📤 [Reminder] Sending ${type} reminders to ${jobs.length} staff members`)

    for (const job of jobs) {
      try {
        await Promise.all([
          this.sendInAppNotification(job, type),
          this.sendLineNotification(job, type)
        ])

        // บันทึกว่าส่งแล้ว
        await this.recordReminderSent(job.jobId, job.staffId, type)

        console.log(`✅ [Reminder] Sent ${type} reminder for job ${job.jobId} to ${job.staffName}`)
      } catch (error) {
        console.error(`❌ [Reminder] Failed to send ${type} reminder for job ${job.jobId}:`, error)
      }
    }
  }

  /**
   * ส่ง in-app notification
   */
  private async sendInAppNotification(job: JobToRemind, type: ReminderType) {
    const message = this.buildInAppMessage(job, type)
    const supabase = getSupabaseClient()

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: job.profileId,
        type: 'job_reminder',
        title: message.title,
        message: message.body,
        data: {
          job_id: job.jobId,
          reminder_type: type,
          scheduled_date: job.scheduledDate,
          scheduled_time: job.scheduledTime
        },
        is_read: false
      })

    if (error) {
      console.error('[Reminder] Failed to send in-app notification:', error)
      throw error
    }
  }

  /**
   * ส่ง LINE notification
   */
  private async sendLineNotification(job: JobToRemind, type: ReminderType) {
    if (!job.lineUserId) {
      console.log(`[Reminder] No LINE ID for ${job.staffName}, skipping LINE notification`)
      return
    }

    const message = this.buildLineMessage(job, type)

    try {
      const staffAppUrl = process.env.STAFF_LIFF_URL || 'https://hollywood-camps-permissions-leave.trycloudflare.com'

      await lineService.pushMessage(job.lineUserId, [{
        type: 'template',
        altText: message.altText,
        template: {
          type: 'buttons',
          thumbnailImageUrl: 'https://your-domain.com/reminder-icon.png',
          imageAspectRatio: 'rectangle',
          imageSize: 'cover',
          title: message.title,
          text: message.body,
          actions: [
            {
              type: 'uri',
              label: '📱 ดูรายละเอียดงาน',
              uri: `${staffAppUrl}/jobs/${job.jobId}`
            },
            {
              type: 'uri',
              label: '🗺️ เส้นทาง',
              uri: `https://maps.google.com?q=${encodeURIComponent(job.location)}`
            }
          ]
        }
      }] as any)
    } catch (error) {
      console.error('[Reminder] Failed to send LINE notification:', error)
      // ไม่ throw error เพราะ in-app notification ยังส่งสำเร็จ
    }
  }

  /**
   * สร้าง message สำหรับ in-app notification
   */
  private buildInAppMessage(job: JobToRemind, type: ReminderType): ReminderMessage {
    const timeText = this.getTimeText(type)
    const datetime = `${this.formatThaiDate(job.scheduledDate)} เวลา ${job.scheduledTime}`

    return {
      title: `🔔 เตือนงาน${timeText}`,
      body: `งาน "${job.serviceName}" สำหรับคุณ ${job.customerName} ${datetime} ที่ ${job.location} (${job.duration} นาที)`,
      altText: `เตือนงาน${timeText}: ${job.serviceName}`
    }
  }

  /**
   * สร้าง message สำหรับ LINE notification
   */
  private buildLineMessage(job: JobToRemind, type: ReminderType): ReminderMessage {
    const timeText = this.getTimeText(type)
    const datetime = `${this.formatThaiDate(job.scheduledDate)} ${job.scheduledTime}`

    return {
      title: `🔔 เตือนงาน${timeText}`,
      body: `งาน: ${job.serviceName}\\nลูกค้า: ${job.customerName}\\nวันเวลา: ${datetime}\\nสถานที่: ${job.location}\\nระยะเวลา: ${job.duration} นาที`,
      altText: `เตือนงาน${timeText}: ${job.serviceName}`
    }
  }

  /**
   * คำนวณช่วงเวลาที่ต้องเช็ค based on reminder type
   */
  private calculateTargetTime(now: Date, type: ReminderType) {
    const target = new Date(now)

    switch (type) {
      case '3_days':
        target.setDate(target.getDate() + 3)
        return {
          startDate: target.toISOString().split('T')[0],
          endDate: target.toISOString().split('T')[0]
        }

      case '1_day':
        target.setDate(target.getDate() + 1)
        return {
          startDate: target.toISOString().split('T')[0],
          endDate: target.toISOString().split('T')[0]
        }

      case '2_hours':
        target.setHours(target.getHours() + 2)
        const start = new Date(target.getTime() - (30 * 60 * 1000)) // 30 นาทีก่อนหน้า
        const end = new Date(target.getTime() + (30 * 60 * 1000))   // 30 นาทีหลัง
        return {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0]
        }

      default:
        throw new Error(`Unknown reminder type: ${type}`)
    }
  }

  /**
   * เช็คว่า reminder ถูกส่งไปแล้วหรือยัง
   */
  private async hasReminderBeenSent(jobId: string, type: ReminderType): Promise<boolean> {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('job_reminders')
      .select('id')
      .eq('job_id', jobId)
      .eq('reminder_type', type)
      .limit(1)
      .single()

    return !!data && !error
  }

  /**
   * บันทึกว่าส่ง reminder แล้ว
   */
  private async recordReminderSent(jobId: string, staffId: string, type: ReminderType) {
    const supabase = getSupabaseClient()

    const { error } = await supabase
      .from('job_reminders')
      .insert({
        job_id: jobId,
        staff_id: staffId,
        reminder_type: type,
        sent_via: 'both'
      })

    if (error) {
      console.error('[Reminder] Failed to record reminder:', error)
      // ไม่ throw เพราะส่ง notification สำเร็จแล้ว
    }
  }

  /**
   * Helper functions
   */
  private getTimeText(type: ReminderType): string {
    switch (type) {
      case '3_days': return 'อีก 3 วัน'
      case '1_day': return 'พรุ่งนี้'
      case '2_hours': return 'อีก 2 ชั่วโมง'
      default: return ''
    }
  }

  private formatThaiDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  private buildLocationText(booking: any): string {
    if (booking.hotel?.name_th) {
      const room = booking.hotel_room_number ? ` ห้อง ${booking.hotel_room_number}` : ''
      return `${booking.hotel.name_th}${room}`
    }
    return booking.address || 'ที่อยู่ลูกค้า'
  }
}

export const reminderService = new ReminderService()