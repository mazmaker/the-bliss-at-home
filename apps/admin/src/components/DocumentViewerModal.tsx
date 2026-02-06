import { useState } from 'react'
import { X, ZoomIn, ZoomOut, RotateCw, Download, Check, XCircle as XIcon } from 'lucide-react'
import { useUpdateDocumentStatus, useDownloadDocument } from '../hooks/useStaffDocuments'
import type { StaffDocument } from '../services/staffDocumentService'

interface DocumentViewerModalProps {
  document: StaffDocument | null
  isOpen: boolean
  onClose: () => void
}

export function DocumentViewerModal({ document, isOpen, onClose }: DocumentViewerModalProps) {
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const updateStatusMutation = useUpdateDocumentStatus()
  const downloadMutation = useDownloadDocument()

  if (!isOpen || !document) return null

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 25))
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360)

  const handleDownload = () => {
    downloadMutation.mutate({
      documentId: document.id,
      fileName: document.file_name,
    })
  }

  const handleApprove = async () => {
    await updateStatusMutation.mutateAsync({
      documentId: document.id,
      updates: { verification_status: 'verified' },
      adminId: 'current-admin-id', // TODO: Get from auth context
    })
    onClose()
  }

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      alert('กรุณาระบุเหตุผลในการปฏิเสธ')
      return
    }

    await updateStatusMutation.mutateAsync({
      documentId: document.id,
      updates: {
        verification_status: 'rejected',
        rejection_reason: rejectionReason,
      },
      adminId: 'current-admin-id', // TODO: Get from auth context
    })
    setShowRejectModal(false)
    setRejectionReason('')
    onClose()
  }

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      id_card: 'สำเนาบัตรประชาชน',
      license: 'ใบประกอบวิชาชีพ',
      certificate: 'ใบรับรองการอบรม',
      bank_statement: 'สำเนาบัญชีธนาคาร',
      other: 'เอกสารอื่นๆ',
    }
    return labels[type] || type
  }

  const isPDF = document.mime_type === 'application/pdf'
  const isImage = document.mime_type.startsWith('image/')

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-stone-200">
            <div>
              <h3 className="text-lg font-semibold text-stone-900">
                {getDocumentTypeLabel(document.document_type)}
              </h3>
              <p className="text-sm text-stone-500">{document.file_name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-stone-100 bg-stone-50">
            <div className="flex items-center gap-2">
              {isImage && (
                <>
                  <button
                    onClick={handleZoomOut}
                    className="p-2 hover:bg-stone-200 rounded-lg transition"
                    title="ซูมออก"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-stone-600 min-w-[60px] text-center">{zoom}%</span>
                  <button
                    onClick={handleZoomIn}
                    className="p-2 hover:bg-stone-200 rounded-lg transition"
                    title="ซูมเข้า"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <div className="w-px h-6 bg-stone-300 mx-2" />
                  <button
                    onClick={handleRotate}
                    className="p-2 hover:bg-stone-200 rounded-lg transition"
                    title="หมุนภาพ"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            <button
              onClick={handleDownload}
              disabled={downloadMutation.isPending}
              className="px-4 py-2 bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 transition text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              ดาวน์โหลด
            </button>
          </div>

          {/* Document Viewer */}
          <div className="flex-1 overflow-auto bg-stone-100 p-6">
            <div className="flex items-center justify-center min-h-full">
              {isImage ? (
                <img
                  src={document.file_url}
                  alt={document.file_name}
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s',
                  }}
                  className="max-w-full h-auto shadow-lg"
                />
              ) : isPDF ? (
                <iframe
                  src={document.file_url}
                  className="w-full h-full min-h-[600px] bg-white shadow-lg rounded-lg"
                  title={document.file_name}
                />
              ) : (
                <div className="text-center">
                  <p className="text-stone-500 mb-4">ไม่สามารถแสดงตัวอย่างเอกสารประเภทนี้ได้</p>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
                  >
                    ดาวน์โหลดเพื่อดู
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Document Info & Actions */}
          <div className="p-6 border-t border-stone-200 bg-white">
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <p className="text-stone-500">ชื่อไฟล์</p>
                <p className="font-medium text-stone-900">{document.file_name}</p>
              </div>
              <div>
                <p className="text-stone-500">ขนาดไฟล์</p>
                <p className="font-medium text-stone-900">
                  {(document.file_size / 1024).toFixed(2)} KB
                </p>
              </div>
              <div>
                <p className="text-stone-500">วันที่อัปโหลด</p>
                <p className="font-medium text-stone-900">
                  {new Date(document.uploaded_at).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <p className="text-stone-500">สถานะ</p>
                <p className="font-medium text-stone-900">{document.verification_status}</p>
              </div>
            </div>

            {document.notes && (
              <div className="mb-4 p-3 bg-stone-50 rounded-lg">
                <p className="text-sm text-stone-600">
                  <strong>หมายเหตุ:</strong> {document.notes}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {document.verification_status === 'pending' && (
              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={updateStatusMutation.isPending}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-5 h-5" />
                  อนุมัติเอกสาร
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={updateStatusMutation.isPending}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <XIcon className="w-5 h-5" />
                  ปฏิเสธเอกสาร
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-stone-900 mb-4">
              ระบุเหตุผลในการปฏิเสธ
            </h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="กรุณาระบุเหตุผลที่ชัดเจน..."
              className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={4}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectionReason('')
                }}
                className="flex-1 px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={!rejectionReason.trim() || updateStatusMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                ยืนยันปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
