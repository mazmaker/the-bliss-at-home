/**
 * Extension Alert Banner - Shows pending extension alert on job detail page
 */

import React from 'react'
import { AlertTriangle, Clock, DollarSign, CheckCircle, Loader2 } from 'lucide-react'
import { usePendingExtensionAcknowledgments } from '../hooks/usePendingExtensionAcknowledgments'
import { toast } from 'react-hot-toast'

interface ExtensionAlertBannerProps {
  jobId: string
  className?: string
}

export function ExtensionAlertBanner({ jobId, className = "" }: ExtensionAlertBannerProps) {
  const {
    pendingExtensions,
    acknowledgeExtension,
    isAcknowledging
  } = usePendingExtensionAcknowledgments()

  // Find pending extensions for this specific job
  const jobPendingExtensions = pendingExtensions.filter(ext => ext.jobId === jobId)

  // Don't render if no pending extensions for this job
  if (jobPendingExtensions.length === 0) {
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

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('th-TH', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Calculate totals for this job's extensions
  const totalDuration = jobPendingExtensions.reduce((sum, ext) => sum + ext.duration, 0)
  const totalPrice = jobPendingExtensions.reduce((sum, ext) => sum + ext.price, 0)

  return (
    <div className={`bg-orange-50 border-l-4 border-orange-500 rounded-r-lg p-4 shadow-sm ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-orange-800">
              🔔 มีการเพิ่มเวลาบริการใหม่
            </h4>
            <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded-full font-medium">
              {jobPendingExtensions.length} รายการ
            </span>
          </div>

          {/* Summary */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-700 font-medium">
                เพิ่ม {totalDuration} นาที
              </span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">
                รายได้เพิ่ม +฿{totalPrice.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Extension Details */}
          {jobPendingExtensions.length === 1 ? (
            <SingleExtensionDetails
              extension={jobPendingExtensions[0]}
              formatTime={formatTime}
            />
          ) : (
            <MultipleExtensionsDetails
              extensions={jobPendingExtensions}
              formatTime={formatTime}
            />
          )}

          {/* Info Text */}
          <p className="text-sm text-orange-700 mt-3">
            💡 ตัวจับเวลาและรายได้จะอัพเดทอัตโนมัติหลังจากรับทราบ
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {jobPendingExtensions.length === 1 ? (
            <button
              onClick={() => handleAcknowledge(
                jobPendingExtensions[0].acknowledgmentId,
                jobPendingExtensions[0].serviceName
              )}
              disabled={isAcknowledging}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 flex items-center gap-1"
            >
              {isAcknowledging ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังรับทราบ...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  รับทราบ ✓
                </>
              )}
            </button>
          ) : (
            <button
              onClick={async () => {
                for (const ext of jobPendingExtensions) {
                  await handleAcknowledge(ext.acknowledgmentId, ext.serviceName)
                }
              }}
              disabled={isAcknowledging}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 flex items-center gap-1"
            >
              {isAcknowledging ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังรับทราบ...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  รับทราบทั้งหมด ✓
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Sub-component for single extension details
function SingleExtensionDetails({
  extension,
  formatTime
}: {
  extension: any
  formatTime: (timestamp: string) => string
}) {
  return (
    <div className="text-sm text-orange-700">
      <div>
        <strong>{extension.serviceName}</strong> - {extension.customerName}
      </div>
      <div className="text-orange-600">
        🕐 เพิ่มเมื่อ: {formatTime(extension.extendedAt)}
      </div>
    </div>
  )
}

// Sub-component for multiple extensions details
function MultipleExtensionsDetails({
  extensions,
  formatTime
}: {
  extensions: any[]
  formatTime: (timestamp: string) => string
}) {
  return (
    <div className="space-y-1">
      {extensions.map((ext, index) => (
        <div key={ext.acknowledgmentId} className="text-sm text-orange-700">
          <span className="font-medium">
            {index + 1}. +{ext.duration} นาที (+฿{ext.price.toLocaleString()})
          </span>
          <span className="text-orange-600 text-xs ml-2">
            🕐 {formatTime(ext.extendedAt)}
          </span>
        </div>
      ))}
    </div>
  )
}