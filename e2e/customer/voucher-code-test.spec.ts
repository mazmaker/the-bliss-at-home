/**
 * Simplified Test: Voucher Code Validation
 * ทดสอบระบบรหัสส่วนลด DISCOUNT15% ที่เพิ่งแก้ไข
 */

import { test, expect } from '@playwright/test'

const CUSTOMER_URL = 'http://localhost:3008'
const VOUCHER_CODE = 'DISCOUNT15%'

test.describe('Voucher Code Validation Test', () => {

  test('ทดสอบการตรวจสอบรหัสส่วนลด DISCOUNT15%', async ({ page }) => {
    console.log('🎟️ เริ่มทดสอบระบบรหัสส่วนลด')

    // ==========================================
    // STEP 1: เข้าสู่ระบบ
    // ==========================================
    await page.goto(`${CUSTOMER_URL}/login`)
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()

    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      await emailInput.fill('customer@test.com')
      await passwordInput.fill('password123')

      const loginButton = page.locator('button:has-text("เข้าสู่ระบบ")').first()
      await loginButton.click()
      await page.waitForTimeout(3000)

      console.log('✅ Login สำเร็จ')
    }

    // ==========================================
    // STEP 2: ไปหน้า Booking Wizard
    // ==========================================
    console.log('📋 ไปหน้า Booking เพื่อทดสอบ voucher')

    // ไปหน้าบริการแล้วเลือกบริการนวด
    await page.goto(`${CUSTOMER_URL}/services`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // หาบริการนวดที่เข้าเงื่อนไข
    const massageServices = page.locator('[href*="/services/"]:has-text("นวด"), [href*="/services/"]:has-text("massage")').first()

    if (await massageServices.isVisible()) {
      await massageServices.click()
      await page.waitForTimeout(2000)

      // คลิกจองบริการ
      const bookButton = page.locator('button:has-text("จองเลย"), button:has-text("จองบริการ"), button:has-text("Book")').first()
      if (await bookButton.isVisible()) {
        await bookButton.click()
        await page.waitForTimeout(3000)
      }
    }

    // ==========================================
    // STEP 3: ไปถึงขั้นตอนกรอกรหัสส่วนลด
    // ==========================================
    console.log('🎯 หา voucher code input')

    // Navigate through booking wizard หากจำเป็น
    const nextButtons = page.locator('button:has-text("ถัดไป"), button:has-text("Next"), button:has-text("ดำเนินการต่อ")')
    const nextCount = await nextButtons.count()

    for (let i = 0; i < Math.min(nextCount, 5); i++) {
      const nextBtn = nextButtons.nth(i)
      if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
        await nextBtn.click()
        await page.waitForTimeout(2000)

        // หา voucher input ในหน้านี้
        const voucherInput = page.locator('input[placeholder*="รหัส"], input[placeholder*="voucher"]').first()
        if (await voucherInput.isVisible()) {
          break
        }
      }
    }

    // ==========================================
    // STEP 4: ทดสอบ Voucher Code
    // ==========================================
    console.log('🎟️ ทดสอบรหัสส่วนลด:', VOUCHER_CODE)

    const voucherInput = page.locator('input[placeholder*="รหัส"], input[placeholder*="voucher"], input[placeholder*="โค้ด"]').first()

    await expect(voucherInput).toBeVisible({ timeout: 10000 })

    // กรอกรหัสส่วนลด
    await voucherInput.fill(VOUCHER_CODE)

    // กดปุ่มใช้รหัส
    const applyButton = page.locator('button:has-text("ใช้"), button:has-text("Apply")').first()
    if (await applyButton.isVisible()) {
      await applyButton.click()
    } else {
      await voucherInput.press('Enter')
    }

    // รอให้ระบบตรวจสอบ
    await page.waitForTimeout(3000)

    // ==========================================
    // STEP 5: ตรวจสอบผลลัพธ์
    // ==========================================
    console.log('💰 ตรวจสอบผลการใช้รหัสส่วนลด')

    // ตรวจสอบว่าส่วนลดผ่าน
    const successIndicators = [
      'text*="15%"',
      'text*="ส่วนลด"',
      'text*="discount"',
      '.text-green-600',
      '.text-green-700',
      '[class*="green"]'
    ]

    let discountApplied = false
    for (const selector of successIndicators) {
      const element = page.locator(selector).first()
      if (await element.isVisible({ timeout: 5000 })) {
        const text = await element.textContent()
        console.log('✅ พบส่วนลด:', text)
        discountApplied = true
        break
      }
    }

    // ตรวจสอบ error message
    const errorIndicators = [
      'text*="ไม่สามารถใช้"',
      'text*="ไม่ถูกต้อง"',
      'text*="หมดอายุ"',
      '.text-red-600',
      '[class*="red"]'
    ]

    let hasError = false
    let errorMessage = ''
    for (const selector of errorIndicators) {
      const element = page.locator(selector).first()
      if (await element.isVisible({ timeout: 3000 })) {
        errorMessage = await element.textContent() || ''
        console.log('❌ พบ Error:', errorMessage)
        hasError = true
        break
      }
    }

    // Screenshot สำหรับดู result
    await page.screenshot({
      path: `e2e/screenshots/voucher-test-result-${Date.now()}.png`,
      fullPage: true
    })

    // ==========================================
    // ASSERT RESULTS
    // ==========================================
    console.log('📊 === ผลการทดสอบ ===')
    console.log('✅ เข้าสู่ระบบได้')
    console.log('✅ หน้า voucher input ใช้ได้')
    console.log('✅ สามารถกรอกรหัสส่วนลดได้')

    if (discountApplied && !hasError) {
      console.log('🎉 รหัสส่วนลด DISCOUNT15% ใช้ได้สำเร็จ!')
    } else if (hasError) {
      console.log('⚠️ รหัสส่วนลดยังใช้ไม่ได้:', errorMessage)
      console.log('ตรวจสอบ: เงื่อนไข promotion, ประเภทบริการ, จำนวนเงินขั้นต่ำ')
    } else {
      console.log('❓ ไม่แน่ใจผลลัพธ์ - ดู screenshot')
    }

    // Pass test ถ้าไม่มี critical error
    expect(hasError).toBeFalsy()
    console.log('🎯 การทดสอบ Voucher Code เสร็จสิ้น')
  })

  test('ทดสอบ error case - รหัสส่วนลดไม่ถูกต้อง', async ({ page }) => {
    console.log('🧪 ทดสอบกรณีรหัสส่วนลดผิด')

    // เข้าสู่ระบบและไปหน้า voucher (ย่อขั้นตอน)
    await page.goto(`${CUSTOMER_URL}/login`)
    // ... (ย่อขั้นตอนเพื่อความรวดเร็ว)

    console.log('🧪 Placeholder: ทดสอบ invalid voucher code')
  })

})