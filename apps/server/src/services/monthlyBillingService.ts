/**
 * Monthly Billing Service
 * คำนวณและสร้างบิลรายเดือนจากข้อมูลการจองจริงของแต่ละโรงแรม
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface BookingData {
  id: string
  hotel_id: string
  final_price: number
  payment_status: string
  status: string
  booking_date: string
  service_id: string
}

interface BillingCalculation {
  hotel_id: string
  hotel_name: string
  period_start: string
  period_end: string

  // รายได้
  total_bookings: number
  gross_revenue: number
  paid_revenue: number
  pending_revenue: number

  // ค่าใช้จ่าย
  platform_commission: number
  monthly_fee: number
  transaction_fees: number

  // ผลรวม
  net_revenue: number
  vat_amount: number
  total_bill_amount: number

  // รายละเอียด
  commission_rate: number
  vat_rate: number
}

export class MonthlyBillingService {

  /**
   * คำนวณบิลรายเดือนสำหรับโรงแรมหนึ่งแห่ง
   */
  async calculateMonthlyBill(hotelId: string, year: number, month: number): Promise<BillingCalculation | null> {
    try {
      console.log(`🧮 คำนวณบิลรายเดือน: ${year}-${month.toString().padStart(2, '0')} สำหรับโรงแรม ${hotelId}`)

      // 1. ดึงข้อมูลโรงแรม
      const { data: hotel, error: hotelError } = await supabase
        .from('hotels')
        .select('id, name_th, status')
        .eq('id', hotelId)
        .eq('status', 'active')
        .single()

      if (hotelError || !hotel) {
        console.log('❌ ไม่พบโรงแรม:', hotelId)
        return null
      }

      // 2. กำหนดช่วงวันที่
      const periodStart = new Date(year, month - 1, 1) // เดือนเริ่มต้น
      const periodEnd = new Date(year, month, 0) // วันสุดท้ายของเดือน

      const startDate = periodStart.toISOString().split('T')[0]
      const endDate = periodEnd.toISOString().split('T')[0]

      console.log(`   ช่วงเวลา: ${startDate} ถึง ${endDate}`)

      // 3. ดึงข้อมูลการจองในช่วงเวลานี้
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, hotel_id, final_price, payment_status, status, booking_date, service_id')
        .eq('hotel_id', hotelId)
        .gte('booking_date', startDate)
        .lte('booking_date', endDate)

      if (bookingsError) {
        console.log('❌ ไม่สามารถดึงข้อมูลการจองได้:', bookingsError.message)
        return null
      }

      console.log(`   พบการจอง: ${bookings?.length || 0} รายการ`)

      // 4. คำนวณรายได้
      const validBookings = bookings || []
      const completedBookings = validBookings.filter(b =>
        ['completed', 'confirmed'].includes(b.status) &&
        b.final_price > 0
      )

      const totalBookings = completedBookings.length
      const grossRevenue = completedBookings.reduce((sum, b) => sum + (b.final_price || 0), 0)
      const paidRevenue = completedBookings
        .filter(b => b.payment_status === 'paid')
        .reduce((sum, b) => sum + (b.final_price || 0), 0)
      const pendingRevenue = completedBookings
        .filter(b => b.payment_status === 'pending')
        .reduce((sum, b) => sum + (b.final_price || 0), 0)

      // 5. คำนวณค่าใช้จ่าย
      const commissionRate = 0.15 // 15% คอมมิชชั่นแพลตฟอร์ม
      const monthlyFee = 500 // ค่าธรรมเนียมรายเดือน ฿500
      const transactionFeeRate = 0.025 // 2.5% ค่าธรรมเนียมการทำธุรกรรม
      const vatRate = 0.07 // VAT 7%

      const platformCommission = grossRevenue * commissionRate
      const transactionFees = grossRevenue * transactionFeeRate

      // รายได้สุทธิ = รายได้รวม - คอมมิชชั่น - ค่าธรรมเนียมธุรกรรม + ค่าธรรมเนียมรายเดือน
      const netRevenue = grossRevenue - platformCommission - transactionFees + monthlyFee
      const vatAmount = netRevenue * vatRate
      const totalBillAmount = netRevenue + vatAmount

      console.log(`   รายได้รวม: ฿${grossRevenue.toLocaleString()}`)
      console.log(`   คอมมิชชั่น: ฿${platformCommission.toLocaleString()}`)
      console.log(`   ยอดบิล: ฿${totalBillAmount.toLocaleString()}`)

      return {
        hotel_id: hotelId,
        hotel_name: hotel.name_th,
        period_start: startDate,
        period_end: endDate,

        total_bookings: totalBookings,
        gross_revenue: grossRevenue,
        paid_revenue: paidRevenue,
        pending_revenue: pendingRevenue,

        platform_commission: platformCommission,
        monthly_fee: monthlyFee,
        transaction_fees: transactionFees,

        net_revenue: netRevenue,
        vat_amount: vatAmount,
        total_bill_amount: totalBillAmount,

        commission_rate: commissionRate,
        vat_rate: vatRate
      }

    } catch (error) {
      console.error('❌ Error calculating monthly bill:', error)
      return null
    }
  }

  /**
   * สร้างหรืออัปเดตบิลรายเดือนในฐานข้อมูล
   */
  async createOrUpdateMonthlyBill(calculation: BillingCalculation, month: number, year: number): Promise<boolean> {
    try {
      const billNumber = `BILL-${calculation.hotel_id.slice(0, 8).toUpperCase()}-${year}${month.toString().padStart(2, '0')}`

      // วันกำหนดชำระ: วันที่ 15 ของเดือนถัดไป
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      const dueDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-15`

      const billData = {
        hotel_id: calculation.hotel_id,
        bill_number: billNumber,
        total_amount: Math.round(calculation.total_bill_amount * 100) / 100, // ปัดเศษเป็น 2 ตำแหน่ง
        status: 'pending',
        due_date: dueDate,
        period_start: calculation.period_start,
        period_end: calculation.period_end,
        month: month,
        year: year,

        // รายละเอียดการคำนวณ
        gross_revenue: calculation.gross_revenue,
        platform_commission: calculation.platform_commission,
        monthly_fee: calculation.monthly_fee,
        transaction_fees: calculation.transaction_fees,
        net_revenue: calculation.net_revenue,
        vat_amount: calculation.vat_amount,

        total_bookings: calculation.total_bookings,
        paid_revenue: calculation.paid_revenue,
        pending_revenue: calculation.pending_revenue
      }

      // ตรวจสอบว่ามีบิลอยู่แล้วหรือไม่
      const { data: existingBill, error: checkError } = await supabase
        .from('monthly_bills')
        .select('id')
        .eq('hotel_id', calculation.hotel_id)
        .eq('month', month)
        .eq('year', year)
        .single()

      if (existingBill) {
        // อัปเดตบิลที่มีอยู่
        const { error: updateError } = await supabase
          .from('monthly_bills')
          .update(billData)
          .eq('id', existingBill.id)

        if (updateError) {
          console.log('❌ ไม่สามารถอัปเดตบิลได้:', updateError.message)
          return false
        }

        console.log(`✅ อัปเดตบิล ${billNumber} สำเร็จ`)
      } else {
        // สร้างบิลใหม่
        const { error: insertError } = await supabase
          .from('monthly_bills')
          .insert(billData)

        if (insertError) {
          console.log('❌ ไม่สามารถสร้างบิลได้:', insertError.message)
          return false
        }

        console.log(`✅ สร้างบิล ${billNumber} สำเร็จ`)
      }

      return true

    } catch (error) {
      console.error('❌ Error creating/updating bill:', error)
      return false
    }
  }

  /**
   * สร้างบิลรายเดือนสำหรับโรงแรมทั้งหมด
   */
  async generateBillsForAllHotels(year: number, month: number): Promise<void> {
    try {
      console.log(`🏨 สร้างบิลรายเดือนทุกโรงแรม: ${year}-${month.toString().padStart(2, '0')}`)

      // ดึงรายชื่อโรงแรมที่ active
      const { data: hotels, error: hotelsError } = await supabase
        .from('hotels')
        .select('id, name_th')
        .eq('status', 'active')

      if (hotelsError || !hotels) {
        console.log('❌ ไม่สามารถดึงรายชื่อโรงแรมได้')
        return
      }

      console.log(`   พบโรงแรม: ${hotels.length} แห่ง`)

      let successCount = 0
      let errorCount = 0

      // สร้างบิลให้แต่ละโรงแรม
      for (const hotel of hotels) {
        try {
          console.log(`\n📋 กำลังประมวลผล: ${hotel.name_th}`)

          const calculation = await this.calculateMonthlyBill(hotel.id, year, month)
          if (calculation) {
            const success = await this.createOrUpdateMonthlyBill(calculation, month, year)
            if (success) {
              successCount++
            } else {
              errorCount++
            }
          } else {
            console.log(`   ⚠️ ไม่สามารถคำนวณบิลได้`)
            errorCount++
          }
        } catch (error) {
          console.error(`   ❌ Error processing ${hotel.name_th}:`, error)
          errorCount++
        }
      }

      console.log(`\n🎯 สรุปผล:`)
      console.log(`   ✅ สำเร็จ: ${successCount} โรงแรม`)
      console.log(`   ❌ ล้มเหลว: ${errorCount} โรงแรม`)

    } catch (error) {
      console.error('❌ Error generating bills for all hotels:', error)
    }
  }

  /**
   * ดึงรายละเอียดบิลรายเดือนพร้อมการคำนวณ
   */
  async getBillWithDetails(hotelId: string, month: number, year: number) {
    try {
      const { data: bill, error: billError } = await supabase
        .from('monthly_bills')
        .select('*')
        .eq('hotel_id', hotelId)
        .eq('month', month)
        .eq('year', year)
        .single()

      if (billError || !bill) {
        return null
      }

      return {
        ...bill,
        breakdown: {
          gross_revenue: bill.gross_revenue || 0,
          platform_commission: bill.platform_commission || 0,
          monthly_fee: bill.monthly_fee || 0,
          transaction_fees: bill.transaction_fees || 0,
          net_revenue: bill.net_revenue || 0,
          vat_amount: bill.vat_amount || 0,
          total_bookings: bill.total_bookings || 0,
          paid_revenue: bill.paid_revenue || 0,
          pending_revenue: bill.pending_revenue || 0
        }
      }
    } catch (error) {
      console.error('Error getting bill details:', error)
      return null
    }
  }
}

export default MonthlyBillingService