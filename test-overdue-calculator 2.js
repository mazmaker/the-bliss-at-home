/**
 * Test Script for Overdue Calculator
 * ทดสอบ utility function คำนวณวันเลยกำหนด
 */

// Import functions (simulated since we're testing in node)
const {
  calculateOverdueDays,
  createDueDate,
  getOverdueStatus,
  formatOverdueMessage,
  getMonthlyBillStatus
} = require('./apps/hotel/src/utils/overdueCalculator.ts')

console.log('🧪 ทดสอบ Overdue Calculator Functions')
console.log('=' .repeat(50))

// Test 1: Create Due Date
console.log('\n📅 Test 1: สร้างวันกำหนดชำระ')
const jan2026Due = createDueDate('2026-01')
const feb2026Due = createDueDate('2026-02')
console.log('มกราคม 2026 → กำหนดชำระ:', jan2026Due) // Should be 2026-02-15
console.log('กุมภาพันธ์ 2026 → กำหนดชำระ:', feb2026Due) // Should be 2026-03-15

// Test 2: Calculate Overdue Days
console.log('\n⏰ Test 2: คำนวณวันเลยกำหนด')
const today = new Date('2026-02-18') // สมมุติวันนี้คือ 18 ก.พ. 2026

const days1 = calculateOverdueDays('2026-02-15', today) // เลย 3 วัน
const days2 = calculateOverdueDays('2026-02-20', today) // ยังไม่เลย (อีก 2 วัน)
const days3 = calculateOverdueDays('2026-02-18', today) // วันนี้กำหนด

console.log('กำหนด 15 ก.พ. vs วันนี้ 18 ก.พ. → เลย', days1, 'วัน') // Should be 3
console.log('กำหนด 20 ก.พ. vs วันนี้ 18 ก.พ. → ยังไม่เลย', Math.abs(days2), 'วัน') // Should be -2
console.log('กำหนด 18 ก.พ. vs วันนี้ 18 ก.พ. → เลย', days3, 'วัน') // Should be 0

// Test 3: Get Status
console.log('\n🚦 Test 3: วิเคราะห์สถานะ')
const status1 = getOverdueStatus(3) // เลย 3 วัน
const status2 = getOverdueStatus(12) // เลย 12 วัน
const status3 = getOverdueStatus(25) // เลย 25 วัน
const status4 = getOverdueStatus(-2) // ยังไม่เลย 2 วัน

console.log('เลย 3 วัน:', status1.level, status1.message, status1.icon)
console.log('เลย 12 วัน:', status2.level, status2.message, status2.icon)
console.log('เลย 25 วัน:', status3.level, status3.message, status3.icon)
console.log('ยังไม่เลย 2 วัน:', status4.level, status4.message, status4.icon)

// Test 4: Format Message
console.log('\n💬 Test 4: จัดรูปแบบข้อความ')
const message1 = formatOverdueMessage(status1, 28750)
const message3 = formatOverdueMessage(status3, 45200)

console.log('เลย 3 วัน (฿28,750):')
console.log('  Title:', message1.title)
console.log('  Description:', message1.description)
console.log('  Action:', message1.actionText)

console.log('\nเลย 25 วัน (฿45,200):')
console.log('  Title:', message3.title)
console.log('  Description:', message3.description)
console.log('  Action:', message3.actionText)

// Test 5: Monthly Bill Status (Real scenario)
console.log('\n🏨 Test 5: สถานะบิลรายเดือนจริง')
const janStatus = getMonthlyBillStatus('2026-01', today)
console.log('เดือนมกราคม 2026 (กำหนด 15 ก.พ.) vs วันนี้ 18 ก.พ.:')
console.log('  สถานะ:', janStatus.level)
console.log('  เลย:', janStatus.days, 'วัน')
console.log('  สี:', janStatus.color)
console.log('  ข้อความ:', janStatus.message)
console.log('  จำเป็นดำเนินการ:', janStatus.actionRequired)

const janMessage = formatOverdueMessage(janStatus, 28750)
console.log('  Title:', janMessage.title)
console.log('  Description:', janMessage.description)

console.log('\n✅ การทดสอบเสร็จสมบูรณ์!')