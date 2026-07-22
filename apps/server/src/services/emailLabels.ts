/**
 * Email label translations for the customer Receipt, Credit-Note & Reminder emails.
 * Used by receiptEmailTemplate / creditNoteEmailTemplate / sendCustomerReminder
 * (emailService.ts) and the subject lines built in routes/receipts.ts.
 *
 * Mirrors the client PDF label set (apps/customer/src/utils/pdfLabels.ts) for the shared
 * keys and adds the email-only prose (salutation, intros, footer, disclaimer, subjects).
 *
 * NOTE: cn/kr/jp copy is a FIRST PASS — pending native-speaker semantic review before the
 * customer-facing rollout. Any unlisted lang falls back to 'th' (Thai-business default).
 */

export type EmailLanguage = 'th' | 'en' | 'cn' | 'kr' | 'jp'

export interface EmailLabels {
  // Header / titles
  paymentReceipt: string
  creditNoteTitle: string
  // Receipt body
  receiptThankYouIntro: string
  receiptInformation: string
  receiptNo: string
  bookingNo: string
  receiptIssueDate: string
  serviceDetails: string
  service: string
  appointmentDate: string
  time: string
  totalPaid: string
  paidVia: string
  receiptIssuerInfo: string
  taxId: string
  tel: string
  email: string
  footerTagline: string
  autoEmailDisclaimer: string
  // Credit-note body
  creditNoteIntro: string
  creditNoteInformation: string
  creditNoteNo: string
  originalReceipt: string
  creditNoteIssueDate: string
  originalBookingDetails: string
  originalAmount: string
  cancellationReason: string
  refundAmountLabel: string
  refundedVia: string
  refundTimeline: string
  creditNoteIssuerInfo: string
  refundQuestionContactPrefix: string
  // Payment methods
  paymentMethods: { creditCard: string; promptPay: string; bankTransfer: string }
  // Email subjects
  receiptSubject: string
  creditNoteSubject: string
  // Reminder email
  reminderSubtitle: string
  reminderIntro: string
  date: string
  duration: string
  minutesUnit: string
  location: string
  address: string
}

