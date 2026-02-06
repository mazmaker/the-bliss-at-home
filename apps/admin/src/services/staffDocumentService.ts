import { supabase } from '@bliss/supabase'
import { lineMessagingService } from '@bliss/supabase/notifications/lineMessagingService'

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

export interface CreateDocumentData {
  staff_id: string
  document_type: DocumentType
  file: File
  notes?: string
  expires_at?: string
}

export interface UpdateDocumentData {
  verification_status?: DocumentStatus
  verified_by?: string
  verified_at?: string
  rejection_reason?: string
  notes?: string
}

class StaffDocumentService {
  private readonly BUCKET_NAME = 'staff-documents'
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  /**
   * Get all documents for a staff member
   */
  async getStaffDocuments(staffId: string): Promise<StaffDocument[]> {
    try {
      const { data, error } = await supabase
        .from('staff_documents')
        .select('*')
        .eq('staff_id', staffId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching staff documents:', error)
      throw error
    }
  }

  /**
   * Get a single document by ID
   */
  async getDocumentById(documentId: string): Promise<StaffDocument | null> {
    try {
      const { data, error } = await supabase
        .from('staff_documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching document:', error)
      throw error
    }
  }

  /**
   * Upload a new document
   */
  async uploadDocument(documentData: CreateDocumentData): Promise<StaffDocument> {
    try {
      // Validate file size
      if (documentData.file.size > this.MAX_FILE_SIZE) {
        throw new Error('File size exceeds maximum limit of 10MB')
      }

      // Generate unique file name
      const fileExt = documentData.file.name.split('.').pop()
      const fileName = `${documentData.staff_id}/${documentData.document_type}_${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      console.log('🔵 [DEBUG] Starting upload:', {
        bucket: this.BUCKET_NAME,
        fileName,
        fileSize: documentData.file.size,
        fileType: documentData.file.type,
      })

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, documentData.file, {
          cacheControl: '3600',
          upsert: false,
        })

      console.log('🔵 [DEBUG] Upload response:', {
        success: !uploadError,
        uploadData,
        uploadError: uploadError ? {
          name: uploadError.name,
          message: uploadError.message,
          statusCode: (uploadError as any).statusCode,
          error: (uploadError as any).error,
          cause: uploadError.cause,
          stack: uploadError.stack,
        } : null,
      })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName)

      // Create document record
      const { data, error } = await supabase
        .from('staff_documents')
        .insert({
          staff_id: documentData.staff_id,
          document_type: documentData.document_type,
          file_url: publicUrl,
          file_name: documentData.file.name,
          file_size: documentData.file.size,
          mime_type: documentData.file.type,
          verification_status: 'pending',
          notes: documentData.notes,
          expires_at: documentData.expires_at,
          uploaded_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      // Notify admin about new document
      try {
        // Fetch staff information for notification
        const { data: staffData } = await supabase
          .from('staff')
          .select('name_th, phone')
          .eq('id', documentData.staff_id)
          .single()

        if (staffData) {
          await lineMessagingService.notifyAdminNewDocument({
            staffName: staffData.name_th || 'Unknown',
            staffPhone: staffData.phone || 'N/A',
            documentType: this.getDocumentTypeLabel(documentData.document_type).th,
            documentId: data.id,
            status: 'uploaded',
          })
        }
      } catch (notificationError) {
        // Don't fail the upload if notification fails
        console.error('Failed to send LINE notification:', notificationError)
      }

      return data
    } catch (error) {
      console.error('🔴 [DEBUG] Error uploading document:', {
        errorType: error?.constructor?.name,
        errorMessage: (error as any)?.message,
        errorName: (error as any)?.name,
        statusCode: (error as any)?.statusCode,
        errorDetails: (error as any)?.error,
        hint: (error as any)?.hint,
        details: (error as any)?.details,
        code: (error as any)?.code,
        fullError: error,
      })
      throw error
    }
  }

  /**
   * Update document status (verify/reject)
   */
  async updateDocumentStatus(
    documentId: string,
    updates: UpdateDocumentData,
    adminId?: string
  ): Promise<StaffDocument> {
    try {
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      // If verifying or rejecting, add admin info
      if (updates.verification_status === 'verified' || updates.verification_status === 'rejected') {
        updateData.verified_by = adminId
        updateData.verified_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('staff_documents')
        .update(updateData)
        .eq('id', documentId)
        .select()
        .single()

      if (error) throw error

      // Notify staff about status change
      if (updates.verification_status === 'verified' || updates.verification_status === 'rejected') {
        try {
          // Fetch staff and admin information for notification
          const { data: staffData } = await supabase
            .from('staff')
            .select('name_th, phone, line_user_id')
            .eq('id', data.staff_id)
            .single()

          // Fetch admin information if available
          let adminName = 'Admin'
          if (adminId) {
            const { data: adminProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', adminId)
              .single()

            if (adminProfile?.full_name) {
              adminName = adminProfile.full_name
            }
          }

          // Send notification if staff has LINE User ID
          // Note: You need to add 'line_user_id' column to staff table to enable this feature
          if (staffData?.line_user_id) {
            const notificationData = {
              staffName: staffData.name_th || 'Unknown',
              staffPhone: staffData.phone || 'N/A',
              documentType: this.getDocumentTypeLabel(data.document_type).th,
              documentId: data.id,
              status: updates.verification_status,
              rejectionReason: updates.rejection_reason,
              adminName,
            }

            if (updates.verification_status === 'verified') {
              await lineMessagingService.notifyStaffDocumentVerified(
                staffData.line_user_id,
                notificationData
              )
            } else if (updates.verification_status === 'rejected') {
              await lineMessagingService.notifyStaffDocumentRejected(
                staffData.line_user_id,
                notificationData
              )
            }
          }
        } catch (notificationError) {
          // Don't fail the update if notification fails
          console.error('Failed to send LINE notification:', notificationError)
        }
      }

      return data
    } catch (error) {
      console.error('Error updating document:', error)
      throw error
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      // Get document info first
      const document = await this.getDocumentById(documentId)
      if (!document) throw new Error('Document not found')

      // Extract file path from URL
      const urlParts = document.file_url.split('/')
      const filePath = urlParts.slice(urlParts.indexOf(this.BUCKET_NAME) + 1).join('/')

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath])

      if (storageError) console.error('Error deleting file from storage:', storageError)

      // Delete from database
      const { error } = await supabase
        .from('staff_documents')
        .delete()
        .eq('id', documentId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting document:', error)
      throw error
    }
  }

  /**
   * Get document statistics for a staff member
   */
  async getDocumentStats(staffId: string) {
    try {
      const documents = await this.getStaffDocuments(staffId)

      return {
        total: documents.length,
        pending: documents.filter(d => d.verification_status === 'pending').length,
        reviewing: documents.filter(d => d.verification_status === 'reviewing').length,
        verified: documents.filter(d => d.verification_status === 'verified').length,
        rejected: documents.filter(d => d.verification_status === 'rejected').length,
      }
    } catch (error) {
      console.error('Error getting document stats:', error)
      throw error
    }
  }

  /**
   * Get all pending documents (for admin dashboard)
   */
  async getPendingDocuments(): Promise<StaffDocument[]> {
    try {
      const { data, error } = await supabase
        .from('staff_documents')
        .select('*, staff:staff_id(name_th, name_en, phone)')
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching pending documents:', error)
      throw error
    }
  }

  /**
   * Download document
   */
  async downloadDocument(documentId: string): Promise<Blob> {
    try {
      const document = await this.getDocumentById(documentId)
      if (!document) throw new Error('Document not found')

      const response = await fetch(document.file_url)
      if (!response.ok) throw new Error('Failed to download document')

      return await response.blob()
    } catch (error) {
      console.error('Error downloading document:', error)
      throw error
    }
  }

  /**
   * Get document type label
   */
  getDocumentTypeLabel(type: DocumentType): { th: string; en: string } {
    const labels = {
      id_card: { th: 'สำเนาบัตรประชาชน', en: 'ID Card' },
      license: { th: 'ใบประกอบวิชาชีพ', en: 'Professional License' },
      certificate: { th: 'ใบรับรองการอบรม', en: 'Training Certificate' },
      bank_statement: { th: 'สำเนาบัญชีธนาคาร', en: 'Bank Statement' },
      other: { th: 'เอกสารอื่นๆ', en: 'Other Documents' },
    }
    return labels[type]
  }

  /**
   * Get status label
   */
  getStatusLabel(status: DocumentStatus): { th: string; en: string } {
    const labels = {
      pending: { th: 'รอตรวจสอบ', en: 'Pending' },
      reviewing: { th: 'กำลังตรวจสอบ', en: 'Reviewing' },
      verified: { th: 'ยืนยันแล้ว', en: 'Verified' },
      rejected: { th: 'ถูกปฏิเสธ', en: 'Rejected' },
    }
    return labels[status]
  }
}

export const staffDocumentService = new StaffDocumentService()
