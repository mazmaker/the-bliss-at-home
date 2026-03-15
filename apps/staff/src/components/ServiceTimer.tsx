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

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime()
      const started = new Date(startedAt).getTime()
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
    if (timeRemaining < 300) return 'text-amber-600' // Less than 5 minutes
    return 'text-purple-700'
  }

  const getProgressBarColor = (): string => {
    if (isOvertime) return 'bg-red-600'
    if (timeRemaining < 300) return 'bg-amber-600'
    return 'bg-purple-600'
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className={`w-5 h-5 ${getTimerColor()}`} />
          <span className="text-sm font-medium text-purple-900">
            {isOvertime ? 'เวลาเพิ่มเติม' : 'เวลาที่เหลือ'}
          </span>
        </div>
        <div className={`text-2xl font-bold ${getTimerColor()}`}>
          {isOvertime && '+'}
          {formatTime(timeRemaining)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-2 bg-purple-200 rounded-full overflow-hidden">
        <div
          className={`absolute top-0 left-0 h-full ${getProgressBarColor()} transition-all duration-1000 ease-linear`}
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>

      {/* Duration Info */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-purple-600">
          ระยะเวลา: {durationMinutes} นาที
        </span>
        {isOvertime && (
          <span className="text-xs text-red-600 font-medium animate-pulse">
            เกินเวลาที่กำหนด
          </span>
        )}
        {!isOvertime && timeRemaining < 300 && timeRemaining > 0 && (
          <span className="text-xs text-amber-600 font-medium">
            ใกล้หมดเวลา
          </span>
        )}
      </div>
    </div>
  )
}

export default ServiceTimer
