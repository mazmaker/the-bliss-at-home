/**
 * Receipt & Credit Note PDF Generator
 * Client-side PDF generation using jsPDF with Sarabun font (Thai support)
 */

import { jsPDF } from 'jspdf'
import { SarabunRegular, SarabunBold } from './fonts/sarabun'
import { getPdfLabels, type PdfLanguage } from './pdfLabels'

export interface ReceiptPdfData {
  receiptNumber: string
  transactionDate: string
  bookingNumber: string
  serviceName: string
  serviceNameEn?: string
  bookingDate: string
  bookingTime: string
  amount: number
  servicePrice?: number
  paymentMethod: string
  cardBrand?: string
  cardLastDigits?: string
  customerName: string
  addons?: { name: string; nameEn?: string; price: number }[]
  company: {
    name: string
    nameTh: string
    address: string
    phone: string
    email: string
    taxId: string
  }
  language?: PdfLanguage
}

export interface CreditNotePdfData {
  creditNoteNumber: string
  originalReceiptNumber: string
  refundDate: string
  bookingNumber: string
  serviceName: string
  serviceNameEn?: string
  originalAmount: number
  refundAmount: number
  refundPercentage: number
  refundReason: string
  customerName: string
  paymentMethod: string
  cardLastDigits?: string
  company: {
    name: string
    nameTh: string
    address: string
    phone: string
    email: string
    taxId: string
  }
  language?: PdfLanguage
}

class ReceiptPDFGenerator {
  private doc: jsPDF
  private margin = 20
  private lineHeight = 7
  private currentY = 20
  private pageWidth = 210
  private contentWidth = 170
  private labels: ReturnType<typeof getPdfLabels>
  private lang: PdfLanguage

