import type { ReactNode } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  /** color theme of the icon ring + confirm button */
  variant?: 'danger' | 'primary'
  /** optional icon shown in the colored ring (e.g. <Power />) */
  icon?: ReactNode
  /** disables both buttons + shows a saving label on confirm */
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Reusable confirm modal for the staff app.
 *
 * Generalised from the inline logout-confirm modal that previously lived in
 * StaffLayout — same markup/styling, so it matches the existing app pattern
 * (and is NOT a native window.confirm()).
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  variant = 'primary',
  icon,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const accent =
    variant === 'danger'
      ? { ring: 'bg-red-100 text-red-600', btn: 'bg-red-600 hover:bg-red-700' }
      : { ring: 'bg-green-100 text-green-600', btn: 'bg-green-600 hover:bg-green-700' }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <div className="text-center">
          {icon && (
            <div className={`w-12 h-12 ${accent.ring} rounded-full flex items-center justify-center mx-auto mb-4`}>
              {icon}
            </div>
          )}
          <h3 className="text-lg font-semibold text-bliss-900 mb-2">{title}</h3>
          <p className="text-sm text-bliss-500 mb-6">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-bliss-300 rounded-xl text-bliss-700 font-medium hover:bg-bliss-50 transition disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 px-4 py-2.5 ${accent.btn} text-white rounded-xl font-medium transition disabled:opacity-50`}
            >
              {isLoading ? 'กำลังบันทึก...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
