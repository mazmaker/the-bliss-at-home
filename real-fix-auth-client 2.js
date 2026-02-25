#!/usr/bin/env node
/**
 * Real Fix for Hotel Auth Client
 * วิธีแก้ไขจริงๆ ที่ได้ผล
 */

console.log('💯 ====================================')
console.log('   Real Fix - Hotel Auth Client')
console.log('💯 ====================================')
console.log('')

console.log('🔍 ปัญหาจริง:')
console.log('   - User session อยู่ใน: sb-rbdvlfriqjnwpxmmgisf-auth-token')
console.log('   - Hotel client หา session ใน: bliss-hotel-auth')
console.log('   - ไม่เจอ session → 401 Unauthorized')
console.log('')

console.log('🛠️ วิธีแก้ไข 3 ทางเลือก:')
console.log('')

console.log('📋 ทางเลือกที่ 1: Fix Hotel Client ใช้ storage key เดียวกัน')
console.log('   แก้ไข: apps/hotel/src/lib/supabaseClient.ts')
console.log('   เปลี่ยนจาก: storageKey: "bliss-hotel-auth"')
console.log('   เป็น: storageKey: undefined (ใช้ default key)')
console.log('')

console.log('📋 ทางเลือกที่ 2: Auto Transfer Session')
console.log('   สร้าง function ย้าย session อัตโนมัติ')
console.log('   จาก default key → hotel key')
console.log('')

console.log('📋 ทางเลือกที่ 3: Use Default Client (ที่ใช้อยู่ตอนนี้)')
console.log('   ใช้ client เดิมไปก่อน + แก้ไข RLS policies')
console.log('   → ได้ผลแล้ว!')
console.log('')

console.log('✅ แนะนำ: ทางเลือกที่ 1 (ง่ายและได้ผลแน่นอน)')
console.log('')

console.log('🔧 Code สำหรับทางเลือกที่ 1:')
console.log('')
console.log('// apps/hotel/src/lib/supabaseClient.ts')
console.log('const client = createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {')
console.log('  auth: {')
console.log('    autoRefreshToken: true,')
console.log('    persistSession: true,')
console.log('    detectSessionInUrl: true,')
console.log('    flowType: "pkce",')
console.log('    storage: typeof window !== "undefined" ? window.localStorage : undefined,')
console.log('    // storageKey: "bliss-hotel-auth", // ← ลบบรรทัดนี้')
console.log('    debug: false,')
console.log('  },')
console.log('  // ... rest of config')
console.log('})')
console.log('')

console.log('💡 เหตุผล:')
console.log('   - ไม่ระบุ storageKey = ใช้ default key')
console.log('   - Default key = sb-{project-ref}-auth-token')
console.log('   - เหมือนกับที่ user login ไว้แล้ว')
console.log('   - จะใช้ session เดียวกัน = ไม่มี 401 error')

console.log('')
console.log('💯 ====================================')
console.log('   This Will Actually Work!')
console.log('💯 ====================================')

module.exports = {
  fixHotelClient: () => {
    console.log('ใช้วิธีแก้ไขข้างบนได้เลย!')
  }
}