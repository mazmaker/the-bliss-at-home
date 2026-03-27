import { shouldShowDiscount, calculateDiscountedPrice, getGlobalDiscountPercentage } from '../utils/discountUtils'

interface DiscountPriceProps {
  originalPrice: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showBadge?: boolean
}

export function DiscountPrice({
  originalPrice,
  className = '',
  size = 'md',
  showBadge = true
}: DiscountPriceProps) {
  const hasDiscount = shouldShowDiscount(originalPrice)
  const discountedPrice = calculateDiscountedPrice(originalPrice)
  const discountPercentage = getGlobalDiscountPercentage()

  const sizeClasses = {
    sm: {
      price: 'text-sm',
      original: 'text-xs',
      badge: 'text-xs px-2 py-1'
    },
    md: {
      price: 'text-lg',
      original: 'text-sm',
      badge: 'text-xs px-2 py-1'
    },
    lg: {
      price: 'text-2xl',
      original: 'text-lg',
      badge: 'text-sm px-3 py-1'
    }
  }

  const sizes = sizeClasses[size]

  if (!hasDiscount) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className={`font-semibold text-stone-900 ${sizes.price}`}>
          ฿{originalPrice.toLocaleString()}
        </span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Discount Badge */}
      {showBadge && (
        <span className={`bg-amber-500 text-white font-bold rounded-full ${sizes.badge}`}>
          ลด {discountPercentage}%
        </span>
      )}

      <div className="flex items-center gap-2">
        {/* Original Price (Strikethrough) */}
        <span className={`text-gray-400 line-through ${sizes.original}`}>
          ฿{originalPrice.toLocaleString()}
        </span>

        {/* Discounted Price */}
        <span className={`font-bold text-amber-700 ${sizes.price}`}>
          ฿{discountedPrice.toLocaleString()}
        </span>
      </div>
    </div>
  )
}