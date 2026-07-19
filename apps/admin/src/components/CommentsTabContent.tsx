import { MessageCircle, Loader2, Trash2, Calendar, User } from 'lucide-react'
import { Staff } from '../services/staffService'
import { useStaffComments, useDeleteStaffComment } from '../hooks/useStaffComments'
import { getRelativeTime, formatDateThai } from '../hooks/useStaffReviews'

interface CommentsTabProps {
  staff: Staff
}

export function CommentsTabContent({ staff }: CommentsTabProps) {
  // job_staff_comments.staff_id => profiles.id, so key on profile_id (fallback to id).
  const staffProfileId = staff.profile_id || staff.id
  const { data: comments = [], isLoading } = useStaffComments(staffProfileId)
  const deleteComment = useDeleteStaffComment()

  const handleDelete = async (id: string) => {
    if (!window.confirm('ลบความคิดเห็นนี้? (พนักงานจะไม่เห็นว่าถูกลบ)')) return
    try {
      await deleteComment.mutateAsync(id)
    } catch {
      alert('ลบไม่สำเร็จ กรุณาลองใหม่')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-bliss-600" />
        <span className="ml-2 text-bliss-600">กำลังโหลดความคิดเห็น...</span>
      </div>
    )
  }

  if (!comments || comments.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="w-16 h-16 text-bliss-300 mx-auto mb-4" />
        <p className="text-bliss-500">ยังไม่มีความคิดเห็นจากพนักงานคนนี้</p>
        <p className="text-sm text-bliss-400 mt-2">
          ความคิดเห็นจะแสดงที่นี่หลังพนักงานเขียนในงานที่ทำเสร็จ
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-bliss-500">ทั้งหมด {comments.length} ความคิดเห็น</p>
      {comments.map((c) => (
        <div
          key={c.id}
          className="bg-white border border-bliss-200 rounded-xl p-5 hover:shadow-md transition"
        >
          {/* Which job / service this comment is about */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-bliss-900">
                  {c.service_name || 'ไม่ระบุบริการ'}
                </span>
                {c.booking_number && (
                  <span className="text-xs text-bliss-400 font-mono">{c.booking_number}</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-bliss-500 flex-wrap">
                {c.scheduled_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDateThai(c.scheduled_date)}
                    {c.scheduled_time ? ` ${c.scheduled_time.slice(0, 5)}` : ''}
                  </span>
                )}
                {c.customer_name && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {c.customer_name}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDelete(c.id)}
              disabled={deleteComment.isPending}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 flex-shrink-0"
              title="ลบความคิดเห็น"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* The comment text */}
          <div className="bg-bliss-50 rounded-lg p-4">
            <p className="text-sm text-bliss-700 leading-relaxed whitespace-pre-wrap break-words">
              {c.comment}
            </p>
          </div>
          <p className="text-xs text-bliss-400 mt-2">เขียนเมื่อ {getRelativeTime(c.created_at)}</p>
        </div>
      ))}
    </div>
  )
}
