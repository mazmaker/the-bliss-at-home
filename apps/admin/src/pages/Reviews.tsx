import { useState } from 'react'
import { Star, MessageSquare, Search, Filter, Eye, EyeOff, Loader2, User, Clock } from 'lucide-react'
import { useAdminReviews, useAdminReviewStats, useToggleReviewVisibility, useStaffList } from '../hooks/useAdminReviews'
import type { AdminReviewFilters } from '../services/reviewService'

function Reviews() {
  const [filters, setFilters] = useState<AdminReviewFilters>({
    sortBy: 'newest',
    isVisible: 'all',
  })
  const [searchQuery, setSearchQuery] = useState('')

  const { data: reviews = [], isLoading } = useAdminReviews({
    ...filters,
    search: searchQuery || undefined,
  })
  const { data: stats } = useAdminReviewStats()
  const { data: staffList = [] } = useStaffList()
  const toggleVisibility = useToggleReviewVisibility()

  const renderStars = (rating: number, size: 'sm' | 'md' = 'md') => {
    const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating ? 'text-amber-500 fill-amber-500' : 'text-stone-300'
            }`}
          />
        ))}
      </div>
    )
  }

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 1) return 'เมื่อสักครู่'
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} สัปดาห์ที่แล้ว`
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'massage': return 'นวด'
      case 'nail': return 'ทำเล็บ'
      case 'spa': return 'สปา'
      default: return category
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'massage': return 'bg-purple-100 text-purple-700'
      case 'nail': return 'bg-pink-100 text-pink-700'
      case 'spa': return 'bg-blue-100 text-blue-700'
      default: return 'bg-stone-100 text-stone-700'
    }
  }

  const avatarColors = [
    'bg-amber-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500',
    'bg-purple-500', 'bg-cyan-500', 'bg-orange-500', 'bg-teal-500',
  ]

  const getAvatarColor = (name: string) => {
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return avatarColors[Math.abs(hash) % avatarColors.length]
  }

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">รีวิวทั้งหมด</h1>
        <p className="text-stone-500 mt-1">จัดการรีวิวและคะแนนจากลูกค้า</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Star className="w-5 h-5 text-amber-600 fill-amber-600" />
              </div>
              <span className="text-sm text-stone-500">คะแนนเฉลี่ย</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-stone-900">{stats.average_rating.toFixed(1)}</span>
              <div className="mt-1">{renderStars(Math.round(stats.average_rating), 'sm')}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-stone-500">รีวิวทั้งหมด</span>
            </div>
            <span className="text-3xl font-bold text-stone-900">{stats.total}</span>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-stone-500">แสดงอยู่</span>
            </div>
            <span className="text-3xl font-bold text-stone-900">{stats.visible_count}</span>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-stone-100 rounded-lg">
                <EyeOff className="w-5 h-5 text-stone-500" />
              </div>
              <span className="text-sm text-stone-500">ซ่อนอยู่</span>
            </div>
            <span className="text-3xl font-bold text-stone-900">{stats.hidden_count}</span>
          </div>
        </div>
      )}

      {/* Rating Distribution */}
      {stats && stats.total > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="text-sm font-semibold text-stone-900 mb-3">การกระจายคะแนน</h3>
          <div className="flex items-end gap-6">
            {[5, 4, 3, 2, 1].map((r) => {
              const count = stats.rating_distribution[r as keyof typeof stats.rating_distribution]
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
              return (
                <div key={r} className="flex items-center gap-2 flex-1">
                  <span className="text-sm font-medium text-stone-600 w-12">{r} ดาว</span>
                  <div className="flex-1 h-3 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm text-stone-500 w-8 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-500" />
            <span className="text-sm font-medium text-stone-700">ตัวกรอง:</span>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาลูกค้า, พนักงาน, เลขที่จอง..."
              className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Rating */}
          <select
            value={filters.rating || 'all'}
            onChange={(e) => setFilters({ ...filters, rating: e.target.value === 'all' ? undefined : parseInt(e.target.value) })}
            className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">ทุกคะแนน</option>
            <option value="5">5 ดาว</option>
            <option value="4">4 ดาว</option>
            <option value="3">3 ดาว</option>
            <option value="2">2 ดาว</option>
            <option value="1">1 ดาว</option>
          </select>

          {/* Staff */}
          <select
            value={filters.staffId || 'all'}
            onChange={(e) => setFilters({ ...filters, staffId: e.target.value === 'all' ? undefined : e.target.value })}
            className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">พนักงานทั้งหมด</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>{s.name_th}</option>
            ))}
          </select>

          {/* Service Category */}
          <select
            value={filters.serviceCategory || 'all'}
            onChange={(e) => setFilters({ ...filters, serviceCategory: e.target.value === 'all' ? undefined : e.target.value })}
            className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">ทุกหมวดบริการ</option>
            <option value="massage">นวด</option>
            <option value="nail">ทำเล็บ</option>
            <option value="spa">สปา</option>
          </select>

          {/* Visibility */}
          <select
            value={filters.isVisible || 'all'}
            onChange={(e) => setFilters({ ...filters, isVisible: e.target.value as 'all' | 'visible' | 'hidden' })}
            className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">ทั้งหมด</option>
            <option value="visible">แสดงอยู่</option>
            <option value="hidden">ซ่อนอยู่</option>
          </select>

          {/* Sort */}
          <select
            value={filters.sortBy || 'newest'}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as AdminReviewFilters['sortBy'] })}
            className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="newest">ล่าสุด</option>
            <option value="oldest">เก่าสุด</option>
            <option value="highest">คะแนนสูงสุด</option>
            <option value="lowest">คะแนนต่ำสุด</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          <span className="ml-2 text-stone-600">กำลังโหลดรีวิว...</span>
        </div>
      )}

      {/* Empty */}
      {!isLoading && reviews.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
          <MessageSquare className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500 text-lg">ไม่พบรีวิว</p>
          <p className="text-sm text-stone-400 mt-1">ลองเปลี่ยนตัวกรองหรือค้นหาใหม่</p>
        </div>
      )}

      {/* Reviews List */}
      {!isLoading && reviews.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-stone-500">แสดง {reviews.length} รีวิว</p>

          {reviews.map((review) => {
            const customerName = review.customer?.full_name || 'ลูกค้า'
            return (
              <div
                key={review.id}
                className={`bg-white rounded-xl border overflow-hidden transition ${
                  review.is_visible ? 'border-stone-200 hover:shadow-md' : 'border-stone-200 opacity-60'
                }`}
              >
                {/* Header: Customer info */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${getAvatarColor(customerName)} flex items-center justify-center text-white font-bold text-sm`}>
                      {getInitials(customerName)}
                    </div>
                    <div>
                      <div className="font-semibold text-stone-900">{customerName}</div>
                      <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                        {review.service && (
                          <>
                            <span className={`px-1.5 py-0.5 rounded font-medium ${getCategoryColor(review.service.category)}`}>
                              {getCategoryLabel(review.service.category)}
                            </span>
                            <span>{review.service.name_th}</span>
                          </>
                        )}
                        {review.booking && (
                          <>
                            <span className="text-stone-300">|</span>
                            <span className="text-stone-400">{review.booking.booking_number}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!review.is_visible && (
                      <span className="px-2.5 py-1 bg-stone-100 text-stone-500 text-xs font-medium rounded-full">ซ่อนอยู่</span>
                    )}
                    <div className="flex items-center gap-1 text-xs text-stone-400">
                      <Clock className="w-3.5 h-3.5" />
                      {getRelativeTime(review.created_at)}
                    </div>
                  </div>
                </div>

                {/* Rating + Staff + Toggle */}
                <div className="flex items-center justify-between px-6 pb-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {renderStars(review.rating)}
                      <span className="text-2xl font-bold text-stone-900">{review.rating}<span className="text-base font-normal text-stone-400">/5</span></span>
                    </div>
                    {review.staff && (
                      <div className="flex items-center gap-1.5 text-sm text-stone-500">
                        <User className="w-4 h-4" />
                        <span>พนักงาน: <span className="font-medium text-stone-700">{review.staff.name_th}</span></span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => toggleVisibility.mutate({ reviewId: review.id, isVisible: !review.is_visible })}
                    disabled={toggleVisibility.isPending}
                    className={`flex-shrink-0 p-2 rounded-lg border transition ${
                      review.is_visible
                        ? 'border-green-200 bg-green-50 text-green-600 hover:bg-green-100'
                        : 'border-stone-200 bg-stone-50 text-stone-400 hover:bg-stone-100'
                    }`}
                    title={review.is_visible ? 'ซ่อนรีวิวนี้' : 'แสดงรีวิวนี้'}
                  >
                    {review.is_visible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>

                {/* Sub-ratings grid */}
                {(review.cleanliness_rating || review.professionalism_rating || review.skill_rating) && (
                  <div className="grid grid-cols-3 gap-3 mx-6 mb-4">
                    {[
                      { label: 'ความสะอาด', value: review.cleanliness_rating },
                      { label: 'ความเป็นมืออาชีพ', value: review.professionalism_rating },
                      { label: 'ทักษะ', value: review.skill_rating },
                    ].map((sub) => sub.value && (
                      <div key={sub.label} className="bg-stone-50 rounded-lg p-2.5 text-center">
                        <div className="text-xs text-stone-500 mb-1">{sub.label}</div>
                        <div className="flex items-center justify-center gap-1.5">
                          {renderStars(sub.value, 'sm')}
                          <span className="text-sm font-semibold text-stone-700">{sub.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Review text */}
                <div className="px-6 pb-5">
                  {review.review ? (
                    <div className="border-l-4 border-amber-300 bg-amber-50/50 rounded-r-lg py-3 px-4">
                      <p className="text-stone-700 text-sm leading-relaxed italic">
                        "{review.review}"
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-stone-400 italic">(ไม่มีความคิดเห็น)</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Reviews
