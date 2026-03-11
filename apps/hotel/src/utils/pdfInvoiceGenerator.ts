/**
 * PDF Invoice Generator for Hotel App
 * Generate professional PDF invoices with Thai font support (Sarabun)
 */

import { jsPDF } from 'jspdf'
import { SarabunRegular, SarabunBold } from './fonts/sarabun'

interface BookingData {
  id: string
  booking_number: string
  booking_date: string
  booking_time: string
  service?: {
    name_th?: string
    price?: number
  }
  customer_notes?: string
  base_price: number
  final_price: number
  status: string
  created_at: string
  provider_preference?: string
}

interface InvoiceData {
  bookings: BookingData[]
  hotelName: string
  period?: string
  totalAmount: number
  invoiceNumber: string
}

export interface SingleBookingReceiptData {
  booking_number: string
  booking_date: string
  booking_time: string
  guest_name: string
  room_number: string
  service_name: string | null
  duration: number
  recipient_count: number
  final_price: number
  payment_status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded'
  status: string
  customer_notes: string | null
  staff_name: string | null
  provider_preference: string | null
  created_at: string
  hotel?: {
    name_th?: string
    address?: string
    phone?: string
    email?: string
    tax_id?: string
    bank_name?: string
    bank_account_number?: string
    bank_account_name?: string
  } | null
}

