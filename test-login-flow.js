#!/usr/bin/env node
/**
 * Test Complete Login Flow
 * ทดสอบการเข้าสู่ระบบด้วยข้อมูลที่ส่งทางอีเมล
 */

const puppeteer = require('puppeteer');

const loginCredentials = {
  email: 'sweettuay.bt@gmail.com',
  password: 'Test123456!', // จากอีเมลที่ส่งไป
  expectedHotelName: 'รีสอร์ทในฝัน เชียงใหม่'
}

async function testLoginFlow() {
  console.log('🔐 ===============================================')
  console.log('   ทดสอบการเข้าสู่ระบบ - รีสอร์ทในฝัน เชียงใหม่')
  console.log('🔐 ===============================================')
  console.log('')

  console.log('📋 ข้อมูลการทดสอบ:')
  console.log(`   📧 อีเมล: ${loginCredentials.email}`)
  console.log(`   🔐 รหัสผ่าน: ${loginCredentials.password}`)
  console.log(`   🏨 โรงแรมที่คาดหวัง: ${loginCredentials.expectedHotelName}`)
  console.log(`   🌐 URL: http://localhost:3006/login`)
  console.log('')

  let browser = null;

  try {
    // 1. ตรวจสอบว่า hotel app ทำงานอยู่
    console.log('🔍 Step 1: ตรวจสอบการเชื่อมต่อ...')

    const response = await fetch('http://localhost:3006')
    if (response.ok) {
      console.log('✅ Hotel app ทำงานอยู่ที่ port 3006')
    } else {
      console.log('❌ Hotel app ไม่ตอบสนอง')
      return
    }
    console.log('')

    // 2. เปิดเบราว์เซอร์และทดสอบ login
    console.log('🌐 Step 2: เปิดเบราว์เซอร์ทดสอบ...')

    browser = await puppeteer.launch({
      headless: false, // แสดงเบราว์เซอร์เพื่อดู UI
      devtools: true,   // เปิด DevTools เพื่อดู console errors
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()

    // รอข้อผิดพลาดใน console
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('   🔴 Console Error:', msg.text())
      }
    })

    page.on('pageerror', error => {
      console.log('   🔴 Page Error:', error.message)
    })

    // ไปยังหน้า login
    console.log('   🌐 กำลังเปิดหน้า Login...')
    await page.goto('http://localhost:3006/login', { waitUntil: 'networkidle2' })

    // รอให้หน้าโหลดเสร็จ
    await page.waitForTimeout(2000)

    console.log('✅ เปิดหน้า Login สำเร็จ')
    console.log('')

    // 3. กรอกข้อมูลและ Login
    console.log('📝 Step 3: กรอกข้อมูลการเข้าสู่ระบบ...')

    // ค้นหา input fields
    const emailInput = await page.$('input[name="email"], input[type="email"], #email')
    const passwordInput = await page.$('input[name="password"], input[type="password"], #password')

    if (!emailInput || !passwordInput) {
      console.log('❌ ไม่พบ input fields สำหรับ email/password')
      console.log('   💡 กรุณาตรวจสอบหน้า Login UI')
      return
    }

    // กรอกข้อมูล
    await emailInput.click({ clickCount: 3 }) // เลือกทั้งหมด
    await emailInput.type(loginCredentials.email)

    await passwordInput.click({ clickCount: 3 })
    await passwordInput.type(loginCredentials.password)

    console.log('✅ กรอกข้อมูลเรียบร้อย')

    // ค้นหาปุ่ม Login
    const loginButton = await page.$('button[type="submit"], button:contains("เข้าสู่ระบบ"), button:contains("Login")')

    if (!loginButton) {
      console.log('❌ ไม่พบปุ่ม Login')
      return
    }

    console.log('   🖱️  คลิกปุ่ม Login...')
    await loginButton.click()

    // รอให้ login process เสร็จ
    await page.waitForTimeout(3000)
    console.log('')

    // 4. ตรวจสอบผลลัพธ์
    console.log('🔍 Step 4: ตรวจสอบผลลัพธ์การเข้าสู่ระบบ...')

    const currentUrl = page.url()
    console.log(`   🌐 URL ปัจจุบัน: ${currentUrl}`)

    // ตรวจสอบว่า redirect ไปหน้าอื่นหรือยัง
    if (currentUrl.includes('/login')) {
      console.log('❌ ยังอยู่ในหน้า Login - อาจจะ Login ไม่สำเร็จ')

      // ดูว่ามี error message ไหม
      const errorElements = await page.$$('div[role="alert"], .error, .alert-danger')
      for (const errorEl of errorElements) {
        const errorText = await page.evaluate(el => el.textContent, errorEl)
        console.log(`   🔴 Error Message: ${errorText}`)
      }
    } else {
      console.log('✅ Redirect ไปหน้าอื่นแล้ว - Login น่าจะสำเร็จ')
    }

    // ค้นหาชื่อโรงแรมในหน้า
    console.log('')
    console.log('🏨 ตรวจสอบชื่อโรงแรมที่แสดง...')

    const pageContent = await page.content()

    if (pageContent.includes(loginCredentials.expectedHotelName)) {
      console.log(`✅ พบชื่อโรงแรมที่ถูกต้อง: "${loginCredentials.expectedHotelName}"`)
    } else if (pageContent.includes('ฮิลตัน') || pageContent.includes('Hilton')) {
      console.log('❌ ยังแสดงชื่อโรงแรมผิด: "ฮิลตัน" แทน "รีสอร์ทในฝัน"')
      console.log('   💡 ปัญหาข้อมูลโรงแรมในฐานข้อมูลยังไม่แก้ไข')
    } else {
      console.log('⚠️  ไม่พบชื่อโรงแรมในหน้า')

      // ค้นหาคำว่าโรงแรมใดๆ
      const hotelMatches = pageContent.match(/โรงแรม[^<>]+|Hotel[^<>]+|รีสอร์ท[^<>]+/gi)
      if (hotelMatches) {
        console.log('   🔍 ชื่อโรงแรมที่พบ:')
        hotelMatches.forEach(match => {
          console.log(`      - "${match.trim()}"`)
        })
      }
    }

    console.log('')
    console.log('📸 หน้าจอจะเปิดไว้ 10 วินาที เพื่อตรวจสอบด้วยตา...')
    await page.waitForTimeout(10000)

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
    console.log('')
    console.log('🔍 การตรวจสอบ:')
    console.log('   1. ✅ Hotel app ทำงานที่ port 3006')
    console.log('   2. ❓ ข้อมูลโรงแรมในฐานข้อมูลถูกต้องหรือไม่')
    console.log('   3. ❓ authentication service ทำงานถูกต้องหรือไม่')
    console.log('   4. ❓ UI components โหลดครบหรือไม่')
  } finally {
    if (browser) {
      console.log('')
      console.log('🔒 ปิดเบราว์เซอร์...')
      await browser.close()
    }
  }

  console.log('')
  console.log('🔐 ===============================================')
  console.log('   การทดสอบเข้าสู่ระบบเสร็จสิ้น')
  console.log('🔐 ===============================================')
  console.log('')

  console.log('📧 ข้อมูล Ethereal Email สำหรับตรวจสอบ:')
  console.log('   🌐 https://ethereal.email')
  console.log('   👤 User: xknd2tq4chbn2ttg@ethereal.email')
  console.log('   🔐 Pass: Sj2cZBN12R7sx2z9s7')
  console.log('')
  console.log('📱 ข้อมูลการเข้าสู่ระบบ:')
  console.log(`   🌐 URL: http://localhost:3006/login`)
  console.log(`   📧 อีเมล: ${loginCredentials.email}`)
  console.log(`   🔐 รหัสผ่าน: ${loginCredentials.password}`)
}

// เรียกใช้ function
testLoginFlow().catch(console.error)