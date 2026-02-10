/**
 * Staff Profile Service
 * Handles documents, service areas, skills, and profile updates
 */

import { supabase } from '../auth/supabaseClient'
import type { StaffDocument, ServiceArea, StaffSkill, DocumentType } from './types'

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
export async function getDocuments(staffId: string): Promise<StaffDocument[]> {
  const { data, error } = await supabase
    .from('staff_documents')
    .select('*')
    .eq('staff_id', staffId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as StaffDocument[]
}

/**
 * Upload document
 */
export async function uploadDocument(
  staffId: string,
  type: DocumentType,
  name: string,
  file: File
): Promise<StaffDocument> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${staffId}/${type}_${Date.now()}.${fileExt}`

  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(fileName, file)

  if (uploadError) throw uploadError

  // Get public URL
  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName)

  // Create document record
  const { data, error } = await supabase
    .from('staff_documents')
    .insert({
      staff_id: staffId,
      type,
      name,
      file_url: urlData.publicUrl,
      file_name: file.name,
      status: 'pending',
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
    const urlParts = doc.file_url.split('/documents/')
    if (urlParts[1]) {
      await supabase.storage.from('documents').remove([urlParts[1]])
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
export async function getServiceAreas(staffId: string): Promise<ServiceArea[]> {
  const { data, error } = await supabase
    .from('staff_service_areas')
    .select('*')
    .eq('staff_id', staffId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as ServiceArea[]
}

/**
 * Add service area
 */
export async function addServiceArea(
  staffId: string,
  data: {
    province: string
    district?: string
    subdistrict?: string
    postal_code?: string
    radius_km?: number
  }
): Promise<ServiceArea> {
  const { data: area, error } = await supabase
    .from('staff_service_areas')
    .insert({
      staff_id: staffId,
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
 * Get staff skills
 */
export async function getSkills(staffId: string): Promise<StaffSkill[]> {
  const { data, error } = await supabase
    .from('staff_skills')
    .select(`
      *,
      skills:skill_id (
        name,
        name_en
      )
    `)
    .eq('staff_id', staffId)

  if (error) throw error

  // Transform data to include skill names
  return (data || []).map((item: any) => ({
    ...item,
    skill_name: item.skills?.name || '',
    skill_name_en: item.skills?.name_en || '',
  })) as StaffSkill[]
}

/**
 * Update skill level
 */
export async function updateSkillLevel(
  staffId: string,
  skillId: string,
  level: number
): Promise<void> {
  const { error } = await supabase
    .from('staff_skills')
    .update({
      level,
      updated_at: new Date().toISOString(),
    })
    .eq('staff_id', staffId)
    .eq('skill_id', skillId)

  if (error) throw error
}

// Export service
export const staffService = {
  updateProfile,
  updatePassword,
  uploadAvatar,
  getDocuments,
  uploadDocument,
  deleteDocument,
  getServiceAreas,
  addServiceArea,
  updateServiceArea,
  deleteServiceArea,
  getSkills,
  updateSkillLevel,
}
