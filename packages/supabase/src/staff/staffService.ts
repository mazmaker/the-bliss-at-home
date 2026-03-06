/**
 * Staff Profile Service
 * Handles documents, service areas, skills, and profile updates
 */

import { supabase } from '../auth/supabaseClient'
import type { StaffDocument, ServiceArea, StaffSkill, DocumentType, StaffGender, StaffEligibility } from './types'

// ============================================
// Profile Operations
// ============================================

/**
 * Update staff profile
 */
export async function updateProfile(
  staffId: string,
  data: {
    full_name?: string
    phone?: string
    address?: string
    avatar_url?: string
  }
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', staffId)

  if (error) throw error
}

/**
 * Update staff data (name, address, bio, etc.)
 */
export async function updateStaffData(
  profileId: string,
  data: {
    name_th?: string
    name_en?: string
    phone?: string
    id_card?: string
    address?: string
    bio_th?: string
    bio_en?: string
    gender?: StaffGender
  }
): Promise<void> {
  // First, get the staff ID and current gender from profile ID
  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('id, gender')
    .eq('profile_id', profileId)
    .single()

  if (staffError) throw staffError
  if (!staffData) throw new Error('Staff record not found')

  // Validate gender change: block if staff has active jobs with hard gender requirement
  if (data.gender && staffData.gender && data.gender !== staffData.gender) {
    const { data: activeJobs } = await supabase
      .from('jobs')
      .select('id, booking_id')
      .eq('staff_id', profileId)
      .in('status', ['confirmed', 'in_progress'])

    if (activeJobs && activeJobs.length > 0) {
      const bookingIds = [...new Set(activeJobs.map(j => j.booking_id).filter(Boolean))]
      if (bookingIds.length > 0) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('id, provider_preference')
          .in('id', bookingIds)

        const hasGenderSpecificJob = bookings?.some(
          b => b.provider_preference === 'female-only' || b.provider_preference === 'male-only'
        )

        if (hasGenderSpecificJob) {
          throw new Error('ไม่สามารถเปลี่ยนเพศได้ เนื่องจากมีงานที่ลูกค้าระบุเพศผู้ให้บริการค้างอยู่ กรุณารอให้งานเสร็จสิ้นก่อน')
        }
      }
    }
  }

  // Update staff table
  const { error } = await supabase
    .from('staff')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', staffData.id)

  if (error) throw error
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) throw error
}

/**
 * Upload avatar image
 */
export async function uploadAvatar(staffId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${staffId}/avatar.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, { upsert: true })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)

  // Update profile with new avatar URL
  await updateProfile(staffId, { avatar_url: urlData.publicUrl })

  return urlData.publicUrl
}

// ============================================
// Document Operations
// ============================================

/**
 * Get staff documents
 */
