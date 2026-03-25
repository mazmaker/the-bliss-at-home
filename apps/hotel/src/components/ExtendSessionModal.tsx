/**
 * Hotel App - ExtendSessionModal Component
 * Modal for selecting extension duration and confirming extension
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, User, MapPin, CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';
import { useExtendSession, useExtensionValidation } from '../hooks/useExtendSession';
import { BookingWithExtensions, ExtensionOption } from '../types/extendSession';

interface ExtendSessionModalProps {
  booking: BookingWithExtensions;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExtendSessionModal({
  booking,
  onConfirm,
  onCancel
}: ExtendSessionModalProps) {
  const [selectedDuration, setSelectedDuration] = useState<number>();
  const [notes, setNotes] = useState('');

  const {
    loading,
    error,
    extensionOptions,
    extendSession,
    loadExtensionOptions,
    clearError
  } = useExtendSession();

  const { validating, validateExtension } = useExtensionValidation();

  // Load extension options when modal opens
  useEffect(() => {
    loadExtensionOptions(booking.id);
  }, [booking.id, loadExtensionOptions]);

  // Calculate current totals
  const currentTotals = useMemo(() => {
    const totalDuration = booking.booking_services
      .reduce((sum, service) => sum + service.duration, 0);

    return {
      duration: totalDuration,
      price: booking.final_price,
      extensionCount: booking.extension_count || 0
    };
  }, [booking]);

  // Get selected option details
  const selectedOption = useMemo(() => {
    return extensionOptions.find(option => option.duration === selectedDuration);
  }, [extensionOptions, selectedDuration]);

  const handleConfirm = async () => {
    if (!selectedDuration) {
      alert('กรุณาเลือกเวลาที่ต้องการเพิ่ม');
      return;
    }

    try {
      const result = await extendSession({
        bookingId: booking.id,
        additionalDuration: selectedDuration,
        notes: notes.trim() || undefined,
        requestedBy: 'hotel_staff'
      });

      if (result) {
        onConfirm();
      }
    } catch (error) {
      // Error is already handled in the hook
      console.error('Extension failed:', error);
    }
  };

  const handleCancel = () => {
    clearError();
    onCancel();
  };

  // Show loading state while validating or loading options
  if (validating || (loading && extensionOptions.length === 0)) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            <span className="ml-3 text-stone-600">กำลังโหลด...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <h3 className="text-xl font-semibold text-stone-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-600" />
            เพิ่มเวลาบริการ
          </h3>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current booking info */}
          <div className="bg-stone-50 p-4 rounded-lg">
            <h4 className="font-medium text-stone-700 mb-3">การจองปัจจุบัน:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-stone-500" />
                <span>{booking.customer_name || 'ลูกค้า'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-stone-500" />
                <span>ห้อง {booking.hotel_room_number || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-stone-500" />
                <span>{currentTotals.duration} นาที</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-stone-500" />
                <span>฿{currentTotals.price.toLocaleString()}</span>
              </div>
            </div>

            {currentTotals.extensionCount > 0 && (
              <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
                <span className="text-xs text-amber-700">
                  📈 ขยายเวลาแล้ว {currentTotals.extensionCount} ครั้ง
                </span>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-medium text-red-800">ไม่สามารถเพิ่มเวลาได้</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Extension options */}
          <div className="space-y-4">
            <h4 className="font-medium text-stone-700">เลือกเวลาเพิ่มเติม:</h4>

            {extensionOptions.length === 0 ? (
              <div className="text-center py-8 text-stone-500">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                <p>ไม่มีตัวเลือกเวลาที่สามารถเพิ่มได้</p>
                <p className="text-sm mt-1">
                  อาจเนื่องจากเพิ่มเวลาครบจำนวนสูงสุดแล้ว หรือเวลาบริการจะยาวเกินไป
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {extensionOptions.map((option) => (
                  <label
                    key={option.duration}
                    className={`
                      flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all
                      ${selectedDuration === option.duration
                        ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200'
                        : 'border-stone-200 hover:bg-stone-50'
                      }
                      ${!option.isAvailable ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <input
                      type="radio"
                      name="duration"
                      value={option.duration}
                      checked={selectedDuration === option.duration}
                      onChange={(e) => setSelectedDuration(Number(e.target.value))}
                      disabled={!option.isAvailable}
                      className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                    />

                    <div className="flex-1">
                      <div className="font-medium text-stone-900">
                        เพิ่ม {option.duration} นาที - ฿{option.price.toLocaleString()}
                      </div>
                      <div className="text-sm text-stone-600 mt-1">
                        รวม: {option.totalNewDuration} นาที - ฿{option.totalNewPrice.toLocaleString()}
                      </div>
                    </div>

                    {option.isAvailable && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              หมายเหตุ (ถ้ามี):
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ระบุเหตุผลการเพิ่มเวลาหรือความต้องการพิเศษ..."
              rows={3}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Summary */}
          {selectedOption && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h5 className="font-medium text-green-800 mb-2">สรุปการเพิ่มเวลา:</h5>
              <div className="text-sm text-green-700 space-y-1">
                <div>⏱️ เวลาเดิม: {currentTotals.duration} นาที → เวลาใหม่: {selectedOption.totalNewDuration} นาที</div>
                <div>💰 ราคาเดิม: ฿{currentTotals.price.toLocaleString()} → ราคาใหม่: ฿{selectedOption.totalNewPrice.toLocaleString()}</div>
                <div>➕ ค่าเพิ่มเติม: ฿{selectedOption.price.toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-stone-200">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedDuration || loading || extensionOptions.length === 0}
            className={`
              flex-1 px-4 py-2 rounded-lg font-medium transition-colors
              ${!selectedDuration || loading || extensionOptions.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
              }
            `}
          >
            {loading ? 'กำลังดำเนินการ...' : 'ยืนยันเพิ่มเวลา'}
          </button>
        </div>
      </div>
    </div>
  );
}