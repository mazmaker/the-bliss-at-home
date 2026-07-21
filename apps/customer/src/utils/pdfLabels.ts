/**
 * PDF label translations for Receipt & Credit Note
 * Used by receiptPdfGenerator.ts (non-React context)
 */

export type PdfLanguage = 'th' | 'en' | 'cn' | 'kr' | 'jp'

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

// th/en/cn/kr/jp all authored below. cn/kr/jp receipts embed a lazily-fetched Noto CJK
// font (see cjkFont.ts + receiptPdfGenerator.ts). Any unlisted lang falls back to English.
// NOTE: cn/kr/jp copy is a first pass — pending native-speaker semantic review.
const labels: Partial<Record<PdfLanguage, PdfLabels>> = {
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
    receipt: '收据',
    paymentReceipt: '付款收据',
    receiptInformation: '收据信息',
    receiptNo: '收据编号',
    date: '日期',
    bookingNo: '预订编号',
    customer: '客户',
    serviceDetails: '服务详情',
    service: '服务',
    appointmentDate: '预约日期',
    time: '时间',
    payment: '付款',
    method: '方式',
    totalAmount: '总金额',
    creditNote: '退款单',
    refundDocument: '退款凭证',
    creditNoteInformation: '退款单信息',
    creditNoteNo: '退款单编号',
    originalReceipt: '原始收据',
    originalBooking: '原始预订',
    originalAmount: '原始金额',
    refundDetails: '退款详情',
    refundPercentage: '退款比例',
    reason: '原因',
    refundMethod: '退款方式',
    refundAmount: '退款金额',
    refundTimeline: '退款将在 5-10 个工作日内处理',
    thankYou: '感谢您选择 The Bliss at Home',
    creditCard: '信用卡',
    promptPay: 'PromptPay',
    bankTransfer: '银行转账',
    taxId: '税号',
    tel: '电话',
    email: '邮箱',
  },
  kr: {
    receipt: '영수증',
    paymentReceipt: '결제 영수증',
    receiptInformation: '영수증 정보',
    receiptNo: '영수증 번호',
    date: '날짜',
    bookingNo: '예약 번호',
    customer: '고객',
    serviceDetails: '서비스 상세',
    service: '서비스',
    appointmentDate: '예약 날짜',
    time: '시간',
    payment: '결제',
    method: '방법',
    totalAmount: '총 금액',
    creditNote: '환불 명세서',
    refundDocument: '환불 증빙',
    creditNoteInformation: '환불 명세 정보',
    creditNoteNo: '환불 명세서 번호',
    originalReceipt: '원본 영수증',
    originalBooking: '원본 예약',
    originalAmount: '원래 금액',
    refundDetails: '환불 상세',
    refundPercentage: '환불 비율',
    reason: '사유',
    refundMethod: '환불 방법',
    refundAmount: '환불 금액',
    refundTimeline: '환불은 영업일 기준 5~10일 이내에 처리됩니다',
    thankYou: 'The Bliss at Home를 이용해 주셔서 감사합니다',
    creditCard: '신용카드',
    promptPay: 'PromptPay',
    bankTransfer: '계좌 이체',
    taxId: '사업자등록번호',
    tel: '전화',
    email: '이메일',
  },
  jp: {
    receipt: '領収書',
    paymentReceipt: 'お支払い領収書',
    receiptInformation: '領収書情報',
    receiptNo: '領収書番号',
    date: '日付',
    bookingNo: '予約番号',
    customer: 'お客様',
    serviceDetails: 'サービス詳細',
    service: 'サービス',
    appointmentDate: '予約日',
    time: '時間',
    payment: 'お支払い',
    method: '方法',
    totalAmount: '合計金額',
    creditNote: '返金明細書',
    refundDocument: '返金書類',
    creditNoteInformation: '返金明細情報',
    creditNoteNo: '返金明細番号',
    originalReceipt: '元の領収書',
    originalBooking: '元の予約',
    originalAmount: '元の金額',
    refundDetails: '返金詳細',
    refundPercentage: '返金割合',
    reason: '理由',
    refundMethod: '返金方法',
    refundAmount: '返金額',
    refundTimeline: '返金は 5〜10 営業日以内に処理されます',
    thankYou: 'The Bliss at Home をご利用いただきありがとうございます',
    creditCard: 'クレジットカード',
    promptPay: 'PromptPay',
    bankTransfer: '銀行振込',
    taxId: '税番号',
    tel: '電話',
    email: 'メール',
  },
}

export function getPdfLabels(lang: PdfLanguage): PdfLabels {
  return labels[lang] || (labels.en as PdfLabels)
}