export class PDFInvoiceGenerator {
  private doc: jsPDF
  private margin = 20
  private lineHeight = 7
  private currentY = 20
  private contentWidth = 170

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4')
    this.registerFonts()
    this.doc.setFont('Sarabun', 'normal')
  }

  private registerFonts(): void {
    this.doc.addFileToVFS('Sarabun-Regular.ttf', SarabunRegular)
    this.doc.addFileToVFS('Sarabun-Bold.ttf', SarabunBold)
    this.doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal')
    this.doc.addFont('Sarabun-Bold.ttf', 'Sarabun', 'bold')
  }

  /**
   * Generate Hotel Booking Invoice PDF
   */
  generateBookingInvoice(data: InvoiceData): void {
    this.resetDocument()
    this.addHeader(data)
    this.addBookingDetails(data)
    this.addSummary(data)
    this.addFooter()
  }

  /**
   * Generate Monthly Bill PDF
   */
  generateMonthlyBill(data: InvoiceData): void {
    this.resetDocument()
    this.addMonthlyHeader(data)
    this.addMonthlyBookingTable(data)
    this.addMonthlyServiceBreakdown(data)
    this.addMonthlySummary(data)
    this.addFooter()
  }

  /**
   * Download the generated PDF
   */
  downloadPDF(filename: string): void {
    this.doc.save(filename)
  }

  private resetDocument(): void {
    this.doc = new jsPDF('p', 'mm', 'a4')
    this.registerFonts()
    this.doc.setFont('Sarabun', 'normal')
    this.currentY = this.margin
  }

  private addHeader(data: InvoiceData): void {
    // Amber header bar
    this.doc.setFillColor(217, 119, 6) // amber-700
    this.doc.rect(this.margin, this.margin, this.contentWidth, 28, 'F')

    // Company Name
    this.doc.setFontSize(18)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.setTextColor(255, 255, 255)
    this.doc.text('The Bliss Massage at Home', this.margin + 10, this.margin + 12)

    this.doc.setFontSize(11)
    this.doc.setFont('Sarabun', 'normal')
    this.doc.text('บริการนวด สปา และเล็บ ถึงที่พัก', this.margin + 10, this.margin + 20)

    // Title (right side)
    this.doc.setFontSize(18)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.text('ประวัติการจอง', this.margin + this.contentWidth - 10, this.margin + 14, { align: 'right' })

    this.currentY = this.margin + 35
    this.doc.setTextColor(0, 0, 0)

    // Info section
    this.doc.setFontSize(11)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.text('ข้อมูลโรงแรม', this.margin, this.currentY)
    this.doc.text('รายละเอียด', this.margin + 100, this.currentY)
    this.currentY += this.lineHeight

    this.doc.setFont('Sarabun', 'normal')
    this.doc.setFontSize(10)
    this.doc.text(data.hotelName, this.margin, this.currentY)

    // Compute date range from bookings
    const bookingDates = data.bookings.map(b => b.booking_date).filter(Boolean).sort()
    const dateRangeText = bookingDates.length > 0
      ? bookingDates.length === 1 || bookingDates[0] === bookingDates[bookingDates.length - 1]
        ? this.formatDateLong(bookingDates[0])
        : `${this.formatDateLong(bookingDates[0])} - ${this.formatDateLong(bookingDates[bookingDates.length - 1])}`
      : '-'

    this.doc.text(`ช่วงเวลา: ${dateRangeText}`, this.margin + 100, this.currentY)
    this.currentY += 5

    this.doc.text(`จำนวนรายการ: ${data.bookings.length} รายการ`, this.margin + 100, this.currentY)
    this.currentY += this.lineHeight + 3

    // Divider line
    this.doc.setDrawColor(217, 119, 6)
    this.doc.setLineWidth(0.5)
    this.doc.line(this.margin, this.currentY, this.margin + this.contentWidth, this.currentY)
    this.currentY += 5
  }

  private addMonthlyHeader(data: InvoiceData): void {
    // Amber header bar
    this.doc.setFillColor(217, 119, 6)
    this.doc.rect(this.margin, this.margin, this.contentWidth, 28, 'F')

    this.doc.setFontSize(18)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.setTextColor(255, 255, 255)
    this.doc.text('The Bliss Massage at Home', this.margin + 10, this.margin + 12)

    this.doc.setFontSize(11)
    this.doc.setFont('Sarabun', 'normal')
    this.doc.text('ใบเรียกเก็บเงินรายเดือน', this.margin + 10, this.margin + 20)

    // Monthly Bill label (right side)
    this.doc.setFontSize(22)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.text('บิลรายเดือน', this.margin + this.contentWidth - 10, this.margin + 14, { align: 'right' })

    this.currentY = this.margin + 35
    this.doc.setTextColor(0, 0, 0)

    // Hotel & Period info
    this.doc.setFontSize(11)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.text('ข้อมูลโรงแรม', this.margin, this.currentY)
    this.doc.text('รายละเอียดบิล', this.margin + 100, this.currentY)
    this.currentY += this.lineHeight

    this.doc.setFont('Sarabun', 'normal')
    this.doc.setFontSize(10)
    this.doc.text(data.hotelName, this.margin, this.currentY)
    this.doc.text(`เลขที่: ${data.invoiceNumber}`, this.margin + 100, this.currentY)
    this.currentY += 5
    this.doc.text(`รอบบิล: ${data.period}`, this.margin + 100, this.currentY)
    this.currentY += 5
    this.doc.text(`วันที่ออกบิล: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`, this.margin + 100, this.currentY)
    this.currentY += this.lineHeight + 3

    // Divider
    this.doc.setDrawColor(217, 119, 6)
    this.doc.setLineWidth(0.5)
    this.doc.line(this.margin, this.currentY, this.margin + this.contentWidth, this.currentY)
    this.currentY += 5
  }

  private addBookingDetails(data: InvoiceData): void {
    // Table Header
    const colX = {
      num: this.margin + 2,
      booking: this.margin + 12,
      date: this.margin + 45,
      service: this.margin + 75,
      amount: this.margin + 140,
    }

    this.doc.setFillColor(245, 245, 245)
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 8, 'F')

    this.doc.setFontSize(9)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.text('#', colX.num, this.currentY + 6)
    this.doc.text('เลขที่จอง', colX.booking, this.currentY + 6)
    this.doc.text('วันที่', colX.date, this.currentY + 6)
    this.doc.text('บริการ', colX.service, this.currentY + 6)
    this.doc.text('ยอดเงิน (บาท)', colX.amount, this.currentY + 6)

    this.currentY += 10

    // Table rows
    this.doc.setFont('Sarabun', 'normal')
    this.doc.setFontSize(9)

    data.bookings.forEach((booking, index) => {
      if (this.currentY > 265) {
        this.doc.addPage()
        this.registerFonts()
        this.doc.setFont('Sarabun', 'normal')
        this.currentY = this.margin
      }

      const rowY = this.currentY

      if (index % 2 === 0) {
        this.doc.setFillColor(252, 252, 252)
        this.doc.rect(this.margin, rowY - 1, this.contentWidth, 7, 'F')
      }

      this.doc.setTextColor(0, 0, 0)
      this.doc.text(`${index + 1}`, colX.num, rowY + 4)
      this.doc.text(booking.booking_number.slice(-8), colX.booking, rowY + 4)
      this.doc.text(this.formatDate(booking.booking_date), colX.date, rowY + 4)
      this.doc.text((booking.service?.name_th || 'ไม่ระบุ').slice(0, 30), colX.service, rowY + 4)
      this.doc.text(booking.final_price.toLocaleString(), colX.amount, rowY + 4)

      this.currentY += 7
    })

    this.currentY += 5
  }

  private addMonthlyBookingTable(data: InvoiceData): void {
    // Section title
    this.doc.setFontSize(12)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.text('รายการจองทั้งหมด', this.margin, this.currentY)
    this.currentY += 5

    // Reuse booking details table
    this.addBookingDetails(data)
  }

  private addMonthlyServiceBreakdown(data: InvoiceData): void {
    // Group by service
    const serviceGroups: { [key: string]: { count: number; amount: number } } = {}
    data.bookings.forEach(booking => {
      const serviceName = booking.service?.name_th || 'ไม่ระบุบริการ'
      if (!serviceGroups[serviceName]) {
        serviceGroups[serviceName] = { count: 0, amount: 0 }
      }
      serviceGroups[serviceName].count++
      serviceGroups[serviceName].amount += booking.final_price
    })

    if (this.currentY > 240) {
      this.doc.addPage()
      this.registerFonts()
      this.doc.setFont('Sarabun', 'normal')
      this.currentY = this.margin
    }

    // Section title
    this.doc.setFontSize(12)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.setTextColor(0, 0, 0)
    this.doc.text('สรุปตามประเภทบริการ', this.margin, this.currentY)
    this.currentY += 5

    // Table header
    this.doc.setFillColor(245, 245, 245)
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 8, 'F')

    this.doc.setFontSize(9)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.text('บริการ', this.margin + 2, this.currentY + 6)
    this.doc.text('จำนวน (ครั้ง)', this.margin + 90, this.currentY + 6)
    this.doc.text('ยอดรวม (บาท)', this.margin + 135, this.currentY + 6)
    this.currentY += 10

    this.doc.setFont('Sarabun', 'normal')
    this.doc.setFontSize(9)

    Object.entries(serviceGroups).forEach(([service, group], idx) => {
      const rowY = this.currentY
      if (idx % 2 === 0) {
        this.doc.setFillColor(252, 252, 252)
        this.doc.rect(this.margin, rowY - 1, this.contentWidth, 7, 'F')
      }
      this.doc.text(service, this.margin + 2, rowY + 4)
      this.doc.text(`${group.count}`, this.margin + 90, rowY + 4)
      this.doc.text(group.amount.toLocaleString(), this.margin + 135, rowY + 4)
      this.currentY += 7
    })

    this.currentY += 5
  }

  private addSummary(data: InvoiceData): void {
    // Add new page if not enough space for summary box (needs 35mm above footer at 274)
    if (this.currentY > 239) {
      this.doc.addPage()
      this.registerFonts()
      this.doc.setFont('Sarabun', 'normal')
      this.currentY = this.margin
    }

    // Summary box on the right side
    const boxX = this.margin + 90
    const boxW = 80
    const summaryY = this.currentY

    this.doc.setDrawColor(217, 119, 6)
    this.doc.setLineWidth(0.5)
    this.doc.rect(boxX, summaryY, boxW, 22)

    this.doc.setFillColor(217, 119, 6)
    this.doc.rect(boxX, summaryY, boxW, 10, 'F')

    this.doc.setFontSize(11)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.setTextColor(255, 255, 255)
    this.doc.text('ยอดรวมทั้งหมด', boxX + boxW / 2, summaryY + 7, { align: 'center' })

    this.doc.setFontSize(16)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.setTextColor(217, 119, 6)
    this.doc.text(`${data.totalAmount.toLocaleString()} บาท`, boxX + boxW / 2, summaryY + 18, { align: 'center' })

    this.doc.setTextColor(0, 0, 0)
    this.currentY = summaryY + 30
  }

  private addMonthlySummary(data: InvoiceData): void {
    if (this.currentY > 250) {
      this.doc.addPage()
      this.registerFonts()
      this.doc.setFont('Sarabun', 'normal')
      this.currentY = this.margin
    }

    const summaryY = this.currentY

    // Summary box
    this.doc.setFillColor(217, 119, 6)
    this.doc.rect(this.margin, summaryY, this.contentWidth, 30, 'F')

    this.doc.setFont('Sarabun', 'bold')
    this.doc.setTextColor(255, 255, 255)

    this.doc.setFontSize(13)
    this.doc.text('ยอดเรียกเก็บรวม', this.margin + 10, summaryY + 12)

    this.doc.setFontSize(22)
    this.doc.text(`${data.totalAmount.toLocaleString()} บาท`, this.margin + 10, summaryY + 24)

    // Right side info
    this.doc.setFontSize(10)
    this.doc.setFont('Sarabun', 'normal')
    this.doc.text(`จำนวนการจอง: ${data.bookings.length} รายการ`, this.margin + 110, summaryY + 12)
    this.doc.text(`รอบบิล: ${data.period}`, this.margin + 110, summaryY + 20)

    this.doc.setTextColor(0, 0, 0)
    this.currentY = summaryY + 40
  }

  private addFooter(): void {
    const footerY = 280

    this.doc.setDrawColor(217, 119, 6)
    this.doc.setLineWidth(0.3)
    this.doc.line(this.margin, footerY, this.margin + this.contentWidth, footerY)

    this.doc.setFontSize(8)
    this.doc.setFont('Sarabun', 'normal')
    this.doc.setTextColor(130, 130, 130)

    this.doc.text('ขอบคุณที่ใช้บริการ The Bliss Massage at Home', this.margin, footerY + 6)
    this.doc.text(
      `สร้างโดยระบบ The Bliss Massage at Home — ${new Date().toLocaleString('th-TH')}`,
      this.margin + this.contentWidth,
      footerY + 6,
      { align: 'right' }
    )
  }

  private formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
    } catch {
      return dateStr
    }
  }

  private formatDateLong(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  // ─── Single Booking Receipt / Invoice ──────────────────────────────────────

  generateSingleReceipt(data: SingleBookingReceiptData): void {
    this.resetDocument()

    const isPaid = data.payment_status === 'paid'
    const docType = isPaid ? 'ใบเสร็จรับเงิน' : 'ใบแจ้งหนี้'

    this.addReceiptHeader(docType)
    this.addReceiptInfoSection(data, docType)
    this.addReceiptGuestSection(data)
    this.addReceiptServiceTable(data)
    this.addReceiptSummary(data, isPaid)
    this.addReceiptSignatureSection(data, isPaid)
    this.addFooter()
  }

  private addReceiptHeader(docType: string): void {
    this.doc.setFillColor(217, 119, 6)
    this.doc.rect(this.margin, this.margin, this.contentWidth, 28, 'F')

    this.doc.setFontSize(16)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.setTextColor(255, 255, 255)
    this.doc.text('The Bliss Massage at Home', this.margin + 5, this.margin + 12)

    this.doc.setFontSize(9)
    this.doc.setFont('Sarabun', 'normal')
    this.doc.text('บริการนวด สปา และเล็บ ถึงที่พัก', this.margin + 5, this.margin + 20)

    this.doc.setFontSize(18)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.text(docType, this.margin + this.contentWidth - 5, this.margin + 16, { align: 'right' })

    this.currentY = this.margin + 35
    this.doc.setTextColor(0, 0, 0)
  }

  private addReceiptInfoSection(data: SingleBookingReceiptData, docType: string): void {
    const leftX = this.margin
    const rightX = this.margin + 95

    // Column headers
    this.doc.setFontSize(10)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.text('ข้อมูลผู้ให้บริการ', leftX, this.currentY)
    this.doc.text('ข้อมูลเอกสาร', rightX, this.currentY)
    this.currentY += 6

    this.doc.setFontSize(9)
    this.doc.setFont('Sarabun', 'normal')

    // Track Y separately for each column
    let leftY = this.currentY
    let rightY = this.currentY

    // Left column — hotel/provider info
    const hotelName = data.hotel?.name_th || 'The Bliss Massage at Home'
    this.doc.setFont('Sarabun', 'bold')
    this.doc.text(hotelName, leftX, leftY)
    this.doc.setFont('Sarabun', 'normal')
    leftY += 5

    if (data.hotel?.address) {
      const addrLines = this.doc.splitTextToSize(data.hotel.address, 85) as string[]
      addrLines.forEach((line: string) => {
        this.doc.text(line, leftX, leftY)
        leftY += 4.5
      })
    }
    if (data.hotel?.phone) {
      this.doc.text(`โทร: ${data.hotel.phone}`, leftX, leftY)
      leftY += 4.5
    }
    if (data.hotel?.tax_id) {
      this.doc.text(`เลขผู้เสียภาษี: ${data.hotel.tax_id}`, leftX, leftY)
      leftY += 4.5
    }

    // Right column — document info
    this.doc.setFont('Sarabun', 'bold')
    this.doc.text(`ประเภท: ${docType}`, rightX, rightY)
    this.doc.setFont('Sarabun', 'normal')
    rightY += 5
    this.doc.text(`เลขที่: ${data.booking_number}`, rightX, rightY)
    rightY += 5
    this.doc.text(`วันที่ออก: ${this.formatDateLong(new Date().toISOString().slice(0, 10))}`, rightX, rightY)
    rightY += 5
    this.doc.text(`วันที่บริการ: ${this.formatDateLong(data.booking_date)}`, rightX, rightY)
    rightY += 5

    // Payment status badge
    const statusLabel = data.payment_status === 'paid' ? 'ชำระแล้ว ✓'
      : data.payment_status === 'processing' ? 'กำลังดำเนินการ'
      : data.payment_status === 'failed' ? 'ชำระไม่สำเร็จ'
      : data.payment_status === 'refunded' ? 'คืนเงินแล้ว'
      : 'รอชำระเงิน'
    this.doc.text(`สถานะ: ${statusLabel}`, rightX, rightY)
    rightY += 5

    this.currentY = Math.max(leftY, rightY) + 4

    // Divider
    this.doc.setDrawColor(217, 119, 6)
    this.doc.setLineWidth(0.5)
    this.doc.line(this.margin, this.currentY, this.margin + this.contentWidth, this.currentY)
    this.currentY += 6
  }

  private addReceiptGuestSection(data: SingleBookingReceiptData): void {
    this.doc.setFontSize(10)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.text('ข้อมูลผู้รับบริการ', this.margin, this.currentY)
    this.currentY += 6

    this.doc.setFontSize(9)
    this.doc.setFont('Sarabun', 'normal')

    const leftX = this.margin
    const rightX = this.margin + 90

    this.doc.text(`ชื่อแขก: ${data.guest_name}`, leftX, this.currentY)
    this.doc.text(`เลขห้อง: ${data.room_number}`, rightX, this.currentY)
    this.currentY += 5

    if (data.customer_notes) {
      // Extract phone if present
      const phoneMatch = data.customer_notes.match(/Phone:\s*([^\n,]+)/)
      if (phoneMatch) {
        this.doc.text(`โทรศัพท์: ${phoneMatch[1].trim()}`, leftX, this.currentY)
        this.currentY += 5
      }
      // Show remaining notes (without Phone: line)
      const notes = data.customer_notes.replace(/Phone:\s*[^\n,]+[,\n]?/g, '').replace(/Guest:.*?(\n|$)/g, '').trim()
      if (notes) {
        const noteLines = this.doc.splitTextToSize(`หมายเหตุ: ${notes}`, this.contentWidth) as string[]
        noteLines.slice(0, 2).forEach((line: string) => {
          this.doc.text(line, leftX, this.currentY)
          this.currentY += 4.5
        })
      }
    }

    if (data.provider_preference && data.provider_preference !== 'no-preference') {
      const prefLabel: Record<string, string> = {
        'female-only': 'หญิงเท่านั้น',
        'male-only': 'ชายเท่านั้น',
        'prefer-female': 'ต้องการหญิง',
        'prefer-male': 'ต้องการชาย',
      }
      this.doc.text(`ความต้องการ: ${prefLabel[data.provider_preference] || data.provider_preference}`, leftX, this.currentY)
      this.currentY += 5
    }

    this.currentY += 3

    // Divider
    this.doc.setDrawColor(217, 119, 6)
    this.doc.setLineWidth(0.3)
    this.doc.line(this.margin, this.currentY, this.margin + this.contentWidth, this.currentY)
    this.currentY += 6
  }

  private addReceiptServiceTable(data: SingleBookingReceiptData): void {
    this.doc.setFontSize(10)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.text('รายการบริการ', this.margin, this.currentY)
    this.currentY += 5

    // Table header
    const col = { num: this.margin + 2, desc: this.margin + 10, qty: this.margin + 105, price: this.margin + 130, total: this.margin + 158 }

    this.doc.setFillColor(245, 245, 245)
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 8, 'F')
    this.doc.setFontSize(9)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.text('#', col.num, this.currentY + 6)
    this.doc.text('รายการบริการ', col.desc, this.currentY + 6)
    this.doc.text('จำนวน', col.qty, this.currentY + 6)
    this.doc.text('ราคา/หน่วย', col.price, this.currentY + 6)
    this.doc.text('รวม (บาท)', col.total, this.currentY + 6)
    this.currentY += 10

    // Row
    this.doc.setFillColor(252, 252, 252)
    this.doc.rect(this.margin, this.currentY - 1, this.contentWidth, 8, 'F')
    this.doc.setFont('Sarabun', 'normal')
    this.doc.setFontSize(9)

    const serviceName = `${data.service_name || 'บริการ'} (${data.duration} นาที)`
    const qty = data.recipient_count
    const pricePerUnit = qty > 0 ? Math.round(data.final_price / qty) : data.final_price

    this.doc.text('1', col.num, this.currentY + 5)
    this.doc.text(serviceName.slice(0, 45), col.desc, this.currentY + 5)
    this.doc.text(`${qty} คน`, col.qty, this.currentY + 5)
    this.doc.text(pricePerUnit.toLocaleString(), col.price, this.currentY + 5)
    this.doc.text(data.final_price.toLocaleString(), col.total, this.currentY + 5)
    this.currentY += 10

    if (data.staff_name) {
      this.doc.setFontSize(8)
      this.doc.setTextColor(100, 100, 100)
      this.doc.text(`พนักงานให้บริการ: ${data.staff_name}`, col.desc, this.currentY)
      this.doc.setTextColor(0, 0, 0)
      this.currentY += 5
    }

    // Bottom line of table
    this.doc.setDrawColor(200, 200, 200)
    this.doc.setLineWidth(0.3)
    this.doc.line(this.margin, this.currentY, this.margin + this.contentWidth, this.currentY)
    this.currentY += 6
  }

  private addReceiptSummary(data: SingleBookingReceiptData, isPaid: boolean): void {
    const boxX = this.margin + 90
    const boxW = 80
    const summaryY = this.currentY

    // Total box
    this.doc.setDrawColor(217, 119, 6)
    this.doc.setLineWidth(0.5)
    this.doc.rect(boxX, summaryY, boxW, 22)

    this.doc.setFillColor(217, 119, 6)
    this.doc.rect(boxX, summaryY, boxW, 10, 'F')

    this.doc.setFontSize(10)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.setTextColor(255, 255, 255)
    this.doc.text('ยอดชำระทั้งหมด', boxX + boxW / 2, summaryY + 7, { align: 'center' })

    this.doc.setFontSize(15)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.setTextColor(217, 119, 6)
    this.doc.text(`${data.final_price.toLocaleString()} บาท`, boxX + boxW / 2, summaryY + 18, { align: 'center' })

    // Payment remark (left side of summary row)
    this.doc.setFontSize(9)
    this.doc.setFont('Sarabun', 'normal')
    this.doc.setTextColor(0, 0, 0)

    if (isPaid) {
      this.doc.setTextColor(22, 163, 74) // green-600
      this.doc.setFont('Sarabun', 'bold')
      this.doc.text('✓ ได้รับชำระเงินเรียบร้อยแล้ว', this.margin, summaryY + 10)
      this.doc.setFont('Sarabun', 'normal')
      this.doc.setFontSize(8)
      this.doc.text('เอกสารนี้ใช้เป็นหลักฐานการชำระเงิน', this.margin, summaryY + 16)
    } else {
      this.doc.setTextColor(220, 38, 38) // red-600
      this.doc.setFont('Sarabun', 'bold')
      this.doc.text('⚠ กรุณาชำระเงินก่อนรับบริการ', this.margin, summaryY + 10)
      this.doc.setFont('Sarabun', 'normal')
      this.doc.setFontSize(8)
      this.doc.text('เอกสารนี้ยังไม่ใช่ใบเสร็จรับเงิน', this.margin, summaryY + 16)
    }

    this.doc.setTextColor(0, 0, 0)
    this.currentY = summaryY + 28
  }

  private addReceiptSignatureSection(data: SingleBookingReceiptData, isPaid: boolean): void {
    this.currentY += 6
    this.doc.setDrawColor(200, 200, 200)
    this.doc.setLineWidth(0.3)
    this.doc.line(this.margin, this.currentY, this.margin + this.contentWidth, this.currentY)
    this.currentY += 8

    this.doc.setFontSize(8)
    this.doc.setFont('Sarabun', 'normal')
    this.doc.setTextColor(100, 100, 100)

    // Booking time info
    const bookingTime = (data.booking_time || '--:--').substring(0, 5)
    const bookingDateFormatted = this.formatDateLong(data.booking_date)
    this.doc.text(`วันที่นัดหมาย: ${bookingDateFormatted} เวลา ${bookingTime} น.`, this.margin, this.currentY)
    this.currentY += 5

    // Booking created
    this.doc.text(`วันที่สร้างการจอง: ${this.formatDateLong(data.created_at.slice(0, 10))}`, this.margin, this.currentY)
    this.currentY += 12

    // Signature lines
    this.doc.setTextColor(0, 0, 0)
    this.doc.setFontSize(9)

    const sig1X = this.margin + 10
    const sig2X = this.margin + 100

    // Signature lines
    this.doc.setDrawColor(0, 0, 0)
    this.doc.line(sig1X, this.currentY, sig1X + 55, this.currentY)
    this.doc.line(sig2X, this.currentY, sig2X + 55, this.currentY)
    this.currentY += 5

    this.doc.setFont('Sarabun', 'normal')
    this.doc.setFontSize(8)
    this.doc.setTextColor(80, 80, 80)
    const sig1Label = isPaid ? 'ผู้รับชำระเงิน / พนักงาน' : 'ผู้ออกเอกสาร / พนักงาน'
    this.doc.text(sig1Label, sig1X + 28, this.currentY, { align: 'center' })
    this.doc.text('ผู้รับบริการ / แขก', sig2X + 28, this.currentY, { align: 'center' })
    this.currentY += 4

    this.doc.text(`(${data.staff_name || '.....................................'})`, sig1X + 28, this.currentY, { align: 'center' })
    this.doc.text(`(${data.guest_name})`, sig2X + 28, this.currentY, { align: 'center' })
    this.currentY += 10

    this.doc.setTextColor(130, 130, 130)
    this.doc.text('วันที่ ..................................................', sig1X + 28, this.currentY, { align: 'center' })
    this.doc.text('วันที่ ..................................................', sig2X + 28, this.currentY, { align: 'center' })

    this.doc.setTextColor(0, 0, 0)
    this.currentY += 8
  }

}

