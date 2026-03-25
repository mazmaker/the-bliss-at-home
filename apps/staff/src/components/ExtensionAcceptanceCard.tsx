/**
 * Extension Acceptance Card - Shows pending extensions on dashboard
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { Bell, Clock, DollarSign, User, CheckCircle, Loader2 } from 'lucide-react'
import { usePendingExtensionAcknowledgments, type PendingExtension } from '../hooks/usePendingExtensionAcknowledgments'
import { toast } from 'react-hot-toast'

export function ExtensionAcceptanceCard() {
  const {
    pendingExtensions,
    acknowledgeExtension,
    acknowledgeAll,
    isAcknowledging
  } = usePendingExtensionAcknowledgments()

  // Don't render if no pending extensions
  if (pendingExtensions.length === 0) {
    return null
  }

  const handleAcknowledge = async (acknowledgmentId: string, serviceName: string) => {
    try {
      await acknowledgeExtension(acknowledgmentId)
      toast.success(`รับทราบการเพิ่มเวลา${serviceName}แล้ว ✓`)
    } catch (error) {
      toast.error('ไม่สามารถรับทราบได้ กรุณาลองใหม่')
    }
  }

  const handleAcknowledgeAll = async () => {
    try {
      await acknowledgeAll()
      toast.success(`รับทราบการเพิ่มเวลาทั้งหมด ${pendingExtensions.length} รายการแล้ว ✓`)
    } catch (error) {
      toast.error('ไม่สามารถรับทราบได้ กรุณาลองใหม่')
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('th-TH', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const totalExtraEarnings = pendingExtensions.reduce((sum, ext) => sum + ext.price, 0)

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-amber-600" />
        <h3 className="font-semibold text-amber-800">
          การเพิ่มเวลาบริการที่รอรับทราบ
        </h3>
        <span className="px-2 py-1 bg-amber-200 text-amber-800 text-xs rounded-full font-medium">
          {pendingExtensions.length} รายการ
        </span>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg p-3 mb-4 border border-amber-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">
                รวม {pendingExtensions.reduce((sum, ext) => sum + ext.duration, 0)} นาที
              </span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">
                +฿{totalExtraEarnings.toLocaleString()}
              </span>
            </div>
          </div>
          {pendingExtensions.length > 1 && (
            <button
              onClick={handleAcknowledgeAll}
              disabled={isAcknowledging}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-1"
            >
              {isAcknowledging ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังรับทราบ...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  รับทราบทั้งหมด
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Extension List */}
      <div className="space-y-3">
        {pendingExtensions.map((extension, index) => (
          <ExtensionItem
            key={extension.acknowledgmentId}
            extension={extension}
            index={index}
            onAcknowledge={handleAcknowledge}
            isAcknowledging={isAcknowledging}
            formatTime={formatTime}
          />
        ))}
      </div>

      {/* Info Note */}
      <div className="mt-4 p-2 bg-amber-100 rounded-lg text-xs text-amber-700 flex items-start gap-2">
        <Bell className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          💡 การเพิ่มเวลาเหล่านี้ถูกจัดการโดยโรงแรมและจะส่งผลต่อรายได้ของคุณ
          กรุณารับทราบเพื่อยืนยันว่าคุณได้เห็นการอัพเดทแล้ว
        </span>
      </div>
    </div>
  )
}

// Sub-component for individual extension item
interface ExtensionItemProps {
  extension: PendingExtension
  index: number
  onAcknowledge: (id: string, serviceName: string) => Promise<void>
  isAcknowledging: boolean
  formatTime: (timestamp: string) => string
}

function ExtensionItem({
  extension,
  index,
  onAcknowledge,
  isAcknowledging,
  formatTime
}: ExtensionItemProps) {
  return (
    <div className="bg-white rounded-lg p-3 border border-amber-100">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-medium">
              {index + 1}
            </span>
            <div>
              <span className="font-medium text-gray-900">{extension.serviceName}</span>
              <span className="text-gray-500 text-sm ml-2">#{extension.bookingNumber}</span>
            </div>
          </div>

          <div className="ml-8 space-y-1">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{extension.customerName}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>+{extension.duration} นาที</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-green-600" />
                <span className="text-green-600 font-medium">+฿{extension.price.toLocaleString()}</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              🕐 เพิ่มเมื่อ: {formatTime(extension.extendedAt)}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 ml-4">
          <button
            onClick={() => onAcknowledge(extension.acknowledgmentId, extension.serviceName)}
            disabled={isAcknowledging}
            className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-1"
          >
            {isAcknowledging ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            รับทราบ
          </button>

          <Link
            to={`/staff/job/${extension.jobId}`}
            className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm text-center hover:bg-gray-200 transition-colors"
          >
            ดูรายละเอียด
          </Link>
        </div>
      </div>
    </div>
  )
}