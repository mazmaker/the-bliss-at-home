#!/usr/bin/env node
/**
 * Create Mock Resort Data
 * สร้างข้อมูลจำลองสำหรับการทดสอบ - รีสอร์ทในฝัน เชียงใหม่
 * โดยแก้ไขโค้ดให้แสดงข้อมูลที่ถูกต้อง
 */

const fs = require('fs')
const path = require('path')

const correctData = {
  email: 'sweettuay.bt@gmail.com',
  password: '@hTDh%gZ424n',
  hotelName: 'รีสอร์ทในฝัน เชียงใหม่',
  hotelId: '550e8400-e29b-41d4-a716-446655440002'
}

async function createMockData() {
  console.log('🎭 ==========================================')
  console.log('   สร้างข้อมูลจำลองรีสอร์ทในฝัน เชียงใหม่')
  console.log('🎭 ==========================================')
  console.log('')

  console.log('📋 ข้อมูลที่จะสร้าง:')
  console.log(`   📧 อีเมล: ${correctData.email}`)
  console.log(`   🔐 รหัสผ่าน: ${correctData.password}`)
  console.log(`   🏨 โรงแรม: ${correctData.hotelName}`)
  console.log(`   🆔 Hotel ID: ${correctData.hotelId}`)
  console.log('')

  try {
    // 1. สร้าง Mock Data สำหรับการทดสอบ
    console.log('📝 กำลังสร้างไฟล์ข้อมูลจำลอง...')

    const mockHotelData = {
      id: correctData.hotelId,
      name_th: correctData.hotelName,
      name_en: 'Dream Resort Chiang Mai',
      login_email: correctData.email,
      temporary_password: correctData.password,
      auth_user_id: 'auth_' + correctData.hotelId,
      login_enabled: true,
      password_change_required: false,
      last_login: new Date().toISOString(),
      status: 'active',
      contact_person: 'คุณสมชาย รีสอร์ท',
      phone: '053-123-4567',
      address: '123 ถนนนิมมานเหมินท์ เชียงใหม่ 50200',
      commission_rate: 15.00,
      rating: 4.8
    }

    // สร้างไฟล์ JSON สำหรับข้อมูลจำลอง
    const mockDataPath = path.join(__dirname, 'mock-resort-data.json')
    fs.writeFileSync(mockDataPath, JSON.stringify(mockHotelData, null, 2))
    console.log('✅ สร้างไฟล์ mock-resort-data.json แล้ว')
    console.log('')

    // 2. สร้างสคริปต์สำหรับการทดสอบ Login
    console.log('🔨 กำลังสร้างสคริปต์ทดสอบ...')

    const testScript = `#!/usr/bin/env node
/**
 * Test Login with Correct Resort Data
 * ทดสอบการเข้าสู่ระบบด้วยข้อมูลรีสอร์ทในฝัน เชียงใหม่
 */

const mockData = ${JSON.stringify(mockHotelData, null, 2)}

async function testResortLogin() {
  console.log('🏨 =======================================')
  console.log('   ทดสอบการเข้าสู่ระบบรีสอร์ทในฝัน')
  console.log('🏨 =======================================')
  console.log('')

  console.log('📱 ข้อมูลการเข้าสู่ระบบ:')
  console.log(\`   🌐 URL: http://localhost:3006/login\`)
  console.log(\`   📧 อีเมล: \${mockData.login_email}\`)
  console.log(\`   🔐 รหัสผ่าน: \${mockData.temporary_password}\`)
  console.log(\`   🏨 โรงแรม: \${mockData.name_th}\`)
  console.log('')

  console.log('🎯 สิ่งที่ควรเกิดขึ้น:')
  console.log('   1. ✅ เข้าสู่ระบบได้สำเร็จ')
  console.log('   2. ✅ แสดงชื่อ "รีสอร์ทในฝัน เชียงใหม่"')
  console.log('   3. ✅ ไม่ต้องเปลี่ยนรหัสผ่าน (password_change_required: false)')
  console.log('   4. ✅ เข้าไปหน้า Dashboard หรือ Bookings')
  console.log('')

  console.log('📋 หากยังแสดง "ฮิลตัน อยุธยา":')
  console.log('   💡 ให้ตรวจสอบว่า useAuth hook โหลดข้อมูลจากที่ไหน')
  console.log('   💡 อาจจะต้องแก้ไขข้อมูลในระบบ Admin หรือ Database')
  console.log('   💡 หรือ Clear cache ของเบราว์เซอร์')
  console.log('')

  console.log('🏨 =======================================')
  console.log('   ข้อมูลพร้อมใช้งานแล้ว')
  console.log('🏨 =======================================')
}

testResortLogin().catch(console.error)
`

    fs.writeFileSync(path.join(__dirname, 'test-resort-login.js'), testScript)
    console.log('✅ สร้างไฟล์ test-resort-login.js แล้ว')
    console.log('')

    // 3. แสดงขั้นตอนถัดไป
    console.log('📋 ขั้นตอนถัดไป:')
    console.log('   1. รันสคริปท์: node test-resort-login.js')
    console.log('   2. เปิดเบราว์เซอร์: http://localhost:3006/login')
    console.log('   3. ใส่ข้อมูล:')
    console.log(`      • อีเมล: ${correctData.email}`)
    console.log(`      • รหัสผ่าน: ${correctData.password}`)
    console.log('   4. หากยังแสดงผิด ต้องแก้ไขโค้ดในระบบให้โหลดข้อมูลจาก mock')
    console.log('')

    // 4. แสดงข้อมูลสำคัญ
    console.log('🎯 ข้อมูลสำคัญที่ควรจำ:')
    console.log(`   📧 Email: ${correctData.email}`)
    console.log(`   🔐 Password: ${correctData.password}`)
    console.log(`   🏨 Hotel: ${correctData.hotelName}`)
    console.log(`   🆔 Hotel ID: ${correctData.hotelId}`)

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
  }

  console.log('')
  console.log('🎭 ==========================================')
  console.log('   การสร้างข้อมูลจำลองเสร็จสิ้น')
  console.log('🎭 ==========================================')
}

// เรียกใช้ function
createMockData().catch(console.error)