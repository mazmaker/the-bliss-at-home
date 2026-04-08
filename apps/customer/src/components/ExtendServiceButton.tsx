/**
 * Customer App - ExtendServiceButton Component
 * Button for customers to trigger service extension modal
 */

import React, { useState } from 'react'
import { Plus, Clock, AlertCircle, Sparkles } from 'lucide-react'
import { ExtendServiceModal } from './ExtendServiceModal'
import { useExtensionStatus } from '../hooks/useExtendBooking'
import { BookingWithExtensions } from '../types/extendService'

interface ExtendServiceButtonProps {
  booking: BookingWithExtensions
  onExtended?: () => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'outline'
  fullWidth?: boolean
}

export function ExtendServiceButton({
  booking,
  onExtended,
  disabled = false,
  size = 'md',
  variant = 'primary',
  fullWidth = false
}: ExtendServiceButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const extensionStatus = useExtensionStatus(booking)

  // 🔍 Debug log
  console.log('🔍 ExtendServiceButton Debug:', {
    bookingStatus: booking.status,
    canExtend: extensionStatus.canExtend,
    reasonIfCannot: extensionStatus.reasonIfCannot,
    extensionCount: booking.extension_count,
    maxExtensions: 3
  })

  const handleExtensionComplete = () => {
    setShowModal(false)
    onExtended?.()
  }

  const handleExtensionCancel = () => {
    setShowModal(false)
  }

  // Determine if button should be enabled
  const isEnabled = !disabled && extensionStatus.canExtend

  // Get appropriate styling based on props
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'px-3 py-2 text-sm'
      case 'lg': return 'px-6 py-4 text-lg'
      default: return 'px-4 py-3 text-base'
    }
  }

  const getVariantClasses = () => {
    if (!isEnabled) {
      return 'bg-gray-300 text-gray-500 cursor-not-allowed'
    }

    switch (variant) {
      case 'secondary':
        return 'bg-stone-600 hover:bg-stone-700 text-white'
      case 'outline':
        return 'border-2 border-amber-600 text-amber-600 hover:bg-amber-50 bg-white'
      default:
        return 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25'
    }
  }

  // Get tooltip/help text
  const getHelpText = () => {
    if (!extensionStatus.canExtend) {
      return extensionStatus.reasonIfCannot || 'ไม่สามารถเพิ่มเวลาได้ในขณะนี้'
    }
    return 'เพิ่มเวลาบริการสำหรับการจองนี้'
  }

  // Get button text based on status
  const getButtonText = () => {
    if (size === 'sm') {
      return 'เพิ่มเวลา'
    }
    return 'เพิ่มเวลาบริการ'
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowModal(true)}
          disabled={!isEnabled}
          title={getHelpText()}
          className={`
            flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2
            ${getSizeClasses()}
            ${getVariantClasses()}
            ${fullWidth ? 'w-full' : ''}
            ${isEnabled ? 'transform hover:scale-105 active:scale-95' : ''}
          `}
        >
          {isEnabled ? (
            <Plus className={`${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}`} />
          ) : (
            <AlertCircle className={`${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}`} />
          )}
          {getButtonText()}
        </button>

        {/* Extension count indicator */}
        {extensionStatus.hasExtensions && (
          <div className="absolute -top-2 -right-2 min-w-[20px] h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center px-1">
            {extensionStatus.extensionCount}
          </div>
        )}
      </div>

      {/* Extension status info */}
      <div className="space-y-2">
        {/* Warning for max extensions */}
        {extensionStatus.maxExtensionsReached && (
          <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <span className="text-sm text-orange-700">
              เพิ่มเวลาครบ 3 ครั้งแล้ว (สูงสุด)
            </span>
          </div>
        )}

        {/* Extension info for bookings with extensions */}
        {extensionStatus.hasExtensions && !extensionStatus.maxExtensionsReached && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div className="text-sm text-amber-700">
              <div className="font-medium">ขยายเวลาแล้ว {extensionStatus.extensionCount} ครั้ง</div>
              {extensionStatus.lastExtendedAt && (
                <div className="text-xs text-amber-600">
                  ล่าสุด: {new Date(extensionStatus.lastExtendedAt).toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cannot extend reason */}
        {!extensionStatus.canExtend && !extensionStatus.maxExtensionsReached && extensionStatus.reasonIfCannot && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-600">
              {extensionStatus.reasonIfCannot}
            </span>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <ExtendServiceModal
          booking={booking}
          onConfirm={handleExtensionComplete}
          onCancel={handleExtensionCancel}
        />
      )}
    </>
  )
}

/**
 * Compact version for use in cards or lists
 */
export function ExtendServiceButtonCompact({
  booking,
  onExtended,
  disabled = false
}: Omit<ExtendServiceButtonProps, 'size' | 'variant' | 'fullWidth'>) {
  return (
    <ExtendServiceButton
      booking={booking}
      onExtended={onExtended}
      disabled={disabled}
      size="sm"
      variant="outline"
    />
  )
}

/**
 * Large version for prominent placement
 */
export function ExtendServiceButtonLarge({
  booking,
  onExtended,
  disabled = false,
  fullWidth = true
}: Omit<ExtendServiceButtonProps, 'size' | 'variant'>) {
  return (
    <ExtendServiceButton
      booking={booking}
      onExtended={onExtended}
      disabled={disabled}
      size="lg"
      variant="primary"
      fullWidth={fullWidth}
    />
  )
}