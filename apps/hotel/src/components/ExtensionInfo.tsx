/**
 * Hotel App - Extension Info Component
 * Shows booking extension details for hotel managers
 */

import React from 'react';
import { Clock, Wallet, Calendar, TrendingUp, Plus } from 'lucide-react';

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
  const totalExtensionPrice = totalPrice - originalPrice;

  return (
    <div className={`bg-bliss-50 border border-bliss-200 rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-bliss-600" />
        <h3 className="font-semibold text-bliss-800">การเพิ่มเวลาบริการ</h3>
        <span className="px-2 py-1 bg-bliss-200 text-bliss-800 text-xs rounded-full">
          +{extensions.length} ครั้ง
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {/* Original Service */}
        <div className="bg-white rounded-lg p-3 border border-bliss-100">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-bliss-600" />
            <span className="text-sm text-bliss-600 font-medium">บริการเดิม</span>
          </div>
          <div className="space-y-1">
            <div className="font-bold text-bliss-800">{originalDuration} นาที</div>
            <div className="font-bold text-green-600">฿{originalPrice.toLocaleString()}</div>
          </div>
        </div>

        {/* Extension */}
        <div className="bg-white rounded-lg p-3 border border-bliss-100">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="w-4 h-4 text-bliss-600" />
            <span className="text-sm text-bliss-600 font-medium">เวลาเพิ่ม</span>
          </div>
          <div className="space-y-1">
            <div className="font-bold text-bliss-700">+{totalExtensionTime} นาที</div>
            <div className="font-bold text-bliss-600">+฿{totalExtensionPrice.toLocaleString()}</div>
          </div>
        </div>

        {/* Total */}
        <div className="bg-gradient-to-r from-bliss-500 to-bliss-600 rounded-lg p-3 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4" />
            <span className="text-sm font-medium">รวมทั้งสิ้น</span>
          </div>
          <div className="space-y-1">
            <div className="font-bold text-lg">{totalDuration} นาที</div>
            <div className="font-bold text-lg">฿{totalPrice.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Extension History */}
      <div>
        <h4 className="font-medium text-bliss-700 mb-3 flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          ประวัติการเพิ่มเวลา
        </h4>
        <div className="space-y-2">
          {extensions
            .sort((a, b) => new Date(a.extended_at).getTime() - new Date(b.extended_at).getTime())
            .map((extension, index) => (
              <div
                key={extension.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-bliss-100"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-bliss-100 text-bliss-700 rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <div>
                    <div className="text-sm text-bliss-600">
                      {new Date(extension.extended_at).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div className="text-bliss-700 font-semibold">
                    +{extension.duration} นาที
                  </div>
                  <div className="text-bliss-600 font-semibold">
                    +฿{extension.price.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-4 p-3 bg-bliss-100 rounded-lg">
        <div className="text-xs text-bliss-700">
          💡 <strong>หมายเหตุ:</strong> ราคาที่แสดงเป็นราคาเต็มสำหรับโรงแรม (รวมส่วนลดโรงแรมแล้ว)
        </div>
      </div>
    </div>
  );
}