const LABELS: Record<EmailLanguage, EmailLabels> = {
  th: {
    paymentReceipt: 'ใบเสร็จรับเงิน',
    creditNoteTitle: 'ใบลดหนี้',
    receiptThankYouIntro: 'ขอบคุณสำหรับการชำระเงิน รายละเอียดใบเสร็จของคุณมีดังนี้',
    receiptInformation: 'รายละเอียดใบเสร็จ',
    receiptNo: 'เลขที่ใบเสร็จ',
    bookingNo: 'หมายเลขการจอง',
    receiptIssueDate: 'วันที่ออกใบเสร็จ',
    serviceDetails: 'รายละเอียดบริการ',
    service: 'บริการ',
    appointmentDate: 'วันที่นัดหมาย',
    time: 'เวลา',
    totalPaid: 'ยอดชำระเงินทั้งหมด',
    paidVia: 'ชำระผ่าน',
    receiptIssuerInfo: 'ข้อมูลผู้ออกใบเสร็จ',
    taxId: 'เลขประจำตัวผู้เสียภาษี',
    tel: 'โทร',
    email: 'อีเมล',
    footerTagline: 'บริการนวดและสปาถึงที่',
    autoEmailDisclaimer: 'อีเมลนี้ถูกส่งโดยอัตโนมัติ กรุณาอย่าตอบกลับ',
    creditNoteIntro: 'เราขอแจ้งรายละเอียดการคืนเงินสำหรับการจองของคุณ',
    creditNoteInformation: 'รายละเอียดใบลดหนี้',
    creditNoteNo: 'เลขที่ใบลดหนี้',
    originalReceipt: 'อ้างอิงใบเสร็จ',
    creditNoteIssueDate: 'วันที่ออกใบลดหนี้',
    originalBookingDetails: 'รายละเอียดการจองเดิม',
    originalAmount: 'ยอดชำระเดิม',
    cancellationReason: 'เหตุผลการยกเลิก',
    refundAmountLabel: 'ยอดเงินคืน',
    refundedVia: 'คืนเงินผ่าน',
    refundTimeline: 'เงินจะเข้าบัญชีภายใน 5-10 วันทำการ',
    creditNoteIssuerInfo: 'ข้อมูลผู้ออกใบลดหนี้',
    refundQuestionContactPrefix: 'หากคุณมีคำถามเกี่ยวกับการคืนเงิน กรุณาติดต่อเราได้ที่',
    paymentMethods: { creditCard: 'บัตรเครดิต', promptPay: 'พร้อมเพย์', bankTransfer: 'โอนผ่านธนาคาร' },
    receiptSubject: 'ใบเสร็จรับเงิน',
    creditNoteSubject: 'ใบลดหนี้',
    reminderSubtitle: 'แจ้งเตือนการนัดหมาย',
    reminderIntro: 'ขอแจ้งเตือนการนัดหมายของคุณที่กำลังจะถึง',
    date: 'วันที่',
    duration: 'ระยะเวลา',
    minutesUnit: 'นาที',
    location: 'สถานที่',
    address: 'ที่อยู่',
  },
  en: {
    paymentReceipt: 'Payment Receipt',
    creditNoteTitle: 'Credit Note',
    receiptThankYouIntro: 'Thank you for your payment. Here are your receipt details:',
    receiptInformation: 'Receipt Information',
    receiptNo: 'Receipt No.',
    bookingNo: 'Booking No.',
    receiptIssueDate: 'Receipt Date',
    serviceDetails: 'Service Details',
    service: 'Service',
    appointmentDate: 'Appointment Date',
    time: 'Time',
    totalPaid: 'Total Amount Paid',
    paidVia: 'Paid via',
    receiptIssuerInfo: 'Issued By',
    taxId: 'Tax ID',
    tel: 'Tel',
    email: 'Email',
    footerTagline: 'On-demand massage & spa service',
    autoEmailDisclaimer: 'This email was sent automatically. Please do not reply.',
    creditNoteIntro: 'We would like to inform you of the refund details for your booking.',
    creditNoteInformation: 'Credit Note Information',
    creditNoteNo: 'Credit Note No.',
    originalReceipt: 'Original Receipt',
    creditNoteIssueDate: 'Credit Note Date',
    originalBookingDetails: 'Original Booking Details',
    originalAmount: 'Original Amount',
    cancellationReason: 'Cancellation Reason',
    refundAmountLabel: 'Refund Amount',
    refundedVia: 'Refunded via',
    refundTimeline: 'The refund will be credited within 5-10 business days',
    creditNoteIssuerInfo: 'Issued By',
    refundQuestionContactPrefix: 'If you have any questions about your refund, please contact us at',
    paymentMethods: { creditCard: 'Credit Card', promptPay: 'PromptPay', bankTransfer: 'Bank Transfer' },
    receiptSubject: 'Payment Receipt',
    creditNoteSubject: 'Credit Note',
    reminderSubtitle: 'Booking Reminder',
    reminderIntro: 'This is a reminder of your upcoming appointment.',
    date: 'Date',
    duration: 'Duration',
    minutesUnit: 'minutes',
    location: 'Location',
    address: 'Address',
  },
  cn: {
    paymentReceipt: '付款收据',
    creditNoteTitle: '退款单',
    receiptThankYouIntro: '感谢您的付款，以下是您的收据详情：',
    receiptInformation: '收据信息',
    receiptNo: '收据编号',
    bookingNo: '预订编号',
    receiptIssueDate: '收据开具日期',
    serviceDetails: '服务详情',
    service: '服务',
    appointmentDate: '预约日期',
    time: '时间',
    totalPaid: '支付总额',
    paidVia: '支付方式',
    receiptIssuerInfo: '开票方信息',
    taxId: '税号',
    tel: '电话',
    email: '邮箱',
    footerTagline: '上门按摩与水疗服务',
    autoEmailDisclaimer: '此邮件为系统自动发送，请勿回复。',
    creditNoteIntro: '现将您预订的退款详情通知如下。',
    creditNoteInformation: '退款单信息',
    creditNoteNo: '退款单编号',
    originalReceipt: '原始收据',
    creditNoteIssueDate: '退款单开具日期',
    originalBookingDetails: '原始预订详情',
    originalAmount: '原始金额',
    cancellationReason: '取消原因',
    refundAmountLabel: '退款金额',
    refundedVia: '退款方式',
    refundTimeline: '退款将在 5-10 个工作日内到账',
    creditNoteIssuerInfo: '开票方信息',
    refundQuestionContactPrefix: '如您对退款有任何疑问，请通过以下方式联系我们：',
    paymentMethods: { creditCard: '信用卡', promptPay: 'PromptPay', bankTransfer: '银行转账' },
    receiptSubject: '付款收据',
    creditNoteSubject: '退款单',
    reminderSubtitle: '预约提醒',
    reminderIntro: '提醒您即将到来的预约。',
    date: '日期',
    duration: '时长',
    minutesUnit: '分钟',
    location: '地点',
    address: '地址',
  },
  kr: {
    paymentReceipt: '결제 영수증',
    creditNoteTitle: '환불 명세서',
    receiptThankYouIntro: '결제해 주셔서 감사합니다. 영수증 세부 정보는 다음과 같습니다:',
    receiptInformation: '영수증 정보',
    receiptNo: '영수증 번호',
    bookingNo: '예약 번호',
    receiptIssueDate: '영수증 발행일',
    serviceDetails: '서비스 상세',
    service: '서비스',
    appointmentDate: '예약 날짜',
    time: '시간',
    totalPaid: '총 결제 금액',
    paidVia: '결제 수단',
    receiptIssuerInfo: '발행처 정보',
    taxId: '사업자등록번호',
    tel: '전화',
    email: '이메일',
    footerTagline: '출장 마사지 및 스파 서비스',
    autoEmailDisclaimer: '이 이메일은 자동으로 발송되었습니다. 회신하지 마십시오.',
    creditNoteIntro: '고객님의 예약에 대한 환불 세부 정보를 안내해 드립니다.',
    creditNoteInformation: '환불 명세 정보',
    creditNoteNo: '환불 명세서 번호',
    originalReceipt: '원본 영수증',
    creditNoteIssueDate: '환불 명세서 발행일',
    originalBookingDetails: '원본 예약 상세',
    originalAmount: '원래 금액',
    cancellationReason: '취소 사유',
    refundAmountLabel: '환불 금액',
    refundedVia: '환불 수단',
    refundTimeline: '환불은 영업일 기준 5~10일 이내에 입금됩니다',
    creditNoteIssuerInfo: '발행처 정보',
    refundQuestionContactPrefix: '환불에 관한 문의 사항이 있으시면 아래로 연락해 주십시오:',
    paymentMethods: { creditCard: '신용카드', promptPay: 'PromptPay', bankTransfer: '계좌 이체' },
    receiptSubject: '결제 영수증',
    creditNoteSubject: '환불 명세서',
    reminderSubtitle: '예약 알림',
    reminderIntro: '다가오는 예약을 알려 드립니다.',
    date: '날짜',
    duration: '소요 시간',
    minutesUnit: '분',
    location: '장소',
    address: '주소',
  },
  jp: {
    paymentReceipt: 'お支払い領収書',
    creditNoteTitle: '返金明細書',
    receiptThankYouIntro: 'お支払いありがとうございます。領収書の詳細は以下のとおりです:',
    receiptInformation: '領収書情報',
    receiptNo: '領収書番号',
    bookingNo: '予約番号',
    receiptIssueDate: '領収書発行日',
    serviceDetails: 'サービス詳細',
    service: 'サービス',
    appointmentDate: '予約日',
    time: '時間',
    totalPaid: 'お支払い総額',
    paidVia: 'お支払い方法',
    receiptIssuerInfo: '発行者情報',
    taxId: '税番号',
    tel: '電話',
    email: 'メール',
    footerTagline: '出張マッサージ・スパサービス',
    autoEmailDisclaimer: 'このメールは自動送信されています。返信しないでください。',
    creditNoteIntro: 'ご予約の返金詳細をお知らせいたします。',
    creditNoteInformation: '返金明細情報',
    creditNoteNo: '返金明細番号',
    originalReceipt: '元の領収書',
    creditNoteIssueDate: '返金明細発行日',
    originalBookingDetails: '元の予約詳細',
    originalAmount: '元の金額',
    cancellationReason: 'キャンセル理由',
    refundAmountLabel: '返金額',
    refundedVia: '返金方法',
    refundTimeline: '返金は 5〜10 営業日以内に入金されます',
    creditNoteIssuerInfo: '発行者情報',
    refundQuestionContactPrefix: '返金に関するご質問は、こちらまでお問い合わせください:',
    paymentMethods: { creditCard: 'クレジットカード', promptPay: 'PromptPay', bankTransfer: '銀行振込' },
    receiptSubject: 'お支払い領収書',
    creditNoteSubject: '返金明細書',
    reminderSubtitle: 'ご予約のリマインダー',
    reminderIntro: 'まもなくご予約のお時間です。',
    date: '日付',
    duration: '所要時間',
    minutesUnit: '分',
    location: '場所',
    address: '住所',
  },
}

