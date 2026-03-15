import { useState, useRef } from 'react'
import { X, Upload, File, AlertCircle } from 'lucide-react'
import { useUploadDocument } from '../hooks/useStaffDocuments'
import type { DocumentType } from '../services/staffDocumentService'

interface UploadDocumentModalProps {
  staffId: string
  staffName: string
  isOpen: boolean
  onClose: () => void
}

export function UploadDocumentModal({
  staffId,
  staffName,
  isOpen,
  onClose,
}: UploadDocumentModalProps) {
  const [documentType, setDocumentType] = useState<DocumentType>('id_card')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadMutation = useUploadDocument()

  if (!isOpen) return null

  const documentTypes: { value: DocumentType; label: string }[] = [
    { value: 'id_card', label: 'สำเนาบัตรประชาชน' },
    { value: 'license', label: 'ใบประกอบวิชาชีพ' },
    { value: 'certificate', label: 'ใบรับรองการอบรม' },
    { value: 'bank_statement', label: 'สำเนาบัญชีธนาคาร' },
    { value: 'other', label: 'เอกสารอื่นๆ' },
  ]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('ไฟล์มีขนาดใหญ่เกิน 10MB')
        return
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        alert('รองรับเฉพาะไฟล์ JPG, PNG, และ PDF เท่านั้น')
        return
      }

      setSelectedFile(file)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]

      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        alert('ไฟล์มีขนาดใหญ่เกิน 10MB')
        return
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        alert('รองรับเฉพาะไฟล์ JPG, PNG, และ PDF เท่านั้น')
        return
      }

      setSelectedFile(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile) {
      alert('กรุณาเลือกไฟล์')
      return
    }

    try {
      console.log('🟢 [DEBUG] Attempting upload with data:', {
        staff_id: staffId,
        document_type: documentType,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        hasNotes: !!notes.trim(),
        hasExpiresAt: !!expiresAt,
      })

      await uploadMutation.mutateAsync({
        staff_id: staffId,
        document_type: documentType,
        file: selectedFile,
        notes: notes.trim() || undefined,
        expires_at: expiresAt || undefined,
      })

      console.log('✅ [DEBUG] Upload completed successfully')

      // Reset form
      setSelectedFile(null)
      setNotes('')
      setExpiresAt('')
      setDocumentType('id_card')
      onClose()
    } catch (error) {
      console.error('🔴 [DEBUG] Upload error in Modal:', {
        errorType: error?.constructor?.name,
        errorMessage: (error as any)?.message,
        errorName: (error as any)?.name,
        statusCode: (error as any)?.statusCode,
        errorDetails: (error as any)?.error,
        hint: (error as any)?.hint,
        details: (error as any)?.details,
        code: (error as any)?.code,
        stack: (error as any)?.stack,
        fullError: error,
      })
    }
  }

  const handleClose = () => {
    if (uploadMutation.isPending) return
    setSelectedFile(null)
    setNotes('')
    setExpiresAt('')
    setDocumentType('id_card')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">อัปโหลดเอกสาร</h3>
            <p className="text-sm text-stone-500 mt-1">สำหรับพนักงาน: {staffName}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={uploadMutation.isPending}
            className="p-2 hover:bg-stone-100 rounded-lg transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Document Type */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              ประเภทเอกสาร <span className="text-red-500">*</span>
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              disabled={uploadMutation.isPending}
            >
              {documentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              ไฟล์เอกสาร <span className="text-red-500">*</span>
            </label>

            {/* Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition ${
                dragActive
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-stone-300 hover:border-amber-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploadMutation.isPending}
              />

              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <File className="w-8 h-8 text-amber-600" />
                  <div className="text-left">
                    <p className="font-medium text-stone-900">{selectedFile.name}</p>
                    <p className="text-sm text-stone-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="ml-4 p-2 hover:bg-stone-100 rounded-lg transition"
                    disabled={uploadMutation.isPending}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                  <p className="text-stone-600 mb-2">ลากไฟล์มาวางที่นี่ หรือ</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
                    disabled={uploadMutation.isPending}
                  >
                    เลือกไฟล์
                  </button>
                  <p className="text-xs text-stone-500 mt-3">
                    รองรับไฟล์: JPG, PNG, PDF (ขนาดไม่เกิน 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              หมายเหตุ (ถ้ามี)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ระบุรายละเอียดเพิ่มเติม..."
              className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              rows={3}
              disabled={uploadMutation.isPending}
            />
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              วันหมดอายุ (ถ้ามี)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              disabled={uploadMutation.isPending}
            />
            <p className="text-xs text-stone-500 mt-1">
              สำหรับเอกสารที่มีวันหมดอายุ เช่น ใบประกอบวิชาชีพ
            </p>
          </div>

          {/* Info Alert */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">ข้อมูลสำคัญ:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>เอกสารจะถูกตรวจสอบโดย Admin ก่อนอนุมัติ</li>
                <li>หลังจากอัปโหลดแล้ว จะไม่สามารถแก้ไขได้</li>
                <li>สามารถลบและอัปโหลดใหม่ได้หากต้องการเปลี่ยนแปลง</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploadMutation.isPending}
              className="flex-1 px-6 py-3 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition font-medium disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={!selectedFile || uploadMutation.isPending}
              className="flex-1 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploadMutation.isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>กำลังอัปโหลด...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>อัปโหลดเอกสาร</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
