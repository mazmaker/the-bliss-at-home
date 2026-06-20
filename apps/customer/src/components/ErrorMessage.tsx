import { AlertCircle, RefreshCw } from 'lucide-react'
import { useTranslation } from '@bliss/i18n'

interface ErrorMessageProps {
  message?: string
  title?: string
  onRetry?: () => void
  className?: string
}

function ErrorMessage({
  message,
  title,
  onRetry,
  className = '',
}: ErrorMessageProps) {
  const { t } = useTranslation()
  const finalMessage = message ?? t('common:error.loadDataFailed')
  const finalTitle = title ?? t('common:error.title')
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
            <h3 className="text-lg font-semibold text-red-900 mb-1">{finalTitle}</h3>
            <p className="text-sm text-red-800 mb-4">{finalMessage}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t('common:button.retry')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ErrorMessage
