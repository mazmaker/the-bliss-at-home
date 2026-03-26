/**
 * Staff App - Extension Info Component
 * Shows booking extension details and history
 */

import React from 'react';
import { Clock, DollarSign, Calendar, TrendingUp } from 'lucide-react';

interface ExtensionService {
  id: string;
  duration: number;
  price: number;
  extended_at: string;
  sort_order: number;
}

interface ExtensionInfoProps {
  originalDuration: number;
  originalPrice: number;
  extensions: ExtensionService[];
  totalDuration: number;
  totalPrice: number;
  className?: string;
}

export function ExtensionInfo({
  originalDuration,
  originalPrice,
  extensions,
  totalDuration,
  totalPrice,
  className = ""
}: ExtensionInfoProps) {
  if (extensions.length === 0) {
    return null;
  }

  const totalExtensionTime = extensions.reduce((sum, ext) => sum + ext.duration, 0);
  // Use actual total price from database (includes real commission rates)
  const totalExtensionPrice = totalPrice - originalPrice;

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
            ฿{(originalPrice || 0).toLocaleString()} → ฿{(totalPrice || 0).toLocaleString()}
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
            .sort((a, b) => new Date(a.extended_at).getTime() - new Date(b.extended_at).getTime())
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
                    {new Date(extension.extended_at).toLocaleString('th-TH', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="text-amber-700 font-medium">+{extension.duration} นาที</span>
                  <span className="text-green-600 font-medium">+฿{((extension.price || 0) * 0.25).toLocaleString()}</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Note */}
      <div className="mt-3 p-2 bg-amber-100 rounded text-xs text-amber-700">
        💡 รายได้ที่แสดงเป็นส่วนแบ่งของสตาฟ (25% จากราคาการเพิ่มเวลา)
      </div>
    </div>
  );
}