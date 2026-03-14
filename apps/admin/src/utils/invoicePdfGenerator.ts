/**
 * Invoice PDF Generator for Admin - Hotel Billing
 * Client-side PDF generation using jsPDF with Sarabun font (Thai support)
 * Based on the customer app's receiptPdfGenerator pattern
 */

import { jsPDF } from 'jspdf'
import { SarabunRegular, SarabunBold } from './fonts/sarabun'
import type { HotelInvoice } from '../lib/hotelQueries'

export interface InvoicePdfData {
  invoice: HotelInvoice
  hotelName: string
}

class InvoicePDFGenerator {
  private doc: jsPDF
  private margin = 20
  private lineHeight = 7
  private currentY = 20
  private pageWidth = 210
  private contentWidth = 170

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4')
    this.registerFonts()
    this.doc.setFont('Sarabun', 'normal')
  }

  private registerFonts() {
    this.doc.addFileToVFS('Sarabun-Regular.ttf', SarabunRegular)
    this.doc.addFileToVFS('Sarabun-Bold.ttf', SarabunBold)
    this.doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal')
    this.doc.addFont('Sarabun-Bold.ttf', 'Sarabun', 'bold')
  }

  private reset() {
    this.doc = new jsPDF('p', 'mm', 'a4')
    this.registerFonts()
    this.doc.setFont('Sarabun', 'normal')
    this.currentY = this.margin
  }

  private addHeader(title: string, subtitle: string) {
    // Blue header bar
    this.doc.setFillColor(37, 99, 235) // blue-600
    this.doc.rect(this.margin, this.margin, this.contentWidth, 28, 'F')

    // Company name
    this.doc.setFontSize(18)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.setTextColor(255, 255, 255)
    this.doc.text('The Bliss Massage at Home', this.margin + 10, this.margin + 12)

    // Document title
    this.doc.setFontSize(12)
    this.doc.setFont('Sarabun', 'normal')
    this.doc.text(title, this.margin + 10, this.margin + 20)

    // Subtitle (invoice number) on right
    this.doc.setFontSize(11)
    this.doc.text(subtitle, this.margin + this.contentWidth - 10, this.margin + 20, { align: 'right' })

    this.currentY = this.margin + 35
    this.doc.setTextColor(0, 0, 0)
  }

  private addInfoRow(label: string, value: string) {
    this.doc.setFontSize(10)

    // Label
    this.doc.setFont('Sarabun', 'normal')
    this.doc.setTextColor(100, 100, 100)
    this.doc.text(label, this.margin, this.currentY)

    // Value
    this.doc.setFont('Sarabun', 'bold')
    this.doc.setTextColor(0, 0, 0)
    this.doc.text(value, this.margin + this.contentWidth, this.currentY, { align: 'right' })

    this.currentY += this.lineHeight
  }

  private addSeparator() {
    this.doc.setDrawColor(200, 200, 200)
    this.doc.line(this.margin, this.currentY, this.margin + this.contentWidth, this.currentY)
    this.currentY += 4
  }

  private addSectionTitle(title: string) {
    this.doc.setFontSize(11)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.setTextColor(50, 50, 50)
    this.doc.text(title, this.margin, this.currentY)
    this.currentY += 8
  }

  private addTotalBox(label: string, value: string, bgColor: [number, number, number], textColor: [number, number, number]) {
    this.doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
    this.doc.roundedRect(this.margin, this.currentY - 2, this.contentWidth, 18, 3, 3, 'F')

    this.doc.setFontSize(10)
    this.doc.setFont('Sarabun', 'normal')
    this.doc.setTextColor(textColor[0], textColor[1], textColor[2])
    this.doc.text(label, this.margin + 8, this.currentY + 6)

    this.doc.setFontSize(16)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.text(value, this.margin + this.contentWidth - 8, this.currentY + 8, { align: 'right' })

    this.currentY += 24
    this.doc.setTextColor(0, 0, 0)
  }

  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  private getStatusLabel(status: HotelInvoice['status']): string {
    const labels: Record<string, string> = {
      draft: 'ร่าง',
      pending: 'รอชำระ',
      paid: 'จ่ายแล้ว',
      overdue: 'เกินกำหนด',
      cancelled: 'ยกเลิก',
    }
    return labels[status] || status
  }

  private addFooter() {
    this.currentY += 5
    this.doc.setFontSize(9)
    this.doc.setFont('Sarabun', 'normal')
    this.doc.setTextColor(150, 150, 150)
    this.doc.text(
      'สร้างโดยระบบ The Bliss Massage at Home — Hotel Management System',
      this.pageWidth / 2,
      this.currentY,
      { align: 'center' }
    )
    this.currentY += 5
    this.doc.text('www.theblissmassageathome.com', this.pageWidth / 2, this.currentY, { align: 'center' })
  }

  generateInvoice(data: InvoicePdfData): void {
    this.reset()

    const { invoice, hotelName } = data

    // Header
    this.addHeader('ใบแจ้งหนี้ / Invoice', invoice.invoice_number)

    // Hotel Info Section
    this.addSectionTitle('ข้อมูลโรงแรม')
    this.addInfoRow('โรงแรม', hotelName)
    this.addInfoRow('สถานะ', this.getStatusLabel(invoice.status))

    this.currentY += 3
    this.addSeparator()

    // Invoice Details Section
    this.addSectionTitle('รายละเอียดบิล')
    this.addInfoRow('เลขที่บิล', invoice.invoice_number)
    this.addInfoRow('ช่วงเวลา', `${this.formatDate(invoice.period_start)} - ${this.formatDate(invoice.period_end)}`)
    this.addInfoRow('ประเภท', invoice.period_type === 'weekly' ? 'รายสัปดาห์' : 'รายเดือน')
    this.addInfoRow('วันที่ออกบิล', this.formatDate(invoice.issued_date))
    this.addInfoRow('วันครบกำหนด', this.formatDate(invoice.due_date))
    if (invoice.paid_date) {
      this.addInfoRow('วันที่ชำระ', this.formatDate(invoice.paid_date))
    }

    this.currentY += 3
    this.addSeparator()

    // Financial Summary Section
    this.addSectionTitle('สรุปยอด')
    this.addInfoRow('จำนวนการจองทั้งหมด', `${invoice.total_bookings} รายการ`)
    this.currentY += 3

    // Total amount box (green) — total_revenue is the amount hotel must pay
    this.addTotalBox(
      'ยอดเรียกเก็บรวม',
      `฿${Number(invoice.total_revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      [220, 252, 231], // green-100
      [22, 101, 52]    // green-800
    )

    // Footer
    this.addFooter()
  }

  download(filename: string): void {
    this.doc.save(filename)
  }
}

/**
 * Download an invoice as PDF
 */
export function downloadInvoicePDF(invoice: HotelInvoice, hotelName: string): void {
  const generator = new InvoicePDFGenerator()
  generator.generateInvoice({ invoice, hotelName })
  generator.download(`invoice-${invoice.invoice_number}.pdf`)
}
