/**
 * Simple PDF Generator with Better Thai Support
 * Fallback to English for better compatibility
 */

import { jsPDF } from 'jspdf'

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
  platformFee?: number
  hotelRevenue?: number
  commissionRate?: number
}

export class SimplePDFGenerator {
  private doc: jsPDF
  private margin: number = 20
  private lineHeight: number = 7
  private currentY: number = this.margin

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4')
    // Use standard font for better compatibility
    this.doc.setFont('helvetica', 'normal')
  }

  /**
   * Generate Monthly Bill PDF - Simplified Version
   */
  generateSimpleMonthlyBill(data: InvoiceData): void {
    this.resetDocument()
    this.addSimpleHeader(data)
    this.addBookingSummary(data)
    this.addServiceBreakdown(data)
    this.addSimpleTotal(data)
    this.addSimpleFooter()
  }

  /**
   * Download the generated PDF
   */
  downloadPDF(filename: string): void {
    this.doc.save(filename)
  }

  private resetDocument(): void {
    this.doc = new jsPDF('p', 'mm', 'a4')
    this.doc.setFont('helvetica', 'normal')
    this.currentY = this.margin
  }

  private addSimpleHeader(data: InvoiceData): void {
    // Company Header Background
    this.doc.setFillColor(245, 158, 11) // Amber color
    this.doc.rect(this.margin, this.margin, 170, 25, 'F')

    // Company Name in English
    this.doc.setFontSize(18)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(255, 255, 255)
    this.doc.text('The Bliss at Home - Monthly Bill', this.margin + 5, this.margin + 12)

    // Hotel Name (convert Thai to English if possible)
    const hotelNameEn = this.convertToSafeText(data.hotelName)
    this.doc.setFontSize(14)
    this.doc.text(hotelNameEn, this.margin + 5, this.margin + 20)

    this.currentY = this.margin + 35

    // Bill Information
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(0, 0, 0)

    // Period in safe format - convert any problematic characters
    const periodText = this.formatPeriodSafely(data.period)
    this.doc.text(`Period: ${periodText}`, this.margin, this.currentY)
    this.currentY += this.lineHeight

    this.doc.text(`Generated: ${new Date().toLocaleDateString('en-US')}`, this.margin, this.currentY)
    this.currentY += this.lineHeight

    this.doc.text(`Invoice: ${this.formatInvoiceSafely(data.invoiceNumber)}`, this.margin, this.currentY)
    this.currentY += this.lineHeight * 2
  }

  private addBookingSummary(data: InvoiceData): void {
    // Summary Section
    this.doc.setFillColor(240, 240, 240)
    this.doc.rect(this.margin, this.currentY, 170, 8, 'F')

    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Booking Summary', this.margin + 5, this.currentY + 6)

    this.currentY += 15

    this.doc.setFontSize(11)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(`Total Bookings: ${data.bookings.length}`, this.margin, this.currentY)
    this.currentY += this.lineHeight

    this.doc.text(`Total Amount: ${this.formatCurrency(data.totalAmount)}`, this.margin, this.currentY)
    this.currentY += this.lineHeight * 2
  }

  private addServiceBreakdown(data: InvoiceData): void {
    // Service Breakdown
    this.doc.setFillColor(240, 240, 240)
    this.doc.rect(this.margin, this.currentY, 170, 8, 'F')

    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Service Breakdown', this.margin + 5, this.currentY + 6)

    this.currentY += 15

    // Group bookings by service
    const serviceGroups: { [key: string]: { count: number; amount: number } } = {}

    data.bookings.forEach(booking => {
      const serviceName = this.convertServiceName(booking.service?.name_th || 'Unknown Service')
      if (!serviceGroups[serviceName]) {
        serviceGroups[serviceName] = { count: 0, amount: 0 }
      }
      serviceGroups[serviceName].count++
      serviceGroups[serviceName].amount += booking.final_price
    })

    this.doc.setFontSize(11)
    this.doc.setFont('helvetica', 'normal')

    // Display service breakdown
    Object.entries(serviceGroups).forEach(([service, data]) => {
      this.doc.text(`• ${service}: ${data.count} bookings`, this.margin + 5, this.currentY)
      this.doc.text(`${this.formatCurrency(data.amount)}`, 150, this.currentY, { align: 'right' })
      this.currentY += this.lineHeight
    })

    this.currentY += 10
  }

  private addSimpleTotal(data: InvoiceData): void {
    // Total Section with Background
    this.doc.setFillColor(245, 158, 11)
    this.doc.rect(this.margin, this.currentY, 170, 30, 'F')

    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(255, 255, 255)
    this.doc.text('MONTHLY TOTAL', this.margin + 10, this.currentY + 12)

    this.doc.setFontSize(20)
    this.doc.text(this.formatCurrency(data.totalAmount), this.margin + 10, this.currentY + 25)

    // Additional Info
    this.doc.setFontSize(12)
    this.doc.text(`${data.bookings.length} Bookings`, 140, this.currentY + 15, { align: 'right' })
    this.doc.text(`${this.formatPeriodSafely(data.period)}`, 140, this.currentY + 25, { align: 'right' })

    this.currentY += 40
  }

  private addSimpleFooter(): void {
    const footerY = 270

    // Footer line
    this.doc.setDrawColor(245, 158, 11)
    this.doc.line(this.margin, footerY, 190, footerY)

    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(100, 100, 100)

    this.doc.text('Thank you for your business!', this.margin, footerY + 8)
    this.doc.text(`Generated: ${new Date().toLocaleString('en-US')}`,
      190, footerY + 8, { align: 'right' })

    this.doc.text('The Bliss at Home - Massage Service Platform',
      105, footerY + 15, { align: 'center' })
  }

  private convertToSafeText(text: string): string {
    // Convert Thai hotel names to safe English versions
    const thaiToEnglish: { [key: string]: string } = {
      'โรงแรม': 'Hotel',
      'รีสอร์ท': 'Resort',
      'บูติค': 'Boutique',
      'แกรนด์': 'Grand',
      'ลักชัวรี': 'Luxury',
      'พลาซ่า': 'Plaza',
      'วิลล่า': 'Villa'
    }

    let result = text
    Object.entries(thaiToEnglish).forEach(([thai, english]) => {
      result = result.replace(new RegExp(thai, 'g'), english)
    })

    // If still contains non-ASCII, provide fallback
    if (!/^[\x00-\x7F]*$/.test(result)) {
      return `Hotel Partner (${result.length} chars)`
    }

    return result
  }

  private convertServiceName(serviceName: string): string {
    const serviceMap: { [key: string]: string } = {
      'นวดไทย': 'Thai Massage',
      'นวดน้ำมัน': 'Oil Massage',
      'นวดเท้า': 'Foot Massage',
      'นวดหัว': 'Head Massage',
      'นวดตัว': 'Body Massage',
      'ทำเล็บ': 'Nail Service',
      'ทำผม': 'Hair Service'
    }

    // Try to convert known Thai service names
    for (const [thai, english] of Object.entries(serviceMap)) {
      if (serviceName.includes(thai)) {
        return english
      }
    }

    // If contains non-ASCII, provide generic name
    if (!/^[\x00-\x7F]*$/.test(serviceName)) {
      return 'Massage Service'
    }

    return serviceName
  }

  private formatCurrency(amount: number): string {
    // Use safe ASCII characters for currency to avoid encoding issues
    return `THB ${amount.toLocaleString('en-US')}`
  }

  private formatPeriodSafely(period?: string): string {
    if (!period) {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    }

    // If period contains non-ASCII characters, generate safe alternative
    if (!/^[\x00-\x7F]*$/.test(period)) {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    }

    // Ensure it's in YYYY-MM format
    if (period.match(/^\d{4}-\d{2}$/)) {
      return period
    }

    // Try to extract year and month if possible
    const match = period.match(/(\d{4})/);
    if (match) {
      const year = match[1]
      const now = new Date()
      return `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`
    }

    // Fallback to current date
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  private formatInvoiceSafely(invoice?: string): string {
    if (!invoice) {
      const now = new Date()
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      return `MONTHLY-${period}-${Date.now().toString().slice(-4)}`
    }

    // If invoice contains non-ASCII characters, generate safe alternative
    if (!/^[\x00-\x7F]*$/.test(invoice)) {
      const now = new Date()
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      return `MONTHLY-${period}-${Date.now().toString().slice(-4)}`
    }

    return invoice
  }
}

/**
 * Generate Simple Monthly Bill PDF with better encoding
 */
export function generateSimpleMonthlyBillPDF(
  bookings: BookingData[],
  hotelName: string = 'Hotel Partner',
  period: string = new Date().toISOString().slice(0, 7)
): void {
  const totalAmount = bookings.reduce((sum, booking) => sum + booking.final_price, 0)
  const invoiceNumber = `MONTHLY-${period}-${Date.now().toString().slice(-4)}`

  const invoiceData: InvoiceData = {
    bookings,
    hotelName,
    period,
    totalAmount,
    invoiceNumber
  }

  const generator = new SimplePDFGenerator()
  generator.generateSimpleMonthlyBill(invoiceData)

  const filename = `monthly-bill-${period}.pdf`
  generator.downloadPDF(filename)
}