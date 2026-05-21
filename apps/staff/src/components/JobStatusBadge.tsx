import { JobStatus } from '@bliss/supabase'

interface JobStatusBadgeProps {
  status: JobStatus
  isGPSTracking?: boolean
  className?: string
}

export default function JobStatusBadge({ status, isGPSTracking = false, className = "" }: JobStatusBadgeProps) {
  // ✅ Professional Fix: Show correct status based on GPS tracking state
  let displayStatus = status

  // If GPS is tracking, override status to show 'traveling'
  if (isGPSTracking && status === 'confirmed') {
    displayStatus = 'traveling'
  }

  const badges: Record<JobStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    assigned: 'bg-orange-100 text-orange-700 border-orange-200',
    confirmed: 'bg-amber-100 text-amber-700 border-amber-200',
    traveling: 'bg-amber-100 text-amber-700 border-amber-200',
    arrived: 'bg-purple-100 text-purple-700 border-purple-200',
    in_progress: 'bg-purple-100 text-purple-700 border-purple-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  }

  const labels: Record<JobStatus, string> = {
    pending: 'รอมอบหมาย',
    assigned: 'มอบหมายแล้ว',
    confirmed: 'ยืนยันแล้ว',
    traveling: 'กำลังเดินทาง',
    arrived: 'ถึงแล้ว',
    in_progress: 'กำลังดำเนินการ',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${badges[displayStatus]} ${className}`}>
      {labels[displayStatus]}
    </span>
  )
}