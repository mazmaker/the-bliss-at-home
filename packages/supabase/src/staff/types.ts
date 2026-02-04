/**
 * Staff Profile Types
 */

// Document types
export type DocumentType = 'id_card' | 'certificate' | 'training' | 'other'
export type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired'

export interface StaffDocument {
  id: string
  staff_id: string
  type: DocumentType
  name: string
  file_url: string
  file_name: string
  status: DocumentStatus
  expires_at?: string
  notes?: string
  reviewed_by?: string
  reviewed_at?: string
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
  skill_name: string
  skill_name_en?: string
  level: number // 1-5
  years_experience?: number
  is_certified: boolean
  certificate_url?: string
  created_at: string
  updated_at: string
}

// Document type labels
export const DOCUMENT_TYPES: Record<DocumentType, { th: string; en: string }> = {
  id_card: { th: 'บัตรประชาชน', en: 'ID Card' },
  certificate: { th: 'ใบรับรองวิชาชีพ', en: 'Professional Certificate' },
  training: { th: 'หนังสือรับรองอบรม', en: 'Training Certificate' },
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