/**
 * Utility function to generate and download booking invoice PDF
 */
export function generateBookingInvoicePDF(
  bookings: BookingData[],
  hotelName: string = 'Hotel Partner'
): void {
  const totalAmount = bookings.reduce((sum, booking) => sum + booking.final_price, 0)
  const invoiceNumber = `INV-${Date.now()}`

  const invoiceData: InvoiceData = {
    bookings,
    hotelName,
    totalAmount,
    invoiceNumber
  }

  const generator = new PDFInvoiceGenerator()
  generator.generateBookingInvoice(invoiceData)

  const filename = `booking-history-${new Date().toISOString().slice(0, 10)}.pdf`
  generator.downloadPDF(filename)
}

/**
 * Utility function to generate and download monthly bill PDF
 */
export function generateMonthlyBillPDF(
  bookings: BookingData[],
  hotelName: string = 'Hotel Partner',
  period: string = new Date().toISOString().slice(0, 7)
): void {
  const totalAmount = bookings.reduce((sum, booking) => sum + booking.final_price, 0)
  const invoiceNumber = `MONTHLY-${period}`

  const invoiceData: InvoiceData = {
    bookings,
    hotelName,
    period,
    totalAmount,
    invoiceNumber
  }

  const generator = new PDFInvoiceGenerator()
  generator.generateMonthlyBill(invoiceData)

  const filename = `monthly-bill-${period}.pdf`
  generator.downloadPDF(filename)
}

/**
 * Generate and download a single booking receipt (ใบเสร็จรับเงิน) or invoice (ใบแจ้งหนี้)
 * - payment_status === 'paid'  → ใบเสร็จรับเงิน
 * - otherwise                 → ใบแจ้งหนี้
 */
export function generateSingleBookingReceiptPDF(data: SingleBookingReceiptData): void {
  const generator = new PDFInvoiceGenerator()
  generator.generateSingleReceipt(data)

  const isPaid = data.payment_status === 'paid'
  const prefix = isPaid ? 'receipt' : 'invoice'
  const filename = `${prefix}-${data.booking_number}.pdf`
  generator.downloadPDF(filename)
}