/** Returns the label set for a language; any unknown lang falls back to Thai. */
export function getEmailLabels(lang?: string): EmailLabels {
  return LABELS[(lang as EmailLanguage)] || LABELS.th
}

/** Full salutation line — word order differs per language (KR/JP use name + honorific suffix). */
export function emailSalutation(lang: string | undefined, name: string): string {
  switch (lang) {
    case 'en':
      return `Dear ${name},`
    case 'cn':
      return `尊敬的 ${name}：`
    case 'kr':
      return `${name}님께,`
    case 'jp':
      return `${name} 様,`
    default:
      return `เรียน คุณ${name},`
  }
}

/** Full "thank you for choosing {company}" line — word order differs per language. */
export function emailThankYou(lang: string | undefined, company: string): string {
  switch (lang) {
    case 'en':
      return `Thank you for choosing ${company}`
    case 'cn':
      return `感谢您选择 ${company}`
    case 'kr':
      return `${company}를 이용해 주셔서 감사합니다`
    case 'jp':
      return `${company} をご利用いただきありがとうございます`
    default:
      return `ขอบคุณที่ใช้บริการ ${company}`
  }
}

/** Localized payment-method label incl. the masked card suffix; unknown method → raw value. */
export function paymentMethodLabel(lang: string | undefined, method: string, cardLastDigits?: string): string {
  const m = getEmailLabels(lang).paymentMethods
  if (method === 'credit_card') return `${m.creditCard}${cardLastDigits ? ` •••• ${cardLastDigits}` : ''}`
  if (method === 'promptpay') return m.promptPay
  if (method === 'internet_banking') return m.bankTransfer
  return method
}

/** Full localized reminder-email subject line (word order differs per language). */
export function reminderSubject(lang: string | undefined, minutes: number): string {
  switch (lang) {
    case 'en':
      return `Reminder: your appointment in ${minutes} minutes`
    case 'cn':
      return `提醒：您的预约还有 ${minutes} 分钟`
    case 'kr':
      return `알림: 예약까지 ${minutes}분 남았습니다`
    case 'jp':
      return `リマインダー: ご予約まであと ${minutes} 分`
    default:
      return `แจ้งเตือน: นัดหมายของคุณอีก ${minutes} นาที`
  }
}
