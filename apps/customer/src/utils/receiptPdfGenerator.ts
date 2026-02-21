/**
 * Receipt & Credit Note PDF Generator
 * Client-side PDF generation using jsPDF
 * Pattern from apps/hotel/src/utils/simplePdfGenerator.ts
 */

import { jsPDF } from 'jspdf'

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
  addons?: { name: string; price: number }[]
  company: {
    name: string
    nameTh: string
    address: string
    phone: string
    email: string
    taxId: string
  }
}

export interface CreditNotePdfData {
  creditNoteNumber: string
  originalReceiptNumber: string
  refundDate: string
  bookingNumber: string
  serviceName: string
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
}

class ReceiptPDFGenerator {
  private doc: jsPDF
  private margin = 20
  private lineHeight = 7
  private currentY = 20
  private pageWidth = 210
  private contentWidth = 170

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4')
    this.doc.setFont('helvetica', 'normal')
  }

  private reset() {
    this.doc = new jsPDF('p', 'mm', 'a4')
    this.doc.setFont('helvetica', 'normal')
    this.currentY = this.margin
  }

  private addHeader(title: string, subtitle: string) {
    // Amber header bar
    this.doc.setFillColor(217, 119, 6) // amber-700
    this.doc.rect(this.margin, this.margin, this.contentWidth, 28, 'F')

    // Company name
    this.doc.setFontSize(18)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(255, 255, 255)
    this.doc.text('The Bliss at Home', this.margin + 10, this.margin + 12)

    // Document title
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(title, this.margin + 10, this.margin + 20)

    this.currentY = this.margin + 35
    this.doc.setTextColor(0, 0, 0)
  }

  private addCompanyInfo(company: ReceiptPdfData['company']) {
    this.doc.setFontSize(9)
    this.doc.setTextColor(100, 100, 100)

    const companyName = company.nameTh || company.name || 'The Bliss at Home'
    this.doc.text(companyName, this.margin, this.currentY)
    this.currentY += 5

    if (company.taxId) {
      this.doc.text(`Tax ID: ${company.taxId}`, this.margin, this.currentY)
      this.currentY += 5
    }
    if (company.address) {
      // Split long addresses
      const lines = this.doc.splitTextToSize(company.address, this.contentWidth)
      this.doc.text(lines, this.margin, this.currentY)
      this.currentY += lines.length * 4
    }
    if (company.phone) {
      this.doc.text(`Tel: ${company.phone}`, this.margin, this.currentY)
      this.currentY += 5
    }
    if (company.email) {
      this.doc.text(`Email: ${company.email}`, this.margin, this.currentY)
      this.currentY += 5
    }

    this.currentY += 3
    this.doc.setTextColor(0, 0, 0)
  }

  private addInfoRow(label: string, value: string) {
    this.doc.setFontSize(10)

    // Label
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(100, 100, 100)
    this.doc.text(label, this.margin, this.currentY)

    // Value
    this.doc.setFont('helvetica', 'bold')
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
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(50, 50, 50)
    this.doc.text(title, this.margin, this.currentY)
    this.currentY += 8
  }

  private addTotalBox(label: string, amount: number, color: [number, number, number]) {
    // Box background
    this.doc.setFillColor(color[0], color[1], color[2])
    this.doc.roundedRect(this.margin, this.currentY - 2, this.contentWidth, 18, 3, 3, 'F')

    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(80, 50, 0)
    this.doc.text(label, this.margin + 8, this.currentY + 6)

    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'bold')
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
      const brand = cardBrand || 'Card'
      return cardLastDigits ? `${brand} **** ${cardLastDigits}` : 'Credit Card'
    }
    if (method === 'promptpay') return 'PromptPay'
    if (method === 'internet_banking') return 'Bank Transfer'
    return method
  }

  private addFooter() {
    this.currentY += 5
    this.doc.setFontSize(9)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(150, 150, 150)
    this.doc.text('Thank you for choosing The Bliss at Home', this.pageWidth / 2, this.currentY, { align: 'center' })
    this.currentY += 5
    this.doc.text('www.theblissathome.com', this.pageWidth / 2, this.currentY, { align: 'center' })
  }

  generateReceipt(data: ReceiptPdfData): void {
    this.reset()

    // Header
    this.addHeader('RECEIPT', 'Payment Receipt')

    // Company Info
    this.addCompanyInfo(data.company)

    // Separator
    this.addSeparator()

    // Receipt Info Section
    this.addSectionTitle('Receipt Information')
    this.addInfoRow('Receipt No.', data.receiptNumber)
    this.addInfoRow('Date', data.transactionDate)
    this.addInfoRow('Booking No.', data.bookingNumber)
    this.addInfoRow('Customer', data.customerName)

    this.currentY += 3
    this.addSeparator()

    // Service Details Section
    this.addSectionTitle('Service Details')
    this.addInfoRow('Service', data.serviceNameEn || data.serviceName)
    this.addInfoRow('Appointment Date', data.bookingDate)
    this.addInfoRow('Time', data.bookingTime)

    if (data.addons && data.addons.length > 0) {
      this.currentY += 3
      for (const addon of data.addons) {
        this.addInfoRow(
          `+ ${addon.name}`,
          `THB ${addon.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        )
      }
    }

    this.currentY += 3
    this.addSeparator()

    // Payment Info
    this.addSectionTitle('Payment')
    this.addInfoRow(
      'Method',
      this.formatPaymentMethod(data.paymentMethod, data.cardBrand, data.cardLastDigits)
    )

    this.currentY += 3

    // Total amount box (amber)
    this.addTotalBox('Total Amount', data.amount, [254, 243, 199]) // amber-100

    // Footer
    this.addFooter()
  }

  generateCreditNote(data: CreditNotePdfData): void {
    this.reset()

    // Header
    this.addHeader('CREDIT NOTE', 'Refund Document')

    // Company Info
    this.addCompanyInfo(data.company)

    // Separator
    this.addSeparator()

    // Credit Note Info
    this.addSectionTitle('Credit Note Information')
    this.addInfoRow('Credit Note No.', data.creditNoteNumber)
    this.addInfoRow('Date', data.refundDate)
    this.addInfoRow('Original Receipt', data.originalReceiptNumber || '-')
    this.addInfoRow('Booking No.', data.bookingNumber)
    this.addInfoRow('Customer', data.customerName)

    this.currentY += 3
    this.addSeparator()

    // Original Booking
    this.addSectionTitle('Original Booking')
    this.addInfoRow('Service', data.serviceName)
    this.addInfoRow(
      'Original Amount',
      `THB ${data.originalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    )

    this.currentY += 3
    this.addSeparator()

    // Refund Details
    this.addSectionTitle('Refund Details')
    this.addInfoRow('Refund Percentage', `${data.refundPercentage}%`)
    this.addInfoRow('Reason', data.refundReason || '-')
    this.addInfoRow(
      'Refund Method',
      this.formatPaymentMethod(data.paymentMethod, undefined, data.cardLastDigits)
    )

    this.currentY += 3

    // Refund amount box (green)
    this.addTotalBox('Refund Amount', data.refundAmount, [220, 252, 231]) // green-100

    // Timeline note
    this.doc.setFontSize(9)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(100, 100, 100)
    this.doc.text(
      'Refund will be processed within 5-10 business days',
      this.pageWidth / 2,
      this.currentY,
      { align: 'center' }
    )
    this.currentY += 8

    // Footer
    this.addFooter()
  }

  download(filename: string): void {
    this.doc.save(filename)
  }
}

/**
 * Download a receipt PDF
 */
export function downloadReceipt(data: ReceiptPdfData): void {
  const generator = new ReceiptPDFGenerator()
  generator.generateReceipt(data)
  generator.download(`receipt-${data.receiptNumber}.pdf`)
}

/**
 * Download a credit note PDF
 */
export function downloadCreditNote(data: CreditNotePdfData): void {
  const generator = new ReceiptPDFGenerator()
  generator.generateCreditNote(data)
  generator.download(`credit-note-${data.creditNoteNumber}.pdf`)
}
