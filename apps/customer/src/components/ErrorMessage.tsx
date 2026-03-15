import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorMessageProps {
  message?: string
  title?: string
  onRetry?: () => void
  className?: string
}

function ErrorMessage({
  message = 'เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง',
  title = 'เกิดข้อผิดพลาด',
  onRetry,
  className = '',
}: ErrorMessageProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900 mb-1">{title}</h3>
            <p className="text-sm text-red-800 mb-4">{message}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>ลองใหม่อีกครั้ง</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ErrorMessage
