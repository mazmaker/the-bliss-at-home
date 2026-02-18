#!/usr/bin/env node
/**
 * Fix Service Names
 * เพิ่มชื่อบริการในฐานข้อมูล
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM2NTg0OSwiZXhwIjoyMDgzOTQxODQ5fQ.jsHK90yeAU1pAQ4P_u1hR4u42vnk6AxMnZxC0s68xAY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ชื่อบริการตาม price และ duration
const serviceNames = [
  { price: 500, duration: 60, name_th: 'นวดแผนไทย 60 นาที', name_en: 'Traditional Thai Massage 60min' },
  { price: 690, duration: 60, name_th: 'นวดอโรมา 60 นาที', name_en: 'Aroma Oil Massage 60min' },
  { price: 1000, duration: 120, name_th: 'นวดสปา 120 นาที', name_en: 'Spa Massage 120min' },
  { price: 1700, duration: 60, name_th: 'นวดฟุตสปา 60 นาที', name_en: 'Foot Spa Massage 60min' },
  { price: 1700, duration: 120, name_th: 'นวดหินร้อน 120 นาที', name_en: 'Hot Stone Massage 120min' },
  { price: 2500, duration: 150, name_th: 'นวดสปาพรีเมี่ยม 150 นาที', name_en: 'Premium Spa Treatment 150min' }
]

async function fixServiceNames() {
  console.log('🎯 ====================================')
  console.log('   Fix Service Names')
  console.log('🎯 ====================================')
  console.log('')

  try {
    // 1. Get all services without names
    console.log('1. 📋 ดึงข้อมูลบริการที่ไม่มีชื่อ...')
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .order('base_price')

    if (servicesError) {
      console.log('❌ Services error:', servicesError.message)
      return
    }

    console.log(`   พบบริการทั้งหมด ${services.length} รายการ`)
    console.log('')

    // 2. Update each service with appropriate name
    console.log('2. ✏️ อัพเดทชื่อบริการ...')

    for (const service of services) {
      // Find matching name based on price and duration
      const matchingName = serviceNames.find(sn =>
        sn.price === service.base_price && sn.duration === service.duration
      )

      if (matchingName) {
        console.log(`   อัพเดท: ${service.id} → ${matchingName.name_th}`)

        const { error: updateError } = await supabase
          .from('services')
          .update({
            name_th: matchingName.name_th,
            name_en: matchingName.name_en,
            category: 'MASSAGE' // เพิ่ม category ด้วย
          })
          .eq('id', service.id)

        if (updateError) {
          console.log(`   ❌ Update error for ${service.id}:`, updateError.message)
        } else {
          console.log(`   ✅ สำเร็จ`)
        }
      } else {
        // Generic name for services without specific match
        const genericTh = `บริการนวด ${service.duration} นาที`
        const genericEn = `Massage Service ${service.duration}min`

        console.log(`   อัพเดท (Generic): ${service.id} → ${genericTh}`)

        const { error: updateError } = await supabase
          .from('services')
          .update({
            name_th: genericTh,
            name_en: genericEn,
            category: 'MASSAGE'
          })
          .eq('id', service.id)

        if (updateError) {
          console.log(`   ❌ Update error for ${service.id}:`, updateError.message)
        } else {
          console.log(`   ✅ สำเร็จ`)
        }
      }
    }

    // 3. Verify the updates
    console.log('')
    console.log('3. ✅ ตรวจสอบผลลัพธ์...')

    const { data: updatedServices, error: verifyError } = await supabase
      .from('services')
      .select('id, name_th, name_en, base_price, duration, is_active')
      .eq('is_active', true)
      .order('base_price')

    if (verifyError) {
      console.log('❌ Verify error:', verifyError.message)
    } else {
      console.log('   บริการที่อัพเดทแล้ว:')
      updatedServices.forEach((service, index) => {
        console.log(`   ${index + 1}. ${service.name_th}`)
        console.log(`      EN: ${service.name_en}`)
        console.log(`      Price: ฿${service.base_price} | Duration: ${service.duration}min`)
        console.log('')
      })
    }

    console.log('🎉 ====================================')
    console.log('   อัพเดทชื่อบริการสำเร็จ!')
    console.log('🎉 ====================================')
    console.log('')
    console.log('✅ สิ่งที่ได้ทำ:')
    console.log('   - เพิ่มชื่อภาษาไทยและอังกฤษให้ทุกบริการ')
    console.log('   - ตั้ง category เป็น MASSAGE')
    console.log('   - รักษา is_active status เดิม')
    console.log('')
    console.log('📱 ขั้นตอนต่อไป:')
    console.log('   1. รีเฟรช Hotel App')
    console.log('   2. เปิดฟอร์มจอง')
    console.log('   3. ควรเห็นรายการบริการแล้ว!')

  } catch (error) {
    console.error('💥 Error:', error.message)
  }
}

fixServiceNames().catch(console.error)