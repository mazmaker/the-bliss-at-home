#!/usr/bin/env node
/**
 * Migrate Hotel Auth Session
 * แก้ไขปัญหา auth storage key โดยการย้าย session
 */

console.log('🔄 ====================================')
console.log('   Migrate Hotel Auth Session')
console.log('🔄 ====================================')
console.log('')

console.log('📋 Instructions สำหรับแก้ไขปัญหา:')
console.log('')
console.log('1. เปิด Browser Console (F12)')
console.log('2. ไปที่ Hotel App (localhost:3003)')
console.log('3. รันโค้ดต่อไปนี้ใน Console:')
console.log('')

console.log('// โค้ดสำหรับย้าย auth session')
console.log(`
// 1. ดึง session จาก customer auth storage
const oldSession = localStorage.getItem('sb-rbdvlfriqjnwpxmmgisf-auth-token') ||
                  localStorage.getItem('bliss-customer-auth');

console.log('Old session found:', !!oldSession);

if (oldSession) {
  // 2. บันทึกไปยัง hotel auth storage
  localStorage.setItem('bliss-hotel-auth', oldSession);
  console.log('✅ Session migrated to hotel auth');

  // 3. รีเฟรชหน้า
  window.location.reload();
} else {
  console.log('❌ No session found to migrate');
  console.log('💡 Try logging in again');
}
`)

console.log('')
console.log('🎯 หรือรันคำสั่งนี้:')
console.log('   localStorage.setItem("bliss-hotel-auth", localStorage.getItem("sb-rbdvlfriqjnwpxmmgisf-auth-token")); window.location.reload();')

console.log('')
console.log('✅ หลังจากรันแล้ว:')
console.log('   1. ลองจองใหม่')
console.log('   2. ควรจะสำเร็จแล้ว')

console.log('')
console.log('🔍 เหตุผลที่เกิดปัญหา:')
console.log('   - Hotel app ใช้ auth storage key ผิด')
console.log('   - RLS ไม่เห็น authentication context')
console.log('   - ต้องใช้ hotel-specific auth client')

console.log('')
console.log('===============================')