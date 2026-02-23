#!/usr/bin/env node
/**
 * Create Hotel Record - สร้าง record โรงแรมในตาราง hotels
 * สร้างรีสอร์ทในฝัน เชียงใหม่ ในฐานข้อมูล Supabase
 */

const { createClient } = require('@supabase/supabase-js')

// ใช้ข้อมูลเดียวกับ Admin app
const supabaseUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'

const supabase = createClient(supabaseUrl, supabaseKey)

// Hotel ID จาก seed script
const HOTEL_ID = '3082d55a-b185-49b9-b4fc-01c00d61e7e1'

// ข้อมูลรีสอร์ทในฝัน เชียงใหม่
const hotelData = {
  id: HOTEL_ID,
  name_th: 'รีสอร์ทในฝัน เชียงใหม่',
  name_en: 'Dream Resort Chiang Mai',
  contact_person: 'คุณสมชาย รีสอร์ท',
  email: 'sweettuay.bt@gmail.com',
  phone: '053-123-456',
  address: '123 ถนนนิมมานเหมินท์ เชียงใหม่ 50200',
  latitude: 18.7883,
  longitude: 98.9660,
  commission_rate: 15.00,
  discount_rate: 0.00,
  status: 'active',
  login_enabled: true,
  password_change_required: false,
  bank_name: 'ธนาคารกสิกรไทย',
  bank_account_number: '456-7-89012-3',
  bank_account_name: 'บริษัท รีสอร์ทในฝัน จำกัด',
  tax_id: '0123456789013',
  description: 'รีสอร์ทสไตล์บูติก ท่ามกลางธรรมชาติ บรรยากาศเงียบสงบ',
  website: 'https://www.dreamresortchiangmai.com',
  rating: 4.8,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

async function createHotelRecord() {
  console.log('🏨 ========================================')
  console.log('   สร้าง Hotel Record ในตาราง hotels')
  console.log('🏨 ========================================')
  console.log('')

  console.log('📋 ข้อมูลโรงแรม:')
  console.log(`   🏨 ชื่อ: ${hotelData.name_th}`)
  console.log(`   🆔 ID: ${hotelData.id}`)
  console.log(`   📧 Email: ${hotelData.email}`)
  console.log('')

  try {
    // 1. ตรวจสอบว่ามีโรงแรมอยู่แล้วหรือไม่
    console.log('🔍 Step 1: ตรวจสอบโรงแรมที่มีอยู่...')

    const { data: existingHotels, error: checkError } = await supabase
      .from('hotels')
      .select('*')
      .eq('id', HOTEL_ID)

    if (checkError) {
      console.log('❌ ไม่สามารถเข้าถึงตาราง hotels:', checkError.message)
      return
    }

    if (existingHotels && existingHotels.length > 0) {
      console.log('✅ โรงแรมมีอยู่แล้ว')
      console.log(`   🏨 ชื่อ: ${existingHotels[0].name_th}`)
      console.log(`   📧 Email: ${existingHotels[0].email}`)

      // อัพเดทข้อมูล
      console.log('')
      console.log('🔧 Step 2: อัพเดทข้อมูลให้ถูกต้อง...')

      const { data: updatedHotel, error: updateError } = await supabase
        .from('hotels')
        .update({
          name_th: hotelData.name_th,
          email: hotelData.email,
          phone: hotelData.phone,
          login_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', HOTEL_ID)
        .select()

      if (updateError) {
        console.log('❌ อัพเดทไม่สำเร็จ:', updateError.message)
      } else {
        console.log('✅ อัพเดทข้อมูลสำเร็จ')
      }

    } else {
      console.log('💫 ไม่พบโรงแรม - กำลังสร้างใหม่...')

      // สร้างโรงแรมใหม่
      console.log('')
      console.log('🔨 Step 2: สร้างโรงแรมใหม่...')

      const { data: createdHotel, error: createError } = await supabase
        .from('hotels')
        .insert([hotelData])
        .select()

      if (createError) {
        console.log('❌ สร้างโรงแรมไม่สำเร็จ:', createError.message)
        return
      } else {
        console.log('🎉 สร้างโรงแรมสำเร็จ!')
        console.log(`   🏨 ชื่อ: ${createdHotel[0].name_th}`)
        console.log(`   📧 Email: ${createdHotel[0].email}`)
      }
    }

    console.log('')
    console.log('✅ Step 3: ข้อมูลโรงแรมพร้อมใช้งาน!')
    console.log('   💡 ตอนนี้สามารถสร้าง auth account ได้แล้ว')

  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error.message)
  }

  console.log('')
  console.log('🏨 ========================================')
  console.log('   การสร้าง Hotel Record เสร็จสิ้น')
  console.log('🏨 ========================================')
}

// เรียกใช้ function
createHotelRecord().catch(console.error)