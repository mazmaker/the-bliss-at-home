/**
 * Hotel App - BookingCard Component with Extend Session Integration
 * Enhanced booking card that includes extend session functionality
 */

import React from 'react';
import {
  Clock, User, MapPin, CreditCard, Calendar,
  CheckCircle, XCircle, AlertCircle, Edit, History
} from 'lucide-react';
import { ExtendSessionButton } from './ExtendSessionButton';
import { BookingWithExtensions } from '../types/extendSession';

interface BookingCardProps {
  booking: any; // Using existing SimpleBooking type from BookingHistory
  onExtended?: () => void;
  onEdit?: (booking: any) => void;
  onView?: (booking: any) => void;
  showExtendButton?: boolean;
}

export function BookingCard({
  booking,
  onExtended,
  onEdit,
  onView,
  showExtendButton = true
}: BookingCardProps) {

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'confirmed': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'in_progress': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-stone-600 bg-stone-50 border-stone-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const canShowExtendButton = showExtendButton &&
    ['confirmed', 'in_progress'].includes(booking.status) &&
    (booking.extension_count || 0) < 3;

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="p-4 border-b border-stone-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-semibold text-stone-900">{booking.booking_number}</h3>
              <p className="text-sm text-stone-500">{booking.guest_name}</p>
            </div>
          </div>

          <div className={`
            flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border
            ${getStatusColor(booking.status)}
          `}>
            {getStatusIcon(booking.status)}
            {booking.status === 'in_progress' ? 'กำลังให้บริการ' :
             booking.status === 'confirmed' ? 'ยืนยันแล้ว' :
             booking.status === 'completed' ? 'เสร็จสิ้น' :
             booking.status === 'cancelled' ? 'ยกเลิก' : 'รอยืนยัน'}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Service Info */}
        <div className="flex items-center gap-2 text-sm">
          <Briefcase className="w-4 h-4 text-stone-500" />
          <span className="font-medium">{booking.service_name}</span>
          <span className="text-stone-500">({booking.duration} นาที)</span>
        </div>

        {/* Location & Time */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-stone-500" />
            <span>ห้อง {booking.room_number}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-stone-500" />
            <span>{new Date(booking.booking_date).toLocaleDateString('th-TH')}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-stone-500" />
            <span>{booking.booking_time}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-stone-500" />
            <span>{booking.staff_name || 'ยังไม่กำหนด'}</span>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 text-sm">
          <CreditCard className="w-4 h-4 text-stone-500" />
          <span className="font-semibold">฿{booking.final_price.toLocaleString()}</span>
          <span className={`
            px-2 py-1 rounded text-xs
            ${booking.payment_status === 'paid'
              ? 'bg-green-50 text-green-700'
              : 'bg-orange-50 text-orange-700'
            }
          `}>
            {booking.payment_status === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}
          </span>
        </div>

        {/* Extension Info */}
        {(booking.extension_count || 0) > 0 && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <History className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700">
              ขยายเวลาแล้ว {booking.extension_count} ครั้ง
              {booking.total_extensions_price && (
                <span className="ml-1">
                  (+฿{booking.total_extensions_price.toLocaleString()})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Notes */}
        {booking.customer_notes && (
          <div className="text-xs text-stone-600 bg-stone-50 p-2 rounded">
            {booking.customer_notes}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-stone-100">
        <div className="flex items-center gap-2">
          {/* View Details Button */}
          <button
            onClick={() => onView?.(booking)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
          >
            <Eye className="w-4 h-4" />
            ดูรายละเอียด
          </button>

          {/* Edit Button (if applicable) */}
          {['confirmed', 'pending'].includes(booking.status) && (
            <button
              onClick={() => onEdit?.(booking)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
            >
              <Edit className="w-4 h-4" />
              แก้ไข
            </button>
          )}

          {/* Extend Session Button */}
          {canShowExtendButton && (
            <div className="ml-auto">
              <ExtendSessionButton
                booking={booking}
                onExtended={onExtended}
                size="sm"
                variant="primary"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}