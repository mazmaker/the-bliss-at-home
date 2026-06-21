/**
 * Staff App - Extension Info Component
 * Shows booking extension details and history
 */

import React from 'react';
import { Clock, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { normalizeCommissionRate, calculateStaffEarnings } from '../utils/commissionUtils';

interface ExtensionService {
  id: string;
  duration: number;
  price: number; // Customer price
  extended_at: string | null;
  sort_order: number;
}

interface ExtensionInfoProps {
  originalDuration: number;
  originalPrice: number;
  extensions: ExtensionService[];
  totalDuration: number;
  totalPrice: number;
  // Fixed-rate config (from services table)
  useFixedRate?: boolean;
  staffEarning60?: number;
  staffEarning90?: number;
  staffEarning120?: number;
  // Fallback commission rate
  staffCommissionRate?: number;
  className?: string;
}

function calcExtensionEarningsPerItem(
  duration: number,
  customerPrice: number,
  useFixedRate: boolean,
  earning60: number,
  earning90: number,
  earning120: number,
  commissionRate: number
): number {
  if (useFixedRate) {
    const fixed = duration === 60 ? earning60
      : duration === 120 ? earning120
      : earning90
    return Math.round(Number(fixed) || 0)
  }
  return Math.round(customerPrice * (normalizeCommissionRate(commissionRate) / 100))
}

export function ExtensionInfo({
  originalDuration,
  originalPrice,
  extensions,
  totalDuration,
  totalPrice,
  useFixedRate = false,
  staffEarning60 = 0,
  staffEarning90 = 0,
  staffEarning120 = 0,
  staffCommissionRate = 0,
  className = ""
}: ExtensionInfoProps) {
  if (extensions.length === 0) {
    return null;
  }

  const totalExtensionTime = extensions.reduce((sum, ext) => sum + ext.duration, 0);
  const totalExtensionPrice = extensions.reduce((sum, ext) =>
    sum + calcExtensionEarningsPerItem(
      ext.duration, ext.price, useFixedRate,
      staffEarning60, staffEarning90, staffEarning120, staffCommissionRate
    ), 0);

  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-5 h-5 text-amber-600" />
        <h3 className="font-semibold text-amber-800">การเพิ่มเวลาบริการ</h3>
        <span className="px-2 py-1 bg-amber-200 text-amber-800 text-xs rounded-full">
          +{extensions.length} ครั้ง
        </span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-white rounded-lg border border-amber-100">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600">เวลาเพิ่ม</span>
          </div>
          <div className="font-bold text-amber-700">+{totalExtensionTime} นาที</div>
          <div className="text-xs text-gray-500">
            {originalDuration} → {totalDuration} นาที
          </div>
        </div>

        <div className="text-center p-3 bg-white rounded-lg border border-amber-100">
          <div className="flex items-center justify-center gap-1 mb-1">
            <DollarSign className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600">รายได้เพิ่ม</span>
          </div>
          <div className="font-bold text-green-600">+฿{(totalExtensionPrice || 0).toLocaleString()}</div>
          <div className="text-xs text-gray-500">
            ฿{(originalPrice || 0).toLocaleString()} → ฿{(originalPrice + totalExtensionPrice).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Extension History */}
      <div>
        <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          ประวัติการเพิ่มเวลา
        </h4>
        <div className="space-y-2">
          {extensions
            .sort((a, b) => new Date(a.extended_at ?? 0).getTime() - new Date(b.extended_at ?? 0).getTime())
            .map((extension, index) => (
              <div
                key={extension.id}
                className="flex items-center justify-between p-2 bg-white rounded border border-amber-100 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="text-gray-600">
                    {extension.extended_at && new Date(extension.extended_at).toLocaleString('th-TH', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="text-amber-700 font-medium">+{extension.duration} นาที</span>
                  <span className="text-green-600 font-medium">
                    +฿{calcExtensionEarningsPerItem(
                      extension.duration, extension.price || 0, useFixedRate,
                      staffEarning60, staffEarning90, staffEarning120, staffCommissionRate
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Note */}
      <div className="mt-3 p-2 bg-amber-100 rounded text-xs text-amber-700">
        {useFixedRate
          ? '💡 รายได้ตามอัตราที่แอดมินกำหนดต่อช่วงเวลา'
          : `💡 รายได้ส่วนแบ่ง ${normalizeCommissionRate(staffCommissionRate)}% จากราคาการเพิ่มเวลา`
        }
      </div>
    </div>
  );
}