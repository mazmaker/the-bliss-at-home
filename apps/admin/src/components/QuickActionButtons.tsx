import { ArrowLeft, ArrowRight, Check, SkipForward } from 'lucide-react'

interface QuickActionButtonsProps {
  currentStep: number
  totalSteps: number
  canGoNext: boolean
  canGoBack: boolean
  isLoading?: boolean
  onNext?: () => void
  onBack?: () => void
  onSkip?: () => void
  nextLabel?: string
  backLabel?: string
  skipLabel?: string
  showSkip?: boolean
}

export function QuickActionButtons({
  currentStep,
  totalSteps,
  canGoNext,
  canGoBack,
  isLoading = false,
  onNext,
  onBack,
  onSkip,
  nextLabel,
  backLabel,
  skipLabel,
  showSkip = false
}: QuickActionButtonsProps) {
  const isLastStep = currentStep === totalSteps

  return (
    <div className="bg-white border-t border-stone-200 p-4 rounded-b-xl">
      <div className="flex justify-between items-center gap-4">
        {/* Back Button */}
        {canGoBack ? (
          <button
            onClick={onBack}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel || 'ก่อนหน้า'}
          </button>
        ) : (
          <div></div>
        )}

        {/* Center - Step indicator */}
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <span className="font-medium text-[#d29b25]">{currentStep}</span>
          <span>จาก</span>
          <span>{totalSteps}</span>
          <span>ขั้นตอน</span>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Skip Button (optional) */}
          {showSkip && onSkip && (
            <button
              onClick={onSkip}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-stone-600 hover:text-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SkipForward className="w-4 h-4" />
              {skipLabel || 'ข้าม'}
            </button>
          )}

          {/* Next/Finish Button */}
          <button
            onClick={onNext}
            disabled={!canGoNext || isLoading}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isLastStep
                ? 'bg-[#b6d387] text-white hover:bg-[#9bc76f] shadow-lg'
                : 'bg-[#d29b25] text-white hover:bg-[#b8851e] shadow-lg'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                กำลังดำเนินการ...
              </>
            ) : (
              <>
                {nextLabel || (isLastStep ? 'เสร็จสิ้น' : 'ถัดไป')}
                {isLastStep ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-[#d29b25] to-[#b6d387] h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        ></div>
      </div>

      {/* Step completion text */}
      <div className="mt-2 text-center">
        <p className="text-xs text-stone-500">
          {currentStep === totalSteps
            ? '🎉 เสร็จสิ้นทุกขั้นตอนแล้ว พร้อมส่งการจองให้ Staff'
            : `เสร็จแล้ว ${currentStep - 1} จาก ${totalSteps} ขั้นตอน`
          }
        </p>
      </div>
    </div>
  )
}

export default QuickActionButtons