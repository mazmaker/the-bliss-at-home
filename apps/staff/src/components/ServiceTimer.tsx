/**
 * Service Timer Component
 * Displays countdown timer for service duration
 */

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface ServiceTimerProps {
  startedAt: string // ISO timestamp
  durationMinutes: number
}

export function ServiceTimer({ startedAt, durationMinutes }: ServiceTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isOvertime, setIsOvertime] = useState(false)

  // 🛠️ DEBUG: Log timer props on mount
  console.log('🕐 ServiceTimer mounted with:', {
    startedAt,
    durationMinutes,
    startedAt_type: typeof startedAt,
    startedAt_isNull: startedAt === null || startedAt === 'null'
  })

  useEffect(() => {
    const calculateTimeRemaining = () => {
      // 🚨 SAFETY: Check for null or invalid startedAt
      if (!startedAt || startedAt === null || startedAt === 'null') {
        console.log('⚠️ ServiceTimer: Invalid startedAt, using current time as start')
        // Use current time as start time if startedAt is invalid
        const now = new Date().getTime()
        const elapsed = 0 // Just started
        const totalSeconds = durationMinutes * 60
        const remaining = totalSeconds - elapsed
        setIsOvertime(false)
        setTimeRemaining(remaining)
        return
      }

      const now = new Date().getTime()
      const started = new Date(startedAt).getTime()

      // 🔍 DEBUG: Check startedAt value
      console.log('🕐 ServiceTimer Debug:', {
        startedAt_raw: startedAt,
        startedAt_parsed: new Date(startedAt),
        started_timestamp: started,
        now_timestamp: now,
        difference_ms: now - started,
        difference_hours: (now - started) / (1000 * 60 * 60)
      })

      // 🚨 SAFETY: Check for invalid timestamps (before year 2000)
      if (started < new Date('2000-01-01').getTime()) {
        console.log('⚠️ ServiceTimer: startedAt too old, using current time')
        const elapsed = 0
        const totalSeconds = durationMinutes * 60
        const remaining = totalSeconds - elapsed
        setIsOvertime(false)
        setTimeRemaining(remaining)
        return
      }

      const elapsed = Math.floor((now - started) / 1000) // elapsed in seconds
      const totalSeconds = durationMinutes * 60
      const remaining = totalSeconds - elapsed

      if (remaining <= 0) {
        setIsOvertime(true)
        setTimeRemaining(Math.abs(remaining))
      } else {
        setIsOvertime(false)
        setTimeRemaining(remaining)
      }
    }

    // Calculate immediately
    calculateTimeRemaining()

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [startedAt, durationMinutes])

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getProgressPercentage = (): number => {
    const totalSeconds = durationMinutes * 60
    const elapsed = totalSeconds - (isOvertime ? 0 : timeRemaining)
    return Math.min(100, (elapsed / totalSeconds) * 100)
  }

  const getTimerColor = (): string => {
    if (isOvertime) return 'text-red-600'
    if (timeRemaining < 300) return 'text-bliss-600' // Less than 5 minutes
    return 'text-bliss-700'
  }

  const getProgressBarColor = (): string => {
    if (isOvertime) return 'bg-red-600'
    if (timeRemaining < 300) return 'bg-bliss-600'
    return 'bg-bliss-600'
  }

  return (
    <div className="bg-gradient-to-br from-bliss-50 to-bliss-100 rounded-xl p-4 border border-bliss-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className={`w-5 h-5 ${getTimerColor()}`} />
          <span className="text-sm font-medium text-bliss-900">
            {isOvertime ? 'เวลาเพิ่มเติม' : 'เวลาที่เหลือ'}
          </span>
        </div>
        <div className={`text-2xl font-bold ${getTimerColor()}`}>
          {isOvertime && '+'}
          {formatTime(timeRemaining)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-2 bg-bliss-200 rounded-full overflow-hidden">
        <div
          className={`absolute top-0 left-0 h-full ${getProgressBarColor()} transition-all duration-1000 ease-linear`}
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>

      {/* Duration Info */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-bliss-600">
          ระยะเวลา: {durationMinutes} นาที
        </span>
        {isOvertime && (
          <span className="text-xs text-red-600 font-medium animate-pulse">
            เกินเวลาที่กำหนด
          </span>
        )}
        {!isOvertime && timeRemaining < 300 && timeRemaining > 0 && (
          <span className="text-xs text-bliss-600 font-medium">
            ใกล้หมดเวลา
          </span>
        )}
      </div>
    </div>
  )
}

export default ServiceTimer
