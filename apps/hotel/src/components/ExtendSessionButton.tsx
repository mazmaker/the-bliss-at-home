/**
 * Hotel App - ExtendSessionButton Component
 * Button to trigger booking extension with modal
 */

import React, { useState } from 'react';
import { Plus, Clock, AlertCircle } from 'lucide-react';
import { ExtendSessionModal } from './ExtendSessionModal';
import { useExtensionStatus } from '../hooks/useExtendSession';
import { BookingWithExtensions } from '../types/extendSession';

interface ExtendSessionButtonProps {
  booking: BookingWithExtensions;
  onExtended?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
}

export function ExtendSessionButton({
  booking,
  onExtended,
  disabled = false,
  size = 'md',
  variant = 'primary'
}: ExtendSessionButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const extensionStatus = useExtensionStatus(booking);

  const handleExtensionComplete = () => {
    setShowModal(false);
    onExtended?.();
  };

  const handleExtensionCancel = () => {
    setShowModal(false);
  };

  // Determine if button should be enabled
  const isEnabled = !disabled && extensionStatus.canExtend;

  // Get appropriate styling based on props
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'px-3 py-1.5 text-sm';
      case 'lg': return 'px-6 py-3 text-lg';
      default: return 'px-4 py-2 text-base';
    }
  };

  const getVariantClasses = () => {
    if (!isEnabled) {
      return 'bg-gray-300 text-gray-500 cursor-not-allowed';
    }

    switch (variant) {
      case 'secondary':
        return 'bg-stone-600 hover:bg-stone-700 text-white';
      case 'outline':
        return 'border-2 border-amber-600 text-amber-600 hover:bg-amber-50';
      default:
        return 'bg-amber-600 hover:bg-amber-700 text-white';
    }
  };

  // Get tooltip/help text
  const getHelpText = () => {
    if (extensionStatus.maxExtensionsReached) {
      return 'เพิ่มเวลาได้สูงสุด 3 ครั้งต่อการจอง';
    }
    if (booking.status !== 'confirmed') {
      return 'สามารถเพิ่มเวลาได้เฉพาะการจองที่ยืนยันแล้ว';
    }
    return 'เพิ่มเวลาบริการสำหรับการจองนี้';
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowModal(true)}
          disabled={!isEnabled}
          title={getHelpText()}
          className={`
            flex items-center gap-2 rounded-lg font-medium transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2
            ${getSizeClasses()}
            ${getVariantClasses()}
          `}
        >
          <Plus className="w-4 h-4" />
          เพิ่มเวลาบริการ
        </button>

        {/* Extension status indicator */}
        {extensionStatus.hasExtensions && (
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
            {extensionStatus.extensionCount}
          </div>
        )}
      </div>

      {/* Warning message for max extensions */}
      {extensionStatus.maxExtensionsReached && (
        <div className="flex items-center gap-2 mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-orange-500" />
          <span className="text-sm text-orange-700">
            เพิ่มเวลาครบ 3 ครั้งแล้ว (สูงสุด)
          </span>
        </div>
      )}

      {/* Extension info for bookings with extensions */}
      {extensionStatus.hasExtensions && !extensionStatus.maxExtensionsReached && (
        <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
          <Clock className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-700">
            ขยายเวลาแล้ว {extensionStatus.extensionCount} ครั้ง
            {extensionStatus.lastExtendedAt && (
              <span className="ml-1">
                (ล่าสุด: {new Date(extensionStatus.lastExtendedAt).toLocaleString('th-TH')})
              </span>
            )}
          </span>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ExtendSessionModal
          booking={booking}
          onConfirm={handleExtensionComplete}
          onCancel={handleExtensionCancel}
        />
      )}
    </>
  );
}

/**
 * Compact version for use in lists or cards
 */
export function ExtendSessionButtonCompact({
  booking,
  onExtended,
  disabled = false
}: Omit<ExtendSessionButtonProps, 'size' | 'variant'>) {
  return (
    <ExtendSessionButton
      booking={booking}
      onExtended={onExtended}
      disabled={disabled}
      size="sm"
      variant="outline"
    />
  );
}

/**
 * Large version for prominent placement
 */
export function ExtendSessionButtonLarge({
  booking,
  onExtended,
  disabled = false
}: Omit<ExtendSessionButtonProps, 'size' | 'variant'>) {
  return (
    <ExtendSessionButton
      booking={booking}
      onExtended={onExtended}
      disabled={disabled}
      size="lg"
      variant="primary"
    />
  );
}