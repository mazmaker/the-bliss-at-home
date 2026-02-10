import { useState } from 'react'
import { Star, MessageSquare, Filter, Loader2, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { Staff } from '../services/staffService'
import {
  useStaffReviews,
  useReviewsStats,
  getRelativeTime,
  type ReviewFilters,
} from '../hooks/useStaffReviews'

interface ReviewsTabProps {
  staff: Staff
}

export function ReviewsTabContent({ staff }: ReviewsTabProps) {
  const [filters, setFilters] = useState<ReviewFilters>({
    sortBy: 'newest',
  })

  // Fetch reviews and stats
  const { data: reviews = [], isLoading: reviewsLoading } = useStaffReviews(staff.id, filters)
  const { data: stats, isLoading: statsLoading } = useReviewsStats(staff.id)

  // Render star rating
  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
    }

    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating
                ? 'text-amber-500 fill-amber-500'
                : 'text-stone-300'
            }`}
          />
        ))}
      </div>
    )
  }

  // Loading state
  if (reviewsLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        <span className="ml-2 text-stone-600">กำลังโหลดรีวิว...</span>
      </div>
    )
  }

  // No reviews state
  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="w-16 h-16 text-stone-300 mx-auto mb-4" />
        <p className="text-stone-500">ยังไม่มีรีวิวจากลูกค้า</p>
        <p className="text-sm text-stone-400 mt-2">รีวิวจะแสดงที่นี่หลังจากลูกค้าให้คะแนน</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Overall Rating */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Star className="w-8 h-8 text-amber-600 fill-amber-600" />
            </div>
            <div className="text-4xl font-bold text-amber-900 mb-1">
              {stats.average_rating.toFixed(1)}
            </div>
            <p className="text-sm font-medium text-amber-700">คะแนนเฉลี่ย</p>
            <p className="text-xs text-amber-600 mt-1">จาก {stats.total} รีวิว</p>
            <div className="mt-3">
              {renderStars(Math.round(stats.average_rating), 'sm')}
            </div>
          </div>

          {/* Total Reviews */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-4xl font-bold text-blue-900 mb-1">
              {stats.total}
            </div>
            <p className="text-sm font-medium text-blue-700">รีวิวทั้งหมด</p>
            <p className="text-xs text-blue-600 mt-1">Total Reviews</p>
          </div>

          {/* Rating Distribution */}
          <div className="bg-white border border-stone-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-stone-900 mb-3">การกระจายคะแนน</h3>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.rating_distribution[rating as keyof typeof stats.rating_distribution]
                const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0
                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-stone-700 w-8">{rating} ⭐</span>
                    <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-stone-500 w-8 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-stone-500" />
          <span className="text-sm font-medium text-stone-700">กรองและเรียง:</span>
        </div>

        {/* Rating Filter */}
        <select
          value={filters.rating || 'all'}
          onChange={(e) => setFilters({
            ...filters,
            rating: e.target.value === 'all' ? undefined : parseInt(e.target.value)
          })}
          className="px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="all">ทุกคะแนน</option>
          <option value="5">5 ดาว</option>
          <option value="4">4 ดาว</option>
          <option value="3">3 ดาว</option>
          <option value="2">2 ดาว</option>
          <option value="1">1 ดาว</option>
        </select>

        {/* Sort By */}
        <select
          value={filters.sortBy || 'newest'}
          onChange={(e) => setFilters({
            ...filters,
            sortBy: e.target.value as ReviewFilters['sortBy']
          })}
          className="px-3 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="newest">ล่าสุด</option>
          <option value="oldest">เก่าสุด</option>
          <option value="highest">คะแนนสูงสุด</option>
          <option value="lowest">คะแนนต่ำสุด</option>
        </select>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-white border border-stone-200 rounded-xl p-6 hover:shadow-md transition"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {renderStars(review.rating, 'md')}
                  <span className="text-sm font-semibold text-stone-900">
                    {review.rating.toFixed(1)}
                  </span>
                </div>
                <p className="text-xs text-stone-500">
                  {getRelativeTime(review.created_at)}
                </p>
              </div>

              {/* Sub-ratings */}
              {(review.cleanliness_rating || review.professionalism_rating || review.skill_rating) && (
                <div className="flex flex-col gap-1">
                  {review.cleanliness_rating && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500">ความสะอาด:</span>
                      {renderStars(review.cleanliness_rating, 'sm')}
                    </div>
                  )}
                  {review.professionalism_rating && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500">ความเป็นมืออาชีพ:</span>
                      {renderStars(review.professionalism_rating, 'sm')}
                    </div>
                  )}
                  {review.skill_rating && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500">ทักษะ:</span>
                      {renderStars(review.skill_rating, 'sm')}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Review Text */}
            {review.review && (
              <div className="bg-stone-50 rounded-lg p-4">
                <p className="text-sm text-stone-700 leading-relaxed">
                  {review.review}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      {stats && stats.total > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-stone-900 mb-2">สรุปรีวิว</h3>
              <ul className="space-y-2 text-sm text-stone-600">
                {stats.average_rating >= 4.5 && (
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>พนักงานได้รับคะแนนเฉลี่ยสูงมาก ({stats.average_rating.toFixed(1)}/5.0) แสดงถึงการบริการที่ดีเยี่ยม</span>
                  </li>
                )}
                {stats.average_rating >= 4.0 && stats.average_rating < 4.5 && (
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">✓</span>
                    <span>พนักงานได้รับคะแนนเฉลี่ยดี ({stats.average_rating.toFixed(1)}/5.0) ควรพัฒนาต่อเพื่อความเป็นเลิศ</span>
                  </li>
                )}
                {stats.average_rating < 4.0 && (
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600">⚠</span>
                    <span>ควรปรับปรุงคุณภาพการบริการเพื่อเพิ่มความพึงพอใจของลูกค้า</span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">📊</span>
                  <span>
                    มีรีวิวทั้งหมด {stats.total} รีวิว
                    {stats.rating_distribution[5] > 0 && ` มี ${stats.rating_distribution[5]} รีวิว 5 ดาว`}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
