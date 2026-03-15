/**
 * PDF label translations for Receipt & Credit Note
 * Used by receiptPdfGenerator.ts (non-React context)
 */

export type PdfLanguage = 'th' | 'en' | 'cn'

interface PdfLabels {
  // Receipt
  receipt: string
  paymentReceipt: string
  receiptInformation: string
  receiptNo: string
  date: string
  bookingNo: string
  customer: string
  serviceDetails: string
  service: string
  appointmentDate: string
  time: string
  payment: string
  method: string
  totalAmount: string
  // Credit Note
  creditNote: string
  refundDocument: string
  creditNoteInformation: string
  creditNoteNo: string
  originalReceipt: string
  originalBooking: string
  originalAmount: string
  refundDetails: string
  refundPercentage: string
  reason: string
  refundMethod: string
  refundAmount: string
  refundTimeline: string
  // Footer
  thankYou: string
  // Payment methods
  creditCard: string
  promptPay: string
  bankTransfer: string
  // Company
  taxId: string
  tel: string
  email: string
}

const labels: Record<PdfLanguage, PdfLabels> = {
  th: {
    receipt: 'ใบเสร็จรับเงิน',
    paymentReceipt: 'ใบเสร็จรับเงิน',
    receiptInformation: 'ข้อมูลใบเสร็จ',
    receiptNo: 'เลขที่ใบเสร็จ',
    date: 'วันที่',
    bookingNo: 'เลขที่การจอง',
    customer: 'ลูกค้า',
    serviceDetails: 'รายละเอียดบริการ',
    service: 'บริการ',
    appointmentDate: 'วันนัดหมาย',
    time: 'เวลา',
    payment: 'การชำระเงิน',
    method: 'ช่องทาง',
    totalAmount: 'ยอดรวมทั้งสิ้น',
    creditNote: 'ใบลดหนี้',
    refundDocument: 'เอกสารคืนเงิน',
    creditNoteInformation: 'ข้อมูลใบลดหนี้',
    creditNoteNo: 'เลขที่ใบลดหนี้',
    originalReceipt: 'ใบเสร็จเดิม',
    originalBooking: 'การจองเดิม',
    originalAmount: 'ยอดเดิม',
    refundDetails: 'รายละเอียดการคืนเงิน',
    refundPercentage: 'เปอร์เซ็นต์คืนเงิน',
    reason: 'เหตุผล',
    refundMethod: 'ช่องทางคืนเงิน',
    refundAmount: 'ยอดคืนเงิน',
    refundTimeline: 'การคืนเงินจะดำเนินการภายใน 5-10 วันทำการ',
    thankYou: 'ขอบคุณที่ใช้บริการ The Bliss at Home',
    creditCard: 'บัตรเครดิต/เดบิต',
    promptPay: 'พร้อมเพย์',
    bankTransfer: 'โอนผ่านธนาคาร',
    taxId: 'เลขประจำตัวผู้เสียภาษี',
    tel: 'โทร',
    email: 'อีเมล',
  },
  en: {
    receipt: 'RECEIPT',
    paymentReceipt: 'Payment Receipt',
    receiptInformation: 'Receipt Information',
    receiptNo: 'Receipt No.',
    date: 'Date',
    bookingNo: 'Booking No.',
    customer: 'Customer',
    serviceDetails: 'Service Details',
    service: 'Service',
    appointmentDate: 'Appointment Date',
    time: 'Time',
    payment: 'Payment',
    method: 'Method',
    totalAmount: 'Total Amount',
    creditNote: 'CREDIT NOTE',
    refundDocument: 'Refund Document',
    creditNoteInformation: 'Credit Note Information',
    creditNoteNo: 'Credit Note No.',
    originalReceipt: 'Original Receipt',
    originalBooking: 'Original Booking',
    originalAmount: 'Original Amount',
    refundDetails: 'Refund Details',
    refundPercentage: 'Refund Percentage',
    reason: 'Reason',
    refundMethod: 'Refund Method',
    refundAmount: 'Refund Amount',
    refundTimeline: 'Refund will be processed within 5-10 business days',
    thankYou: 'Thank you for choosing The Bliss at Home',
    creditCard: 'Credit Card',
    promptPay: 'PromptPay',
    bankTransfer: 'Bank Transfer',
    taxId: 'Tax ID',
    tel: 'Tel',
    email: 'Email',
  },
  cn: {
    receipt: 'RECEIPT',
    paymentReceipt: 'Payment Receipt',
    receiptInformation: 'Receipt Information',
    receiptNo: 'Receipt No.',
    date: 'Date',
    bookingNo: 'Booking No.',
    customer: 'Customer',
    serviceDetails: 'Service Details',
    service: 'Service',
    appointmentDate: 'Appointment Date',
    time: 'Time',
    payment: 'Payment',
    method: 'Method',
    totalAmount: 'Total Amount',
    creditNote: 'CREDIT NOTE',
    refundDocument: 'Refund Document',
    creditNoteInformation: 'Credit Note Information',
    creditNoteNo: 'Credit Note No.',
    originalReceipt: 'Original Receipt',
    originalBooking: 'Original Booking',
    originalAmount: 'Original Amount',
    refundDetails: 'Refund Details',
    refundPercentage: 'Refund Percentage',
    reason: 'Reason',
    refundMethod: 'Refund Method',
    refundAmount: 'Refund Amount',
    refundTimeline: 'Refund will be processed within 5-10 business days',
    thankYou: 'Thank you for choosing The Bliss at Home',
    creditCard: 'Credit Card',
    promptPay: 'PromptPay',
    bankTransfer: 'Bank Transfer',
    taxId: 'Tax ID',
    tel: 'Tel',
    email: 'Email',
  },
}

export function getPdfLabels(lang: PdfLanguage): PdfLabels {
  return labels[lang] || labels.en
}
