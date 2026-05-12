/**
 * Customer Type Badge Component
 * แสดง badge สำหรับแยกลูกค้ารายใหม่/รายเก่า และแหล่งที่มา (Customer App/Hotel App)
 */

import React from 'react'

interface CustomerTypeBadgeProps {
  /** ประเภทลูกค้า: new = รายใหม่, returning = รายเก่า */
  type: 'new' | 'returning'
  /** จำนวนการจองทั้งหมด (สำหรับแสดงใน tooltip) */
  totalBookings?: number
  /** ยอดใช้จ่ายรวม (สำหรับแสดงใน tooltip) */
  totalSpent?: number
}

export function CustomerTypeBadge({
  type,
  totalBookings = 0,
  totalSpent = 0
}: CustomerTypeBadgeProps) {

  const getBadgeConfig = () => {
    return type === 'new'
      ? {
          label: 'ลูกค้าใหม่',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        }
      : {
          label: 'ลูกค้าเก่า',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200'
        }
  }

  const config = getBadgeConfig()

  const tooltipContent = totalBookings > 0 ? (
    `${totalBookings} การจอง • ฿${totalSpent.toLocaleString()}`
  ) : 'ยังไม่มีประวัติการจอง'

  return (
    <span
      className={`
        inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        cursor-help transition-colors hover:opacity-80
      `}
      title={tooltipContent}
    >
      {config.label}
    </span>
  )
}

export default CustomerTypeBadge