export async function getDocuments(profileId: string): Promise<StaffDocument[]> {
  // Convert profile_id to staff_id first
  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('id')
    .eq('profile_id', profileId)
    .single()

  if (staffError) throw staffError
  if (!staffData) throw new Error('Staff record not found')

  const { data, error } = await supabase
    .from('staff_documents')
    .select('*')
    .eq('staff_id', staffData.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as StaffDocument[]
}

/**
 * Upload document
 */
export async function uploadDocument(
  profileId: string,
  type: DocumentType,
  file: File,
  notes?: string,
  expires_at?: string
): Promise<StaffDocument> {
  // Convert profile_id to staff_id first
  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('id')
    .eq('profile_id', profileId)
    .single()

  if (staffError) throw staffError
  if (!staffData) throw new Error('Staff record not found')

  const staffId = staffData.id
  const fileExt = file.name.split('.').pop()
  const fileName = `${staffId}/${type}_${Date.now()}.${fileExt}`

  // Upload file to storage (use 'staff-documents' bucket to match Admin app)
  const { error: uploadError } = await supabase.storage
    .from('staff-documents')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) throw uploadError

  // Get public URL
  const { data: urlData } = supabase.storage.from('staff-documents').getPublicUrl(fileName)

  // Create document record (match Admin app schema)
  const { data, error } = await supabase
    .from('staff_documents')
    .insert({
      staff_id: staffId,
      document_type: type,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      verification_status: 'pending',
      notes: notes,
      expires_at: expires_at,
      uploaded_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data as StaffDocument
}

/**
 * Delete document
 */
export async function deleteDocument(documentId: string): Promise<void> {
  // Get document first to get file path
  const { data: doc, error: fetchError } = await supabase
    .from('staff_documents')
    .select('file_url')
    .eq('id', documentId)
    .single()

  if (fetchError) throw fetchError

  // Delete from storage (extract path from URL)
  if (doc?.file_url) {
    const urlParts = doc.file_url.split('/staff-documents/')
    if (urlParts[1]) {
      await supabase.storage.from('staff-documents').remove([urlParts[1]])
    }
  }

  // Delete record
  const { error } = await supabase
    .from('staff_documents')
    .delete()
    .eq('id', documentId)

  if (error) throw error
}

// ============================================
// Service Area Operations
// ============================================

/**
 * Get staff service areas
 */
export async function getServiceAreas(profileId: string): Promise<ServiceArea[]> {
  // Convert profile_id to staff_id first
  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('id')
    .eq('profile_id', profileId)
    .single()

  if (staffError) throw staffError
  if (!staffData) throw new Error('Staff record not found')

  const { data, error } = await supabase
    .from('staff_service_areas')
    .select('*')
    .eq('staff_id', staffData.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as ServiceArea[]
}

/**
 * Add service area
 */
export async function addServiceArea(
  profileId: string,
  data: {
    province: string
    district?: string
    subdistrict?: string
    postal_code?: string
    radius_km?: number
  }
): Promise<ServiceArea> {
  // Convert profile_id to staff_id first
  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('id')
    .eq('profile_id', profileId)
    .single()

  if (staffError) throw staffError
  if (!staffData) throw new Error('Staff record not found')

  const { data: area, error } = await supabase
    .from('staff_service_areas')
    .insert({
      staff_id: staffData.id,
      province: data.province,
      district: data.district,
      subdistrict: data.subdistrict,
      postal_code: data.postal_code,
      radius_km: data.radius_km || 10,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error
  return area as ServiceArea
}

/**
 * Update service area
 */
export async function updateServiceArea(
  areaId: string,
  data: Partial<ServiceArea>
): Promise<void> {
  const { error } = await supabase
    .from('staff_service_areas')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', areaId)

  if (error) throw error
}

/**
 * Delete service area
 */
export async function deleteServiceArea(areaId: string): Promise<void> {
  const { error } = await supabase
    .from('staff_service_areas')
    .delete()
    .eq('id', areaId)

  if (error) throw error
}

// ============================================
// Skills Operations
// ============================================

/**
 * Get all available skills
 */
export async function getAllSkills(): Promise<Array<{ id: string; name_th: string; name_en: string; category: string }>> {
  const { data, error } = await supabase
    .from('skills')
    .select('id, name_th, name_en, category')
    .order('name_th')

  if (error) throw error
  return data || []
}

/**
 * Get staff skills
 */
export async function getSkills(profileId: string): Promise<StaffSkill[]> {
  // First, get the staff ID from the profile ID
  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('id')
    .eq('profile_id', profileId)
    .single()

  if (staffError) throw staffError
  if (!staffData) throw new Error('Staff record not found')

  const { data, error } = await supabase
    .from('staff_skills')
    .select(`
      *,
      skill:skill_id (
        name_th,
        name_en
      )
    `)
    .eq('staff_id', staffData.id)

  if (error) throw error

  // Transform data to include skill names
  return (data || []).map((item: any) => ({
    ...item,
    skill_name: item.skill?.name_th || '',
    skill_name_en: item.skill?.name_en || '',
  })) as StaffSkill[]
}

/**
 * Add skill to staff (or update if already exists)
 */
export async function addSkill(
  profileId: string,
  skillId: string,
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert' = 'intermediate',
  yearsExperience?: number
): Promise<StaffSkill> {
  // First, get the staff ID from the profile ID
  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('id')
    .eq('profile_id', profileId)
    .single()

  if (staffError) throw staffError
  if (!staffData) throw new Error('Staff record not found')

  const { data, error } = await supabase
    .from('staff_skills')
    .upsert({
      staff_id: staffData.id,
      skill_id: skillId,
      level,
      years_experience: yearsExperience,
    }, {
      onConflict: 'staff_id,skill_id',
    })
    .select(`
      *,
      skill:skill_id (
        name_th,
        name_en
      )
    `)
    .single()

  if (error) throw error
  return data as StaffSkill
}

/**
 * Update skill level
 */
export async function updateSkillLevel(
  profileId: string,
  skillId: string,
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert',
  yearsExperience?: number
): Promise<void> {
  // First, get the staff ID from the profile ID
  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('id')
    .eq('profile_id', profileId)
    .single()

  if (staffError) throw staffError
  if (!staffData) throw new Error('Staff record not found')

  const { error } = await supabase
    .from('staff_skills')
    .update({
      level,
      years_experience: yearsExperience,
    })
    .eq('staff_id', staffData.id)
    .eq('skill_id', skillId)

  if (error) throw error
}

/**
 * Delete skill from staff
 */
export async function deleteSkill(
  profileId: string,
  skillId: string
): Promise<void> {
  // First, get the staff ID from the profile ID
  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('id')
    .eq('profile_id', profileId)
    .single()

  if (staffError) throw staffError
  if (!staffData) throw new Error('Staff record not found')

  const { error } = await supabase
    .from('staff_skills')
    .delete()
    .eq('staff_id', staffData.id)
    .eq('skill_id', skillId)

  if (error) throw error
}

// ============================================
// Eligibility Check
// ============================================

/**
 * Check if staff is eligible to start working
 * Requires: staff.status='active' + id_card verified + bank_statement verified
 */
export async function canStaffStartWork(profileId: string): Promise<StaffEligibility> {
  // Get staff record
  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('id, status, gender')
    .eq('profile_id', profileId)
    .single()

  if (staffError || !staffData) {
    return {
      canWork: false,
      reasons: ['ไม่พบข้อมูลพนักงาน'],
      status: 'pending',
      gender: null,
      documents: {
        id_card: { uploaded: false, verified: false },
        bank_statement: { uploaded: false, verified: false },
      },
    }
  }

  const reasons: string[] = []

  // Check 1: Staff status must be 'active'
  if (staffData.status !== 'active') {
    reasons.push('บัญชียังไม่ได้รับการอนุมัติจากแอดมิน')
  }

  // Check 2: Gender must be specified
  if (!staffData.gender) {
    reasons.push('กรุณาระบุเพศในข้อมูลส่วนตัว')
  }

  // Check 2: Get documents
  const { data: documents, error: docsError } = await supabase
    .from('staff_documents')
    .select('document_type, verification_status')
    .eq('staff_id', staffData.id)

  const docs = documents || []

  // Find id_card and bank_statement
  const idCard = docs.find((d) => d.document_type === 'id_card')
  const bankStatement = docs.find((d) => d.document_type === 'bank_statement')

  const idCardUploaded = !!idCard
  const idCardVerified = idCard?.verification_status === 'verified'
  const bankStatementUploaded = !!bankStatement
  const bankStatementVerified = bankStatement?.verification_status === 'verified'

  // Check 3: Required documents
  if (!idCardUploaded) {
    reasons.push('ยังไม่ได้อัปโหลดสำเนาบัตรประชาชน')
  } else if (!idCardVerified) {
    if (idCard.verification_status === 'pending') {
      reasons.push('สำเนาบัตรประชาชนรอการตรวจสอบ')
    } else if (idCard.verification_status === 'rejected') {
      reasons.push('สำเนาบัตรประชาชนถูกปฏิเสธ กรุณาอัปโหลดใหม่')
    } else if (idCard.verification_status === 'reviewing') {
      reasons.push('สำเนาบัตรประชาชนกำลังตรวจสอบ')
    }
  }

  if (!bankStatementUploaded) {
    reasons.push('ยังไม่ได้อัปโหลดสำเนาบัญชีธนาคาร')
  } else if (!bankStatementVerified) {
    if (bankStatement.verification_status === 'pending') {
      reasons.push('สำเนาบัญชีธนาคารรอการตรวจสอบ')
    } else if (bankStatement.verification_status === 'rejected') {
      reasons.push('สำเนาบัญชีธนาคารถูกปฏิเสธ กรุณาอัปโหลดใหม่')
    } else if (bankStatement.verification_status === 'reviewing') {
      reasons.push('สำเนาบัญชีธนาคารกำลังตรวจสอบ')
    }
  }

  const canWork =
    staffData.status === 'active' &&
    !!staffData.gender &&
    idCardVerified &&
    bankStatementVerified

  return {
    canWork,
    reasons,
    status: staffData.status as 'active' | 'inactive' | 'pending',
    gender: (staffData.gender as StaffGender) || null,
    documents: {
      id_card: {
        uploaded: idCardUploaded,
        verified: idCardVerified,
        status: idCard?.verification_status,
      },
      bank_statement: {
        uploaded: bankStatementUploaded,
        verified: bankStatementVerified,
        status: bankStatement?.verification_status,
      },
    },
  }
}

// Export service
export const staffService = {
  updateProfile,
  updateStaffData,
  updatePassword,
  uploadAvatar,
  getDocuments,
  uploadDocument,
  deleteDocument,
  getServiceAreas,
  addServiceArea,
  updateServiceArea,
  deleteServiceArea,
  getAllSkills,
  getSkills,
  addSkill,
  updateSkillLevel,
  deleteSkill,
  canStaffStartWork,
}
