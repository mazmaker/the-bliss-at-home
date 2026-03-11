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

    // Invoice Title (right side)
    this.doc.setFontSize(22)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.text('ใบแจ้งหนี้', this.margin + this.contentWidth - 10, this.margin + 14, { align: 'right' })

    this.currentY = this.margin + 35
    this.doc.setTextColor(0, 0, 0)

    // Invoice info section
    this.doc.setFontSize(11)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.text('ข้อมูลโรงแรม', this.margin, this.currentY)
    this.doc.text('รายละเอียดใบแจ้งหนี้', this.margin + 100, this.currentY)
    this.currentY += this.lineHeight

    this.doc.setFont('Sarabun', 'normal')
    this.doc.setFontSize(10)
    this.doc.text(data.hotelName, this.margin, this.currentY)
    this.doc.text(`เลขที่: ${data.invoiceNumber}`, this.margin + 100, this.currentY)
    this.currentY += 5

    this.doc.text(`วันที่: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`, this.margin + 100, this.currentY)
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
      `สร้างโดยระบบ The Bliss at Home — ${new Date().toLocaleString('th-TH')}`,
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

  const filename = `invoice-${new Date().toISOString().slice(0, 10)}.pdf`
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
