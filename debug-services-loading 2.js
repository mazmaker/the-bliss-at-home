#!/usr/bin/env node
/**
 * Debug Services Loading
 * ตรวจสอบปัญหาการโหลด services ในแบบฟอร์มจอง
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function debugServicesLoading() {
  console.log('🔍 ====================================')
  console.log('   Debug Services Loading')
  console.log('🔍 ====================================')
  console.log('')

  try {
    // 1. Check services table structure
    console.log('1. 📋 ตรวจสอบโครงสร้าง services table...')
    const { data: servicesSample, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .limit(1)

    if (servicesError) {
      console.log('❌ Services error:', servicesError.message)
      return
    }

    if (servicesSample.length > 0) {
      console.log('   Columns:', Object.keys(servicesSample[0]))
      console.log('')
    } else {
      console.log('❌ ไม่มีข้อมูลใน services table!')
      return
    }

    // 2. Check all services
    console.log('2. 🎯 ดูบริการทั้งหมดที่มี...')
    const { data: allServices, error: allServicesError } = await supabase
      .from('services')
      .select('*')
      .order('created_at')

    if (allServicesError) {
      console.log('❌ All services error:', allServicesError.message)
      return
    }

    console.log(`   พบบริการทั้งหมด ${allServices.length} รายการ:`)
    allServices.forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.name || service.title || 'ไม่มีชื่อ'}`)
      console.log(`      ID: ${service.id}`)
      console.log(`      Active: ${service.is_active !== false ? 'Yes' : 'No'}`)
      console.log(`      Price: ${service.price || service.base_price || 'N/A'}`)
      console.log(`      Duration: ${service.duration || 'N/A'} minutes`)
      console.log('')
    })

    // 3. Check active services only (what the form should show)
    console.log('3. ✅ บริการที่ active และควรแสดงในฟอร์ม...')
    const { data: activeServices, error: activeError } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (activeError) {
      console.log('❌ Active services error:', activeError.message)
    } else {
      console.log(`   พบบริการที่ active ${activeServices.length} รายการ:`)
      activeServices.forEach((service, index) => {
        console.log(`   ${index + 1}. ${service.name || service.title || 'ไม่มีชื่อ'}`)
      })
    }

    // 4. Test the exact query used by BookingModalNew
    console.log('')
    console.log('4. 🧪 ทดสอบ query เดียวกับที่ใช้ในฟอร์ม...')

    // This is the exact query from BookingModalNew.tsx
    const { data: formServices, error: formError } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (formError) {
      console.log('❌ Form query error:', formError.message)
      console.log('   นี่อาจเป็นสาเหตุที่ฟอร์มไม่แสดงบริการ!')
    } else {
      console.log(`✅ Form query สำเร็จ: ${formServices.length} บริการ`)
      if (formServices.length === 0) {
        console.log('⚠️  Query สำเร็จแต่ไม่มีข้อมูล - ตรวจสอบ is_active field')
      }
    }

    console.log('')
    console.log('🎯 สรุปสาเหตุที่เป็นไปได้:')

    if (allServices.length === 0) {
      console.log('❌ ไม่มีข้อมูลบริการในฐานข้อมูลเลย')
    } else if (activeServices.length === 0) {
      console.log('❌ มีข้อมูลบริการแต่ทั้งหมดเป็น is_active = false')
      console.log('💡 แก้ไข: อัพเดท is_active = true สำหรับบริการที่ต้องการแสดง')
    } else {
      console.log('✅ มีข้อมูลบริการที่ active')
      console.log('💡 ปัญหาอาจอยู่ที่ frontend component หรือ authentication')
    }

    // 5. Suggest fix for is_active issue
    if (allServices.length > 0 && activeServices.length === 0) {
      console.log('')
      console.log('🔧 คำสั่งแก้ไข (ถ้าต้องการ):')
      console.log('UPDATE services SET is_active = true WHERE is_active IS NULL OR is_active = false;')
    }

  } catch (error) {
    console.error('💥 Error:', error.message)
  }
}

debugServicesLoading().catch(console.error)