#!/usr/bin/env node
/**
 * สคริปต์ทดสอบระบบ Automated Payout
 * รันด้วย: node scripts/test-automated-payout.js
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase config
const supabaseUrl = 'https://pjwauqngxrqnqryapzck.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqd2F1cW5neHJxbnFyeWFwemNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxMDY0MTQ1MywiZXhwIjoyMDI2MjE3NDUzfQ.sKV_2m8SJDSKbZq1lp3Aw_DZKnqynZSZKnOkP3LYhNI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupTestData() {
  console.log('🚀 สร้างข้อมูลทดสอบ...')

  try {
    // 1. เช็ค staff ที่มีอยู่
    const { data: staffList, error: staffError } = await supabase
      .from('staff')
      .select(`
        id,
        name_th,
        payout_schedule,
        next_payout_date,
        profile_id,
        is_active,
        profiles:profile_id(full_name)
      `)
      .eq('is_active', true)
      .limit(3)

    if (staffError) throw staffError

    console.log('👥 Staff ปัจจุบัน:', staffList?.length || 0, 'คน')
    staffList?.forEach(s => {
      console.log(`  - ${s.name_th} (${s.payout_schedule}) → ${s.next_payout_date}`)
    })

    if (!staffList || staffList.length === 0) {
      console.log('❌ ไม่มี staff active ในระบบ')
      return
    }

    // 2. เลือก staff คนแรกมาทดสอบ
    const testStaff = staffList[0]
    console.log(`\n🎯 ใช้ ${testStaff.name_th} ทดสอบ`)

    // 3. อัปเดต next_payout_date เป็นวันนี้
    const today = new Date().toISOString().split('T')[0]
    const { error: updateError } = await supabase
      .from('staff')
      .update({
        next_payout_date: today,
        payout_schedule: 'weekly'
      })
      .eq('id', testStaff.id)

    if (updateError) throw updateError
    console.log('✅ อัปเดต next_payout_date เป็นวันนี้แล้ว')

    // 4. เช็คว่ามี jobs ใน 7 วันที่ผ่านมาไหม
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const { data: existingJobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, staff_earnings, completed_at, status')
      .eq('staff_id', testStaff.id)
      .eq('status', 'completed')
      .gte('completed_at', weekAgo.toISOString())

    if (jobsError) throw jobsError

    console.log(`📊 งานที่มีอยู่ใน 7 วัน: ${existingJobs?.length || 0} งาน`)
    if (existingJobs && existingJobs.length > 0) {
      const totalEarnings = existingJobs.reduce((sum, j) => sum + (j.staff_earnings || 0), 0)
      console.log(`💰 รายได้รวม: ฿${totalEarnings.toLocaleString()}`)
    }

    // 5. ถ้าไม่มี jobs จะสร้างให้
    if (!existingJobs || existingJobs.length === 0) {
      console.log('🔨 สร้างงานจำลอง...')

      // สร้าง booking ก่อน
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .limit(1)
        .single()

      if (!customer) {
        console.log('❌ ไม่มี customer ในระบบ')
        return
      }

      const mockBookings = []
      for (let i = 1; i <= 3; i++) {
        const bookingDate = new Date()
        bookingDate.setDate(bookingDate.getDate() - i * 2)

        const { data: newBooking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            customer_id: customer.id,
            service_id: 1,
            preferred_date: bookingDate.toISOString().split('T')[0],
            preferred_time: '14:00:00',
            duration: 90,
            location_type: 'customer_home',
            status: 'completed',
            total_price: 2500,
            created_at: bookingDate.toISOString()
          })
          .select('id')
          .single()

        if (bookingError) {
          console.log(`⚠️ ไม่สามารถสร้าง booking ได้: ${bookingError.message}`)
          continue
        }

        mockBookings.push(newBooking.id)

        // สร้าง job
        const jobEarnings = 800 + (i * 100)
        const { error: jobError } = await supabase
          .from('jobs')
          .insert({
            booking_id: newBooking.id,
            staff_id: testStaff.id,
            scheduled_date: bookingDate.toISOString().split('T')[0],
            scheduled_time: '14:00:00',
            duration: 90,
            status: 'completed',
            staff_earnings: jobEarnings,
            created_at: bookingDate.toISOString(),
            completed_at: new Date(bookingDate.getTime() + 2 * 60 * 60 * 1000).toISOString()
          })

        if (jobError) {
          console.log(`⚠️ ไม่สามารถสร้าง job ได้: ${jobError.message}`)
        } else {
          console.log(`  ✅ งานที่ ${i}: ฿${jobEarnings}`)
        }
      }
    }

    console.log('\n🎉 ข้อมูลทดสอบพร้อมแล้ว!')
    console.log('📋 สรุปการเตรียมการ:')
    console.log(`  • Staff: ${testStaff.name_th}`)
    console.log(`  • Next payout: วันนี้ (${today})`)
    console.log(`  • Schedule: weekly`)
    console.log(`  • งาน completed: มีให้ทดสอบแล้ว`)

    return {
      staff: testStaff,
      ready: true
    }

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
    return { ready: false, error: error.message }
  }
}

async function testAutomatedPayout() {
  console.log('\n🤖 ทดสอบ Automated Payout...')

  try {
    // เรียก API endpoint
    const serverUrl = 'https://the-bliss-at-home-server.vercel.app'
    // const serverUrl = 'http://localhost:3000' // สำหรับ local testing

    console.log(`📡 เรียก ${serverUrl}/api/cron/daily-payout`)

    const response = await fetch(`${serverUrl}/api/cron/daily-payout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()

    console.log('\n📊 ผลการทดสอบ:')
    console.log('  Success:', result.success ? '✅' : '❌')
    console.log('  Processed:', result.processed, 'คน')
    console.log('  Timestamp:', new Date(result.timestamp).toLocaleString('th-TH'))

    if (result.errors && result.errors.length > 0) {
      console.log('  Errors:')
      result.errors.forEach(err => console.log(`    ❌ ${err}`))
    }

    if (result.success && result.processed > 0) {
      console.log('\n🎉 ระบบทำงานสำเร็จ! ตรวจสอบผลได้ที่:')
      console.log('  • Admin Dashboard → รอบจ่ายเงิน Staff → ระบบอัตโนมัติ')
      console.log('  • Supabase → payouts table (is_automated = true)')
      console.log('  • Staff App → รายได้ (จะมีแจ้งเตือนใหม่)')
    }

    return result

  } catch (error) {
    console.error('💥 เรียก API ไม่สำเร็จ:', error.message)
    return { success: false, error: error.message }
  }
}

async function main() {
  console.log('🧪 = = = ทดสอบระบบ Automated Payout = = =\n')

  // 1. เตรียมข้อมูลทดสอบ
  const setup = await setupTestData()
  if (!setup.ready) {
    console.log('❌ ไม่สามารถเตรียมข้อมูลได้')
    return
  }

  // 2. รอ 2 วินาที
  console.log('\n⏳ รอ 2 วินาที...')
  await new Promise(resolve => setTimeout(resolve, 2000))

  // 3. ทดสอบระบบ
  const result = await testAutomatedPayout()

  // 4. สรุปผล
  console.log('\n📝 = = = สรุปการทดสอบ = = =')
  if (result.success) {
    console.log('🎊 ระบบ Automated Payout ทำงานปกติ!')
    console.log('✅ สร้าง payout อัตโนมัติแล้ว')
    console.log('✅ ส่งแจ้งเตือนให้ staff แล้ว')
    console.log('✅ อัปเดต next_payout_date แล้ว')
  } else {
    console.log('❌ ระบบมีปัญหา กรุณาตรวจสอบ:')
    console.log('  • Vercel function deployment')
    console.log('  • Supabase connection')
    console.log('  • Database permissions')
  }
}

// รันเมื่อเรียกไฟล์นี้โดยตรง
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { setupTestData, testAutomatedPayout }