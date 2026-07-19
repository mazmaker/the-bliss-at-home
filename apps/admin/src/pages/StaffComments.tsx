import { useMemo, useState } from 'react'
import { MessageCircle, Search, Filter, Loader2, Trash2, Calendar, User } from 'lucide-react'
import { useAdminStaffComments, useDeleteStaffComment } from '../hooks/useStaffComments'
import { getRelativeTime, formatDateThai } from '../hooks/useStaffReviews'

/**
 * P18 — combined admin page listing ALL staff job-comments across everyone,
 * filterable by staff + free-text. Admin can view + delete (never create/edit).
 */
function StaffComments() {
  const { data: comments = [], isLoading } = useAdminStaffComments()
  const deleteComment = useDeleteStaffComment()

  const [searchQuery, setSearchQuery] = useState('')
  const [staffFilter, setStaffFilter] = useState<string>('all')

  // Staff dropdown options derived from the loaded comments (unique commenters).
  const staffOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of comments) {
      if (!map.has(c.staff_id)) map.set(c.staff_id, c.staff_name || 'ไม่ทราบชื่อ')
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name, 'th')
    )
  }, [comments])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return comments.filter((c) => {
      if (staffFilter !== 'all' && c.staff_id !== staffFilter) return false
      if (!q) return true
      return (
        c.comment.toLowerCase().includes(q) ||
        (c.staff_name || '').toLowerCase().includes(q) ||
        (c.service_name || '').toLowerCase().includes(q) ||
        (c.customer_name || '').toLowerCase().includes(q) ||
        (c.booking_number || '').toLowerCase().includes(q)
      )
    })
  }, [comments, searchQuery, staffFilter])

  const handleDelete = async (id: string) => {
    if (!window.confirm('ลบความคิดเห็นนี้? (พนักงานจะไม่เห็นว่าถูกลบ)')) return
    try {
      await deleteComment.mutateAsync(id)
    } catch {
      alert('ลบไม่สำเร็จ กรุณาลองใหม่')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-bliss-900">ความคิดเห็นพนักงาน</h1>
        <p className="text-bliss-500 mt-1">
          ความคิดเห็นที่พนักงานเขียนต่องานที่ทำเสร็จ (เห็นได้เฉพาะพนักงานเจ้าของและแอดมิน)
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-bliss-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหา (ข้อความ / พนักงาน / บริการ / ลูกค้า / รหัสจอง)"
            className="w-full pl-9 pr-3 py-2 bg-white border border-bliss-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bliss-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-bliss-500" />
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-bliss-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bliss-500"
          >
            <option value="all">พนักงานทั้งหมด</option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-bliss-600" />
          <span className="ml-2 text-bliss-600">กำลังโหลดความคิดเห็น...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="w-16 h-16 text-bliss-300 mx-auto mb-4" />
          <p className="text-bliss-500">
            {comments.length === 0
              ? 'ยังไม่มีความคิดเห็นจากพนักงาน'
              : 'ไม่พบความคิดเห็นที่ตรงกับตัวกรอง'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-bliss-500">ทั้งหมด {filtered.length} ความคิดเห็น</p>
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-bliss-200 rounded-xl p-5 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  {/* Staff who wrote it */}
                  <div className="mb-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-bliss-100 text-bliss-700 text-xs font-medium">
                      <User className="w-3 h-3" />
                      {c.staff_name || 'ไม่ทราบชื่อ'}
                    </span>
                  </div>
                  {/* Which job / service */}
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

              <div className="bg-bliss-50 rounded-lg p-4">
                <p className="text-sm text-bliss-700 leading-relaxed whitespace-pre-wrap break-words">
                  {c.comment}
                </p>
              </div>
              <p className="text-xs text-bliss-400 mt-2">เขียนเมื่อ {getRelativeTime(c.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default StaffComments
