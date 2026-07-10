/**
 * Hotel App - ExtendSessionModal Component
 * Modal for selecting extension duration and confirming extension
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, User, Users, MapPin, CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';
import { useExtendSession, useExtensionValidation } from '../hooks/useExtendSession';
import { getHotelExtensionInfo } from '../services/extendSessionService';
import { BookingWithExtensions, ExtensionOption, HotelExtensionInfo, EXTENSION_BUSINESS_RULES } from '../types/extendSession';

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
  // COUPLE support: per-recipient info + which recipient(s) to extend.
  const [coupleInfo, setCoupleInfo] = useState<HotelExtensionInfo | null>(null);
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([]);

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

  // Load per-recipient info (drives the couple selector). Default to the first recipient.
  useEffect(() => {
    let active = true;
    getHotelExtensionInfo(booking.id)
      .then((info) => {
        if (!active) return;
        setCoupleInfo(info);
        setSelectedRecipients(info.recipients.length > 0 ? [info.recipients[0].recipientIndex] : []);
      })
      .catch(() => { if (active) setCoupleInfo(null); });
    return () => { active = false; };
  }, [booking.id]);

  const isCouple = !!coupleInfo?.isCouple;

  // Couple: recompute options for the SELECTED recipient(s), each priced by its own service ("ทั้งคู่"
  // sums both). Single keeps the server-computed extensionOptions.
  const coupleOptions = useMemo<ExtensionOption[]>(() => {
    if (!coupleInfo || !isCouple || selectedRecipients.length === 0) return [];
    const chosen = coupleInfo.recipients.filter(r => selectedRecipients.includes(r.recipientIndex));
    if (chosen.length === 0) return [];
    const maxCurrent = Math.max(...chosen.map(r => r.currentDuration));
    // Offer a duration only if EVERY chosen recipient's service supports it (avoids a phantom ฿0 option
    // when the two couple services have different duration_options).
    return coupleInfo.availableDurations
      .filter(d => d > 0 && chosen.every(r => r.prices[d] !== undefined))
      .map(d => {
        const price = chosen.reduce((sum, r) => sum + (r.prices[d] ?? 0), 0);
        const totalNewDuration = maxCurrent + d;
        const isAvailable = totalNewDuration <= EXTENSION_BUSINESS_RULES.MAX_SESSION_DURATION
          && coupleInfo.extensionCount < EXTENSION_BUSINESS_RULES.MAX_EXTENSIONS;
        return {
          duration: d,
          price,
          totalNewDuration,
          totalNewPrice: booking.final_price + price,
          isAvailable,
          label: `ขยายเป็น ${totalNewDuration} นาที (+${d} นาที)`,
        };
      })
      .filter(o => o.isAvailable);
  }, [coupleInfo, isCouple, selectedRecipients, booking.final_price]);

  const displayOptions = isCouple ? coupleOptions : extensionOptions;

  // Reset the chosen duration if it's no longer offered after a recipient change.
  useEffect(() => {
    if (selectedDuration && !displayOptions.some(o => o.duration === selectedDuration)) {
      setSelectedDuration(undefined);
    }
  }, [displayOptions, selectedDuration]);

  // Calculate current totals
  const currentTotals = useMemo(() => {
    // Couple: current duration of the selected recipient(s) (max).
    if (isCouple && coupleInfo && selectedRecipients.length > 0) {
      const chosen = coupleInfo.recipients.filter(r => selectedRecipients.includes(r.recipientIndex));
      return {
        duration: chosen.length > 0 ? Math.max(...chosen.map(r => r.currentDuration)) : 0,
        price: booking.final_price,
        extensionCount: coupleInfo.extensionCount,
      };
    }
    // Single: scope to the base recipient.
    const targetRecipient = booking.booking_services.find((s: any) => !s.is_extension)?.recipient_index ?? 0;
    const totalDuration = booking.booking_services
      .filter((s: any) => (s.recipient_index ?? 0) === targetRecipient)
      .reduce((sum, service) => sum + service.duration, 0);

    return {
      duration: totalDuration,
      price: booking.final_price,
      extensionCount: booking.extension_count || 0
    };
  }, [booking, isCouple, coupleInfo, selectedRecipients]);

  // Get selected option details
  const selectedOption = useMemo(() => {
    return displayOptions.find(option => option.duration === selectedDuration);
  }, [displayOptions, selectedDuration]);

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
        requestedBy: 'hotel_staff',
        // COUPLE: extend the chosen recipient(s), not booking_services[0].
        ...(isCouple && selectedRecipients.length > 0 ? { recipientIndices: selectedRecipients } : {}),
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bliss-600"></div>
            <span className="ml-3 text-bliss-600">กำลังโหลด...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-bliss-200">
          <h3 className="text-xl font-semibold text-bliss-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-bliss-600" />
            เพิ่มเวลาบริการ
          </h3>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-bliss-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-bliss-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current booking info */}
          <div className="bg-bliss-50 p-4 rounded-lg">
            <h4 className="font-medium text-bliss-700 mb-3">การจองปัจจุบัน:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-bliss-500" />
                <span>{booking.customer_name || 'ลูกค้า'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-bliss-500" />
                <span>ห้อง {booking.hotel_room_number || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-bliss-500" />
                <span>{currentTotals.duration} นาที</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-bliss-500" />
                <span>฿{currentTotals.price.toLocaleString()}</span>
              </div>
            </div>

            {currentTotals.extensionCount > 0 && (
              <div className="mt-3 p-2 bg-bliss-50 border border-bliss-200 rounded">
                <span className="text-xs text-bliss-700">
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

          {/* Recipient selector (COUPLE only) — คนที่1 / คนที่2 / ทั้งคู่ */}
          {isCouple && coupleInfo && (
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 font-medium text-bliss-700">
                <Users className="w-4 h-4" />
                เพิ่มเวลาให้
              </h4>
              <div className="grid gap-2">
                {[
                  ...coupleInfo.recipients.map((r) => ({
                    key: `r${r.recipientIndex}`,
                    indices: [r.recipientIndex],
                    label: `คนที่ ${r.recipientIndex + 1}`,
                    sub: r.serviceNameTh || '',
                  })),
                  {
                    key: 'both',
                    indices: coupleInfo.recipients.map((r) => r.recipientIndex),
                    label: 'ทั้งคู่',
                    sub: '',
                  },
                ].map((choice) => {
                  const active = selectedRecipients.length === choice.indices.length &&
                    choice.indices.every((i) => selectedRecipients.includes(i));
                  return (
                    <label
                      key={choice.key}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${active ? 'border-bliss-500 bg-bliss-50 ring-2 ring-bliss-200' : 'border-bliss-200 hover:bg-bliss-50'}`}
                    >
                      <input
                        type="radio"
                        name="recipient"
                        checked={active}
                        onChange={() => setSelectedRecipients(choice.indices)}
                        className="w-4 h-4 text-bliss-600 focus:ring-bliss-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-bliss-900">{choice.label}</div>
                        {choice.sub && <div className="text-sm text-bliss-600">{choice.sub}</div>}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Extension options */}
          <div className="space-y-4">
            <h4 className="font-medium text-bliss-700">เลือกเวลาเพิ่มเติม:</h4>

            {displayOptions.length === 0 ? (
              <div className="text-center py-8 text-bliss-500">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                <p>ไม่มีตัวเลือกเวลาที่สามารถเพิ่มได้</p>
                <p className="text-sm mt-1">
                  อาจเนื่องจากเพิ่มเวลาครบจำนวนสูงสุดแล้ว หรือเวลาบริการจะยาวเกินไป
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayOptions.map((option) => (
                  <label
                    key={option.duration}
                    className={`
                      flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all
                      ${selectedDuration === option.duration
                        ? 'border-bliss-500 bg-bliss-50 ring-2 ring-bliss-200'
                        : 'border-bliss-200 hover:bg-bliss-50'
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
                      className="w-4 h-4 text-bliss-600 focus:ring-bliss-500"
                    />

                    <div className="flex-1">
                      <div className="font-medium text-bliss-900">
                        เพิ่ม {option.duration} นาที - ฿{option.price.toLocaleString()}
                      </div>
                      <div className="text-sm text-bliss-600 mt-1">
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
            <label className="block text-sm font-medium text-bliss-700 mb-2">
              หมายเหตุ (ถ้ามี):
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ระบุเหตุผลการเพิ่มเวลาหรือความต้องการพิเศษ..."
              rows={3}
              className="w-full px-3 py-2 border border-bliss-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bliss-500 focus:border-bliss-500"
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
        <div className="flex gap-3 p-6 border-t border-bliss-200">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 border border-bliss-300 rounded-lg text-bliss-700 hover:bg-bliss-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedDuration || loading || displayOptions.length === 0}
            className={`
              flex-1 px-4 py-2 rounded-lg font-medium transition-colors
              ${!selectedDuration || loading || displayOptions.length === 0
                ? 'bg-bliss-300 text-bliss-500 cursor-not-allowed'
                : 'bg-bliss-600 hover:bg-bliss-700 text-white'
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