  constructor(language: PdfLanguage = 'th') {
    this.doc = new jsPDF('p', 'mm', 'a4')
    this.lang = language
    this.labels = getPdfLabels(language)
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

  private addHeader(title: string, subtitle: string, companyName?: string) {
    // Amber header bar
    this.doc.setFillColor(217, 119, 6) // amber-700
    this.doc.rect(this.margin, this.margin, this.contentWidth, 28, 'F')

    // Company name
    this.doc.setFontSize(18)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.setTextColor(255, 255, 255)
    this.doc.text(companyName || 'The Bliss Massage at Home', this.margin + 10, this.margin + 12)

    // Document title
    this.doc.setFontSize(12)
    this.doc.setFont('Sarabun', 'normal')
    this.doc.text(title, this.margin + 10, this.margin + 20)

    this.currentY = this.margin + 35
    this.doc.setTextColor(0, 0, 0)
  }

  private addCompanyInfo(company: ReceiptPdfData['company']) {
    this.doc.setFontSize(9)
    this.doc.setTextColor(100, 100, 100)

    const companyName = this.lang === 'th' ? (company.nameTh || company.name) : company.name
    this.doc.text(companyName, this.margin, this.currentY)
    this.currentY += 5

    if (company.taxId) {
      this.doc.text(`${this.labels.taxId}: ${company.taxId}`, this.margin, this.currentY)
      this.currentY += 5
    }
    if (company.address) {
      const lines = this.doc.splitTextToSize(company.address, this.contentWidth)
      this.doc.text(lines, this.margin, this.currentY)
      this.currentY += lines.length * 4
    }
    if (company.phone) {
      this.doc.text(`${this.labels.tel}: ${company.phone}`, this.margin, this.currentY)
      this.currentY += 5
    }
    if (company.email) {
      this.doc.text(`${this.labels.email}: ${company.email}`, this.margin, this.currentY)
      this.currentY += 5
    }

    this.currentY += 3
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

  private addTotalBox(label: string, amount: number, color: [number, number, number]) {
    // Box background
    this.doc.setFillColor(color[0], color[1], color[2])
    this.doc.roundedRect(this.margin, this.currentY - 2, this.contentWidth, 18, 3, 3, 'F')

    this.doc.setFontSize(10)
    this.doc.setFont('Sarabun', 'normal')
    this.doc.setTextColor(80, 50, 0)
    this.doc.text(label, this.margin + 8, this.currentY + 6)

    this.doc.setFontSize(16)
    this.doc.setFont('Sarabun', 'bold')
    this.doc.text(
      `THB ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      this.margin + this.contentWidth - 8,
      this.currentY + 8,
      { align: 'right' }
    )

    this.currentY += 24
    this.doc.setTextColor(0, 0, 0)
  }

  private formatPaymentMethod(method: string, cardBrand?: string, cardLastDigits?: string): string {
    if (method === 'credit_card') {
      const brand = cardBrand || this.labels.creditCard
      return cardLastDigits ? `${brand} **** ${cardLastDigits}` : this.labels.creditCard
    }
    if (method === 'promptpay') return this.labels.promptPay
    if (method === 'internet_banking') return this.labels.bankTransfer
    return method
  }

  private addFooter(companyName?: string) {
    this.currentY += 5
    this.doc.setFontSize(9)
    this.doc.setFont('Sarabun', 'normal')
    this.doc.setTextColor(150, 150, 150)
    const name = companyName || 'The Bliss Massage at Home'
    const thankYou = this.lang === 'th'
      ? `ขอบคุณที่ใช้บริการ ${name}`
      : `Thank you for choosing ${name}`
    this.doc.text(thankYou, this.pageWidth / 2, this.currentY, { align: 'center' })
    this.currentY += 5
    this.doc.text('www.theblissmassageathome.com', this.pageWidth / 2, this.currentY, { align: 'center' })
  }

  generateReceipt(data: ReceiptPdfData): void {
    this.reset()

    const companyDisplayName = data.company.name || 'The Bliss Massage at Home'

    // Header
    this.addHeader(this.labels.receipt, this.labels.paymentReceipt, companyDisplayName)

    // Company Info
    this.addCompanyInfo(data.company)

    // Separator
    this.addSeparator()

    // Receipt Info Section
    this.addSectionTitle(this.labels.receiptInformation)
    this.addInfoRow(this.labels.receiptNo, data.receiptNumber)
    this.addInfoRow(this.labels.date, data.transactionDate)
    this.addInfoRow(this.labels.bookingNo, data.bookingNumber)
    this.addInfoRow(this.labels.customer, data.customerName)

    this.currentY += 3
    this.addSeparator()

    // Service Details Section
    this.addSectionTitle(this.labels.serviceDetails)
    const serviceName = this.lang === 'en' ? (data.serviceNameEn || data.serviceName) : data.serviceName
    this.addInfoRow(this.labels.service, serviceName)
    this.addInfoRow(this.labels.appointmentDate, data.bookingDate)
    this.addInfoRow(this.labels.time, data.bookingTime)

    if (data.addons && data.addons.length > 0) {
      this.currentY += 3
      for (const addon of data.addons) {
        const addonName = this.lang === 'en' ? (addon.nameEn || addon.name) : addon.name
        this.addInfoRow(
          `+ ${addonName}`,
          `THB ${addon.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        )
      }
    }

    this.currentY += 3
    this.addSeparator()

    // Payment Info
    this.addSectionTitle(this.labels.payment)
    this.addInfoRow(
      this.labels.method,
      this.formatPaymentMethod(data.paymentMethod, data.cardBrand, data.cardLastDigits)
    )

    this.currentY += 3

    // Total amount box (amber)
    this.addTotalBox(this.labels.totalAmount, data.amount, [254, 243, 199]) // amber-100

    // Footer
    this.addFooter(companyDisplayName)
  }

  generateCreditNote(data: CreditNotePdfData): void {
    this.reset()

    const companyDisplayName = data.company.name || 'The Bliss Massage at Home'

    // Header
    this.addHeader(this.labels.creditNote, this.labels.refundDocument, companyDisplayName)

    // Company Info
    this.addCompanyInfo(data.company)

    // Separator
    this.addSeparator()

    // Credit Note Info
    this.addSectionTitle(this.labels.creditNoteInformation)
    this.addInfoRow(this.labels.creditNoteNo, data.creditNoteNumber)
    this.addInfoRow(this.labels.date, data.refundDate)
    this.addInfoRow(this.labels.originalReceipt, data.originalReceiptNumber || '-')
    this.addInfoRow(this.labels.bookingNo, data.bookingNumber)
    this.addInfoRow(this.labels.customer, data.customerName)

    this.currentY += 3
    this.addSeparator()

    // Original Booking
    this.addSectionTitle(this.labels.originalBooking)
    const serviceName = this.lang === 'en' ? (data.serviceNameEn || data.serviceName) : data.serviceName
    this.addInfoRow(this.labels.service, serviceName)
    this.addInfoRow(
      this.labels.originalAmount,
      `THB ${data.originalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    )

    this.currentY += 3
    this.addSeparator()

    // Refund Details
    this.addSectionTitle(this.labels.refundDetails)
    this.addInfoRow(this.labels.refundPercentage, `${data.refundPercentage}%`)
    this.addInfoRow(this.labels.reason, data.refundReason || '-')
    this.addInfoRow(
      this.labels.refundMethod,
      this.formatPaymentMethod(data.paymentMethod, undefined, data.cardLastDigits)
    )

    this.currentY += 3

    // Refund amount box (green)
    this.addTotalBox(this.labels.refundAmount, data.refundAmount, [220, 252, 231]) // green-100

    // Timeline note
    this.doc.setFontSize(9)
    this.doc.setFont('Sarabun', 'normal')
    this.doc.setTextColor(100, 100, 100)
    this.doc.text(
      this.labels.refundTimeline,
      this.pageWidth / 2,
      this.currentY,
      { align: 'center' }
    )
    this.currentY += 8

    // Footer
    this.addFooter(companyDisplayName)
  }

  download(filename: string): void {
    this.doc.save(filename)
  }
}

/**
 * Download a receipt PDF
 */
export function downloadReceipt(data: ReceiptPdfData): void {
  const lang = data.language || 'th'
  const generator = new ReceiptPDFGenerator(lang)
  generator.generateReceipt(data)
  generator.download(`receipt-${data.receiptNumber}.pdf`)
}

/**
 * Download a credit note PDF
 */
export function downloadCreditNote(data: CreditNotePdfData): void {
  const lang = data.language || 'th'
  const generator = new ReceiptPDFGenerator(lang)
  generator.generateCreditNote(data)
  generator.download(`credit-note-${data.creditNoteNumber}.pdf`)
}
