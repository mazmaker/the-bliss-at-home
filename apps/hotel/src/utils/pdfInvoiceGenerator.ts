/**
 * PDF Invoice Generator for Hotel App
 * Generate professional PDF invoices from booking data
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
}

export class PDFInvoiceGenerator {
  private doc: jsPDF
  private margin: number = 20
  private lineHeight: number = 6
  private currentY: number = this.margin

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4')
    // Add support for Thai text
    this.doc.setFont('helvetica')
    this.doc.setLanguage('th')
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
    this.addMonthlyBookings(data)
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
    this.currentY = this.margin
  }

  private addHeader(data: InvoiceData): void {
    // Company Logo Area (placeholder)
    this.doc.setFillColor(245, 158, 11) // Amber color
    this.doc.rect(this.margin, this.margin, 50, 20, 'F')

    // Company Name
    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(255, 255, 255)
    this.doc.text('The Bliss at Home', this.margin + 5, this.margin + 8)
    this.doc.text('Massage Service', this.margin + 5, this.margin + 15)

    // Invoice Title
    this.doc.setFontSize(24)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(0, 0, 0)
    this.doc.text('INVOICE', 150, this.margin + 15, { align: 'right' })

    this.currentY = this.margin + 30

    // Hotel Information
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(`Hotel: ${data.hotelName}`, this.margin, this.currentY)
    this.currentY += this.lineHeight

    this.doc.text(`Invoice No: ${data.invoiceNumber}`, this.margin, this.currentY)
    this.currentY += this.lineHeight

    this.doc.text(`Date: ${new Date().toLocaleDateString('th-TH')}`, this.margin, this.currentY)
    this.currentY += this.lineHeight * 2
  }

  private addMonthlyHeader(data: InvoiceData): void {
    // Company Header
    this.doc.setFillColor(245, 158, 11)
    this.doc.rect(this.margin, this.margin, 170, 25, 'F')

    this.doc.setFontSize(18)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(255, 255, 255)
    this.doc.text('The Bliss at Home - Monthly Bill', this.margin + 5, this.margin + 10)
    this.doc.text(`${data.hotelName}`, this.margin + 5, this.margin + 20)

    this.currentY = this.margin + 35

    // Period Info
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(0, 0, 0)
    this.doc.text(`Period: ${data.period}`, this.margin, this.currentY)
    this.currentY += this.lineHeight

    this.doc.text(`Generated: ${new Date().toLocaleDateString('th-TH')}`, this.margin, this.currentY)
    this.currentY += this.lineHeight * 2
  }

  private addBookingDetails(data: InvoiceData): void {
    // Table Header
    const tableStartY = this.currentY
    this.doc.setFillColor(245, 245, 245)
    this.doc.rect(this.margin, tableStartY, 170, 8, 'F')

    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')

    // Column headers
    this.doc.text('Booking #', this.margin + 2, tableStartY + 6)
    this.doc.text('Date', this.margin + 35, tableStartY + 6)
    this.doc.text('Service', this.margin + 65, tableStartY + 6)
    this.doc.text('Provider Pref.', this.margin + 105, tableStartY + 6)
    this.doc.text('Amount', this.margin + 140, tableStartY + 6)

    this.currentY = tableStartY + 10

    // Table rows
    this.doc.setFont('helvetica', 'normal')
    data.bookings.forEach((booking, index) => {
      if (this.currentY > 270) {
        this.doc.addPage()
        this.currentY = this.margin
      }

      const rowY = this.currentY

      // Alternating row colors
      if (index % 2 === 0) {
        this.doc.setFillColor(250, 250, 250)
        this.doc.rect(this.margin, rowY - 2, 170, 8, 'F')
      }

      // Booking data
      this.doc.text(booking.booking_number.slice(-8), this.margin + 2, rowY + 4)
      this.doc.text(booking.booking_date, this.margin + 35, rowY + 4)
      this.doc.text(booking.service?.name_th?.slice(0, 15) || 'N/A', this.margin + 65, rowY + 4)
      this.doc.text(this.getProviderPreferenceText(booking.provider_preference), this.margin + 105, rowY + 4)
      this.doc.text(`฿${booking.final_price.toLocaleString()}`, this.margin + 140, rowY + 4)

      this.currentY += 8
    })

    this.currentY += 5
  }

  private addMonthlyBookings(data: InvoiceData): void {
    // Summary Table for Monthly Bill
    this.doc.setFillColor(245, 245, 245)
    this.doc.rect(this.margin, this.currentY, 170, 8, 'F')

    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Summary', this.margin + 2, this.currentY + 6)

    this.currentY += 15

    this.doc.setFont('helvetica', 'normal')
    this.doc.text(`Total Bookings: ${data.bookings.length}`, this.margin, this.currentY)
    this.currentY += this.lineHeight

    // Group by service
    const serviceGroups: { [key: string]: { count: number; amount: number } } = {}
    data.bookings.forEach(booking => {
      const serviceName = booking.service?.name_th || 'Unknown Service'
      if (!serviceGroups[serviceName]) {
        serviceGroups[serviceName] = { count: 0, amount: 0 }
      }
      serviceGroups[serviceName].count++
      serviceGroups[serviceName].amount += booking.final_price
    })

    // Display service breakdown
    Object.entries(serviceGroups).forEach(([service, data]) => {
      this.doc.text(`• ${service}: ${data.count} bookings (฿${data.amount.toLocaleString()})`,
        this.margin + 5, this.currentY)
      this.currentY += this.lineHeight
    })

    this.currentY += 10
  }

  private addSummary(data: InvoiceData): void {
    // Summary box
    const summaryY = this.currentY
    this.doc.setDrawColor(200, 200, 200)
    this.doc.rect(120, summaryY, 70, 25)

    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('TOTAL AMOUNT', 125, summaryY + 8)

    this.doc.setFontSize(16)
    this.doc.setTextColor(245, 158, 11)
    this.doc.text(`฿${data.totalAmount.toLocaleString()}`, 125, summaryY + 20)

    this.currentY = summaryY + 35
  }

  private addMonthlySummary(data: InvoiceData): void {
    // Monthly summary with more details
    const summaryY = this.currentY

    // Summary section background
    this.doc.setFillColor(245, 158, 11)
    this.doc.rect(this.margin, summaryY, 170, 30, 'F')

    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(255, 255, 255)
    this.doc.text('MONTHLY TOTAL', this.margin + 5, summaryY + 10)

    this.doc.setFontSize(20)
    this.doc.text(`฿${data.totalAmount.toLocaleString()}`, this.margin + 5, summaryY + 22)

    // Additional info
    this.doc.setFontSize(10)
    this.doc.setTextColor(255, 255, 255)
    this.doc.text(`Total Bookings: ${data.bookings.length}`, 120, summaryY + 10)
    this.doc.text(`Period: ${data.period}`, 120, summaryY + 18)

    this.currentY = summaryY + 40
  }

  private addFooter(): void {
    const footerY = 280

    // Footer line
    this.doc.setDrawColor(245, 158, 11)
    this.doc.line(this.margin, footerY, 190, footerY)

    this.doc.setFontSize(8)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(100, 100, 100)

    this.doc.text('Thank you for your business!', this.margin, footerY + 8)
    this.doc.text(`Generated by The Bliss at Home System - ${new Date().toLocaleString('th-TH')}`,
      190, footerY + 8, { align: 'right' })
  }

  private getProviderPreferenceText(preference?: string): string {
    switch (preference) {
      case 'female-only': return 'Female Only'
      case 'male-only': return 'Male Only'
      case 'prefer-female': return 'Prefer Female'
      case 'prefer-male': return 'Prefer Male'
      case 'no-preference': return 'No Preference'
      default: return 'Not Set'
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