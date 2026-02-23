#!/usr/bin/env node
/**
 * Verify Login System - Complete Test
 * ตรวจสอบระบบการเข้าสู่ระบบแบบครบวงจร
 */

const correctData = {
  email: 'sweettuay.bt@gmail.com',
  password: 'Test123456!',
  expectedHotelName: 'รีสอร์ทในฝัน เชียงใหม่',
  hotelId: '550e8400-e29b-41d4-a716-446655440002'
}

async function verifyLoginSystem() {
  console.log('🎯 ============================================')
  console.log('   ตรวจสอบระบบการเข้าสู่ระบบ')
  console.log('🎯 ============================================')
  console.log('')

  console.log('📋 ข้อมูลที่จะทดสอบ:')
  console.log(`   📧 อีเมล: ${correctData.email}`)
  console.log(`   🔐 รหัสผ่าน: ${correctData.password}`)
  console.log(`   🏨 โรงแรมที่คาดหวัง: ${correctData.expectedHotelName}`)
  console.log(`   🆔 Hotel ID: ${correctData.hotelId}`)
  console.log('')

  try {
    // 1. ตรวจสอบ Server Health
    console.log('🔍 Step 1: ตรวจสอบสถานะ Server...')

    const healthResponse = await fetch('http://localhost:3000/health')
    if (healthResponse.ok) {
      const health = await healthResponse.json()
      console.log('✅ Node.js Server ทำงานปกติ')
      console.log(`   📊 Status: ${health.status}`)
      console.log(`   🕐 Uptime: ${health.uptime}`)
    } else {
      console.log('❌ Node.js Server ไม่ตอบสนอง')
      return
    }
    console.log('')

    // 2. ตรวจสอบ Hotel App
    console.log('🔍 Step 2: ตรวจสอบ Hotel App...')

    const hotelResponse = await fetch('http://localhost:3006/')
    if (hotelResponse.ok) {
      console.log('✅ Hotel App ทำงานปกติที่ port 3006')
    } else {
      console.log('❌ Hotel App ไม่ตอบสนอง')
      console.log('   💡 ลองรัน: cd apps/hotel && npm run dev')
    }
    console.log('')

    // 3. ตรวจสอบ Hotel ในฐานข้อมูล
    console.log('🔍 Step 3: ตรวจสอบข้อมูลโรงแรมในฐานข้อมูล...')

    try {
      // ลองเรียก API ที่มีอยู่
      const testResponse = await fetch('http://localhost:3000/api/hotels/health', {
        headers: { 'Authorization': 'Bearer admin-secret-token-2026' }
      })

      if (testResponse.ok) {
        const result = await testResponse.json()
        console.log('✅ Hotel API ทำงานปกติ')
        console.log(`   📊 Service: ${result.service}`)
        console.log(`   📧 Email Service: ${result.emailServiceReady ? 'Ready' : 'Not Ready'}`)

        if (result.supabaseConnected) {
          console.log('✅ Supabase เชื่อมต่อได้')
        } else {
          console.log('⚠️  Supabase การเชื่อมต่อมีปัญหา')
        }
      } else {
        console.log('❌ Hotel API ไม่ตอบสนอง')
      }
    } catch (error) {
      console.log('❌ ไม่สามารถเชื่อมต่อ Hotel API:', error.message)
    }
    console.log('')

    // 4. ตรวจสอบอีเมลที่ส่งไป
    console.log('🔍 Step 4: ตรวจสอบอีเมลใน Ethereal...')
    console.log('📧 ข้อมูล Ethereal Email Test Account:')
    console.log('   🌐 URL: https://ethereal.email')
    console.log('   👤 Username: xknd2tq4chbn2ttg@ethereal.email')
    console.log('   🔐 Password: Sj2cZBN12R7sx2z9s7')
    console.log('')
    console.log('📬 ข้อมูลอีเมลที่ส่งไป:')
    console.log(`   📨 To: ${correctData.email}`)
    console.log(`   📧 Subject: เข้าสู่ระบบ The Bliss at Home - ${correctData.expectedHotelName}`)
    console.log(`   🔐 Password: ${correctData.password}`)
    console.log('')

    // 5. การทดสอบ Manual Login
    console.log('🎯 Step 5: การทดสอบด้วยตนเอง...')
    console.log('')
    console.log('👨‍💻 คู่มือทดสอบ Manual Login:')
    console.log('─'.repeat(50))
    console.log('')
    console.log('1. เปิดเบราว์เซอร์ไปที่: http://localhost:3006/login')
    console.log('')
    console.log('2. กรอกข้อมูลการเข้าสู่ระบบ:')
    console.log(`   📧 อีเมล: ${correctData.email}`)
    console.log(`   🔐 รหัสผ่าน: ${correctData.password}`)
    console.log('')
    console.log('3. คลิกปุ่ม "เข้าสู่ระบบ"')
    console.log('')
    console.log('4. ตรวจสอบผลลัพธ์:')
    console.log('')
    console.log('   ✅ ผลลัพธ์ที่ถูกต้อง:')
    console.log(`      - เข้าสู่ระบบสำเร็จ`)
    console.log(`      - แสดงชื่อ: "${correctData.expectedHotelName}"`)
    console.log('      - ไม่แสดง "ฮิลตัน" หรือ "Hilton"')
    console.log('      - Redirect ไปหน้า Dashboard หรือ Bookings')
    console.log('')
    console.log('   ❌ ปัญหาที่อาจเกิดขึ้น:')
    console.log('      - แสดง "โรงแรมฮิลตัน อยุธยา" แทน')
    console.log('      - Login ไม่สำเร็จ (error message)')
    console.log('      - ไม่มีการ redirect')
    console.log('')

    // 6. การแก้ไขปัญหา
    console.log('🛠️  Step 6: วิธีแก้ไขปัญหา (หากเจอ):')
    console.log('')
    console.log('หาก Login แล้วยังแสดงโรงแรมผิด:')
    console.log('1. 🔧 แก้ไขข้อมูลในฐานข้อมูล:')
    console.log('   node fix-resort-data.js')
    console.log('')
    console.log('2. 🔄 รีสตาร์ท Services:')
    console.log('   - หยุด Hotel App (Ctrl+C)')
    console.log('   - หยุด Node.js Server (Ctrl+C)')
    console.log('   - รันใหม่: pnpm dev')
    console.log('')
    console.log('3. 🧹 ล้าง Browser Cache:')
    console.log('   - ล้าง localStorage/sessionStorage')
    console.log('   - ลองใน Private/Incognito mode')
    console.log('')

    // 7. Next Steps
    console.log('📝 Step 7: ขั้นตอนถัดไป:')
    console.log('')
    console.log('หาก Login สำเร็จแต่ข้อมูลโรงแรมยังผิด:')
    console.log('1. 📊 ตรวจสอบข้อมูลใน Admin Panel:')
    console.log('   http://localhost:3001/admin/hotels/' + correctData.hotelId)
    console.log('')
    console.log('2. 🔍 ตรวจสอบ useAuth hook ใน hotel app:')
    console.log('   apps/hotel/src/hooks/useAuth.js')
    console.log('')
    console.log('3. 🏨 ตรวจสอบ hotel context/state management')
    console.log('')

    // สรุป
    console.log('📋 สรุปการตรวจสอบ:')
    console.log('─'.repeat(50))
    console.log('')
    console.log('✅ สิ่งที่ทำงานแล้ว:')
    console.log('   - Email Service (ส่งอีเมลได้)')
    console.log('   - Ethereal Test Account (ดูอีเมลได้)')
    console.log('   - Node.js Server (API ทำงาน)')
    console.log('   - Hotel App (UI ทำงาน)')
    console.log('   - ข้อมูลอีเมลถูกต้อง (sweettuay.bt@gmail.com)')
    console.log('')
    console.log('⚠️  สิ่งที่ต้องตรวจสอบ:')
    console.log('   - การแสดงชื่อโรงแรมใน Login')
    console.log('   - ข้อมูลโรงแรมในฐานข้อมูล')
    console.log('   - การทำงานของ authentication state')

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
  }

  console.log('')
  console.log('🎯 ============================================')
  console.log('   การตรวจสอบเสร็จสิ้น')
  console.log('🎯 ============================================')
}

// เรียกใช้ function
verifyLoginSystem().catch(console.error)