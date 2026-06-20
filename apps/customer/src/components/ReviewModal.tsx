import { useState, useEffect } from 'react'
import { Modal } from '@bliss/ui'
import { useTranslation } from '@bliss/i18n'
import { Star, CheckCircle, Loader2 } from 'lucide-react'
import { useReviewByBookingId, useCreateReview } from '@bliss/supabase/hooks/useReviews'

interface ReviewModalProps {
  isOpen: boolean
  onClose: () => void
  bookingId: string
  bookingNumber: string
  serviceName: string
  staffName: string
  staffId: string
  serviceId: string
  customerId: string
}

function StarRating({
  value,
  onChange,
  disabled = false,
  size = 'lg',
}: {
  value: number
  onChange?: (v: number) => void
  disabled?: boolean
  size?: 'sm' | 'lg'
}) {
  const [hover, setHover] = useState(0)
  const sizeClass = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5'

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !disabled && setHover(star)}
          onMouseLeave={() => !disabled && setHover(0)}
          className={`${disabled ? 'cursor-default' : 'cursor-pointer'} transition`}
        >
          <Star
            className={`${sizeClass} ${
              star <= (hover || value)
                ? 'text-amber-500 fill-amber-500'
                : 'text-stone-300'
            } transition`}
          />
        </button>
      ))}
    </div>
  )
}

export function ReviewModal({
  isOpen,
  onClose,
  bookingId,
  bookingNumber,
  serviceName,
  staffName,
  staffId,
  serviceId,
  customerId,
}: ReviewModalProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [cleanlinessRating, setCleanlinessRating] = useState(0)
  const [professionalismRating, setProfessionalismRating] = useState(0)
  const [skillRating, setSkillRating] = useState(0)
  const [error, setError] = useState('')

  const { data: existingReview, isLoading: loadingReview } = useReviewByBookingId(
    isOpen ? bookingId : undefined
  )
  const { mutateAsync: createReview, isPending: submitting } = useCreateReview()

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('form')
      setRating(0)
      setReviewText('')
      setCleanlinessRating(0)
      setProfessionalismRating(0)
      setSkillRating(0)
      setError('')
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (rating === 0) {
      setError(t('booking:review.ratingRequired'))
      return
    }

    setError('')

    try {
      await createReview({
        booking_id: bookingId,
        customer_id: customerId,
        staff_id: staffId || null,
        service_id: serviceId || null,
        rating,
        review: reviewText.trim() || null,
        cleanliness_rating: cleanlinessRating || null,
        professionalism_rating: professionalismRating || null,
        skill_rating: skillRating || null,
      })
      setStep('success')
    } catch (err: any) {
      if (err?.code === '23505') {
        setError(t('booking:review.alreadyReviewed'))
      } else {
        setError(err?.message || t('common:error.generic'))
      }
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('booking:review.modalTitle')} size="md">
      <div className="py-2">
        {/* Loading */}
        {loadingReview && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-4" />
            <p className="text-stone-600">{t('common:loading.default')}</p>
          </div>
        )}

        {/* Already reviewed - read-only view */}
        {!loadingReview && existingReview && step === 'form' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-1">{t('booking:review.alreadyReviewed')}</h3>
              <p className="text-sm text-stone-500">{t('booking:review.bookingNumber')} {bookingNumber}</p>
            </div>

            {/* Existing review display */}
            <div className="bg-stone-50 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-stone-700">{t('booking:review.overallRating')}</span>
                <div className="flex items-center gap-2">
                  <StarRating value={existingReview.rating} disabled size="sm" />
                  <span className="font-bold text-stone-900">{existingReview.rating}/5</span>
                </div>
              </div>

              {existingReview.cleanliness_rating && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-600">{t('booking:review.cleanliness')}</span>
                  <StarRating value={existingReview.cleanliness_rating} disabled size="sm" />
                </div>
              )}
              {existingReview.professionalism_rating && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-600">{t('booking:review.professionalism')}</span>
                  <StarRating value={existingReview.professionalism_rating} disabled size="sm" />
                </div>
              )}
              {existingReview.skill_rating && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-600">{t('booking:review.skill')}</span>
                  <StarRating value={existingReview.skill_rating} disabled size="sm" />
                </div>
              )}

              {existingReview.review && (
                <div className="pt-3 border-t border-stone-200">
                  <p className="text-sm text-stone-600 mb-1">{t('booking:review.reviewMessage')}</p>
                  <p className="text-stone-800">{existingReview.review}</p>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition"
            >
              {t('common:close')}
            </button>
          </div>
        )}

        {/* Review form */}
        {!loadingReview && !existingReview && step === 'form' && (
          <div className="space-y-6">
            {/* Booking summary */}
            <div className="bg-stone-50 rounded-xl p-4">
              <p className="text-sm text-stone-500 mb-1">{t('booking:review.forBooking')}</p>
              <p className="font-medium text-stone-900">{serviceName}</p>
              <p className="text-sm text-stone-600">{t('booking:staffLabel')} {staffName}</p>
              <p className="text-sm text-stone-500">{t('booking:bookingNumberLabel')} {bookingNumber}</p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Overall rating */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {t('booking:review.overallRating')} <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <StarRating value={rating} onChange={setRating} />
                {rating > 0 && (
                  <span className="text-lg font-bold text-amber-700">{rating}/5</span>
                )}
              </div>
            </div>

            {/* Sub-ratings */}
            <div className="space-y-3 bg-stone-50 rounded-xl p-4">
              <p className="text-sm font-medium text-stone-700 mb-1">{t('booking:review.subRatingsOptional')}</p>

              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600">{t('booking:review.cleanliness')}</span>
                <StarRating value={cleanlinessRating} onChange={setCleanlinessRating} size="sm" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600">{t('booking:review.professionalism')}</span>
                <StarRating value={professionalismRating} onChange={setProfessionalismRating} size="sm" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600">{t('booking:review.skill')}</span>
                <StarRating value={skillRating} onChange={setSkillRating} size="sm" />
              </div>
            </div>

            {/* Review text */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {t('booking:review.reviewMessageOptional')}
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder={t('booking:review.sharePlaceholder')}
                rows={4}
                className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-6 py-3 border border-stone-300 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition disabled:opacity-50"
              >
                {t('common:cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
                className="flex-1 px-6 py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('common:submitting')}
                  </>
                ) : (
                  t('booking:review.submit')
                )}
              </button>
            </div>
          </div>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">{t('booking:review.thankYou')}</h3>
            <p className="text-stone-600 mb-6">
              {t('booking:review.helpText')}
            </p>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition"
            >
              {t('common:close')}
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
