import { useState, useEffect } from 'react'
import { MessageCircle, Loader2, Trash2, Pencil, X } from 'lucide-react'
import {
  useJobStaffComment,
  useUpsertJobStaffComment,
  useDeleteJobStaffComment,
  SessionNotLiveError,
} from '@bliss/supabase'

interface StaffJobCommentCardProps {
  /** The job the comment belongs to */
  jobId: string
  /** The acting staff member's profiles.id (must equal auth.uid()) */
  staffId: string
}

const MAX_LEN = 1000

/**
 * P18 — lets a staff member write ONE private comment on their own completed job.
 * Only the staff member and Admin can ever read it (enforced by RLS, not this UI).
 */
export default function StaffJobCommentCard({ jobId, staffId }: StaffJobCommentCardProps) {
  const { data: comment, isLoading } = useJobStaffComment(jobId, staffId)
  const upsert = useUpsertJobStaffComment()
  const del = useDeleteJobStaffComment()

  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Keep the textarea in sync with the loaded comment while not actively editing.
  useEffect(() => {
    if (!isEditing) setText(comment?.comment ?? '')
  }, [comment?.comment, isEditing])

  const hasComment = !!comment
  const busy = upsert.isPending || del.isPending

  const handleSave = async () => {
    const trimmed = text.trim()
    if (!trimmed) {
      setError('กรุณาพิมพ์ความคิดเห็นก่อนบันทึก')
      return
    }
    setError(null)
    try {
      await upsert.mutateAsync({ jobId, staffId, comment: trimmed })
      setIsEditing(false)
    } catch (e) {
      setError(
        e instanceof SessionNotLiveError
          ? e.message
          : 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
      )
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('ลบความคิดเห็นนี้?')) return
    setError(null)
    try {
      await del.mutateAsync({ jobId, staffId })
      setIsEditing(false)
      setText('')
    } catch (e) {
      setError(
        e instanceof SessionNotLiveError
          ? e.message
          : 'ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
      )
    }
  }

  const startEdit = () => {
    setText(comment?.comment ?? '')
    setError(null)
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setText(comment?.comment ?? '')
    setError(null)
    setIsEditing(false)
  }

  const showForm = isEditing || !hasComment

  return (
    <div className="bg-white rounded-xl shadow border border-bliss-100 p-4">
      <div className="flex items-center gap-2 mb-1">
        <MessageCircle className="w-4 h-4 text-bliss-600" />
        <h3 className="font-semibold text-bliss-900 text-sm">ความคิดเห็นของฉัน</h3>
      </div>
      <p className="text-xs text-bliss-500 mb-3">
        เห็นได้เฉพาะคุณและแอดมินเท่านั้น (ลูกค้าไม่เห็น)
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-bliss-500 text-sm py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          กำลังโหลด...
        </div>
      ) : showForm ? (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_LEN}
            rows={4}
            disabled={busy}
            placeholder="เขียนความคิดเห็นเกี่ยวกับงานนี้..."
            className="w-full rounded-xl border border-bliss-200 p-3 text-sm text-bliss-900 focus:outline-none focus:ring-2 focus:ring-bliss-400 disabled:opacity-50 resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-bliss-400">{text.length}/{MAX_LEN}</span>
            <div className="flex items-center gap-2">
              {isEditing && hasComment && (
                <button
                  onClick={cancelEdit}
                  disabled={busy}
                  className="px-3 py-2 text-sm text-bliss-500 rounded-xl disabled:opacity-50"
                >
                  ยกเลิก
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={busy || !text.trim()}
                className="px-4 py-2 bg-gradient-to-r from-bliss-700 to-bliss-800 text-white rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {upsert.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-bliss-800 whitespace-pre-wrap break-words">{comment!.comment}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-bliss-400">
              อัปเดตเมื่อ {new Date(comment!.updated_at).toLocaleString('th-TH')}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={startEdit}
                disabled={busy}
                className="px-3 py-2 text-sm text-bliss-600 border border-bliss-200 rounded-xl flex items-center gap-1 disabled:opacity-50"
              >
                <Pencil className="w-3.5 h-3.5" />
                แก้ไข
              </button>
              <button
                onClick={handleDelete}
                disabled={busy}
                className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-xl flex items-center gap-1 disabled:opacity-50"
              >
                {del.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-start gap-2 text-red-700 bg-red-50 rounded-xl p-2 text-xs">
          <X className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
