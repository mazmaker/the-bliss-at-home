/**
 * Staff Profile Types
 */

// Document types (match Admin app)
export type DocumentType = 'id_card' | 'license' | 'certificate' | 'bank_statement' | 'other'
export type DocumentStatus = 'pending' | 'reviewing' | 'verified' | 'rejected'

export interface StaffDocument {
  id: string
  staff_id: string
  document_type: DocumentType
  file_url: string
  file_name: string
  file_size: number
  mime_type: string
  verification_status: DocumentStatus
  verified_by?: string
  verified_at?: string
  rejection_reason?: string
  notes?: string
  uploaded_at: string
  expires_at?: string
  created_at: string
  updated_at: string
}

// Service Area
export interface ServiceArea {
  id: string
  staff_id: string
  province: string
  district?: string
  subdistrict?: string
  postal_code?: string
  latitude?: number
  longitude?: number
  radius_km: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Staff Skill from database
export interface StaffSkill {
  id: string
  staff_id: string
  skill_id: string
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  years_experience?: number
  created_at: string
  skills?: {
    name_th: string
    name_en: string
  }
}

// Document type labels (match Admin app)
export const DOCUMENT_TYPES: Record<DocumentType, { th: string; en: string }> = {
  id_card: { th: 'สำเนาบัตรประชาชน', en: 'ID Card' },
  license: { th: 'ใบประกอบวิชาชีพ', en: 'Professional License' },
  certificate: { th: 'ใบรับรองการอบรม', en: 'Training Certificate' },
  bank_statement: { th: 'สำเนาบัญชีธนาคาร', en: 'Bank Statement' },
  other: { th: 'เอกสารอื่นๆ', en: 'Other Documents' },
}

// Thai provinces for service area
export const THAI_PROVINCES = [
  'กรุงเทพมหานคร',
  'กระบี่',
  'กาญจนบุรี',
  'กาฬสินธุ์',
  'กำแพงเพชร',
  'ขอนแก่น',
  'จันทบุรี',
  'ฉะเชิงเทรา',
  'ชลบุรี',
  'ชัยนาท',
  'ชัยภูมิ',
  'ชุมพร',
  'เชียงราย',
  'เชียงใหม่',
  'ตรัง',
  'ตราด',
  'ตาก',
  'นครนายก',
  'นครปฐม',
  'นครพนม',
  'นครราชสีมา',
  'นครศรีธรรมราช',
  'นครสวรรค์',
  'นนทบุรี',
  'นราธิวาส',
  'น่าน',
  'บึงกาฬ',
  'บุรีรัมย์',
  'ปทุมธานี',
  'ประจวบคีรีขันธ์',
  'ปราจีนบุรี',
  'ปัตตานี',
  'พระนครศรีอยุธยา',
  'พะเยา',
  'พังงา',
  'พัทลุง',
  'พิจิตร',
  'พิษณุโลก',
  'เพชรบุรี',
  'เพชรบูรณ์',
  'แพร่',
  'ภูเก็ต',
  'มหาสารคาม',
  'มุกดาหาร',
  'แม่ฮ่องสอน',
  'ยโสธร',
  'ยะลา',
  'ร้อยเอ็ด',
  'ระนอง',
  'ระยอง',
  'ราชบุรี',
  'ลพบุรี',
  'ลำปาง',
  'ลำพูน',
  'เลย',
  'ศรีสะเกษ',
  'สกลนคร',
  'สงขลา',
  'สตูล',
  'สมุทรปราการ',
  'สมุทรสงคราม',
  'สมุทรสาคร',
  'สระแก้ว',
  'สระบุรี',
  'สิงห์บุรี',
  'สุโขทัย',
  'สุพรรณบุรี',
  'สุราษฎร์ธานี',
  'สุรินทร์',
  'หนองคาย',
  'หนองบัวลำภู',
  'อ่างทอง',
  'อำนาจเจริญ',
  'อุดรธานี',
  'อุตรดิตถ์',
  'อุทัยธานี',
  'อุบลราชธานี',
]

// Staff Eligibility (for checking if staff can start working)
export interface StaffEligibility {
  canWork: boolean
  reasons: string[]
  status: 'active' | 'inactive' | 'pending'
  documents: {
    id_card: { uploaded: boolean; verified: boolean; status?: string }
    bank_statement: { uploaded: boolean; verified: boolean; status?: string }
  }
}
