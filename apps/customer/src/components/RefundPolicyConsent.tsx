/**
 * RefundPolicyConsent Component
 * - Scrollable terms box (must scroll to bottom to enable checkbox)
 * - Checkbox to accept terms
 * - Can be used in Register page (inline) or as Modal (after Google login / before booking)
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { CheckCircle, FileText, Loader2 } from 'lucide-react'
import { supabase } from '@bliss/supabase/auth'

interface RefundPolicyConsentProps {
  /** Called when user accepts the policy */
  onAccept?: () => void
  /** Called when user dismisses (only for modal mode) */
  onDismiss?: () => void
  /** Show as modal overlay */
  asModal?: boolean
  /** For register form: controlled checkbox state */
  accepted?: boolean
  onAcceptedChange?: (accepted: boolean) => void
  /** Hide accept button (register form handles submit separately) */
  hideAcceptButton?: boolean
}

export function RefundPolicyConsent({
  onAccept,
  onDismiss,
  asModal = false,
  accepted,
  onAcceptedChange,
  hideAcceptButton = false,
}: RefundPolicyConsentProps) {
  const [policyContent, setPolicyContent] = useState('')
  const [policyVersion, setPolicyVersion] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [isAccepted, setIsAccepted] = useState(accepted ?? false)
  const [isSaving, setIsSaving] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Sync controlled state
  useEffect(() => {
    if (accepted !== undefined) setIsAccepted(accepted)
  }, [accepted])

  // Load policy content from settings
  useEffect(() => {
    loadPolicy()
  }, [])

  const loadPolicy = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'refund_policy_content')
        .single()

      if (data?.value) {
        const val = typeof data.value === 'object' && 'value' in data.value ? data.value.value : data.value
        const ver = typeof data.value === 'object' && 'version' in data.value ? data.value.version : '1.0'
        setPolicyContent(typeof val === 'string' ? val : '')
        setPolicyVersion(typeof ver === 'string' ? ver : '1.0')
      }
    } catch (err) {
      console.error('Failed to load refund policy:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30
    if (isAtBottom) setHasScrolledToBottom(true)
  }, [])

  // Check if content is short enough to not need scrolling
  useEffect(() => {
    const el = scrollRef.current
    if (el && el.scrollHeight <= el.clientHeight) {
      setHasScrolledToBottom(true)
    }
  }, [policyContent])

  const handleCheckboxChange = (checked: boolean) => {
    setIsAccepted(checked)
    onAcceptedChange?.(checked)
  }

  const handleAccept = async () => {
    if (!isAccepted) return
    setIsSaving(true)
    try {
      // Save consent timestamp to profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({
            refund_policy_accepted_at: new Date().toISOString(),
            refund_policy_version: policyVersion,
          })
          .eq('id', user.id)
      }
      onAccept?.()
    } catch (err) {
      console.error('Failed to save consent:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const content = (
    <div className={asModal ? '' : 'mt-4'}>
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-5 h-5 text-amber-600" />
        <h3 className="font-semibold text-stone-900">เงื่อนไขการคืนเงิน</h3>
        {policyVersion && <span className="text-xs text-stone-400">v{policyVersion}</span>}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
        </div>
      ) : (
        <>
          {/* Scrollable Terms Box */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-64 overflow-y-auto border border-stone-300 rounded-lg p-4 bg-stone-50 text-sm leading-relaxed whitespace-pre-wrap text-stone-700"
          >
            {policyContent}
          </div>

          {!hasScrolledToBottom && (
            <p className="text-xs text-amber-600 mt-1 text-center animate-pulse">
              กรุณาเลื่อนอ่านเงื่อนไขให้ครบก่อน
            </p>
          )}

          {/* Checkbox */}
          <label className={`flex items-start gap-3 mt-3 p-3 rounded-lg border ${isAccepted ? 'border-green-300 bg-green-50' : 'border-stone-200'} ${!hasScrolledToBottom ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={isAccepted}
              onChange={(e) => handleCheckboxChange(e.target.checked)}
              disabled={!hasScrolledToBottom}
              className="mt-0.5 w-4 h-4 text-amber-600 focus:ring-amber-500 rounded"
            />
            <span className="text-sm text-stone-700">
              ข้าพเจ้าได้อ่านและยอมรับเงื่อนไขการคืนเงินข้างต้นแล้ว
            </span>
            {isAccepted && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />}
          </label>

          {/* Accept Button (for modal mode) */}
          {!hideAcceptButton && (
            <button
              onClick={handleAccept}
              disabled={!isAccepted || isSaving}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              ยืนยันยอมรับเงื่อนไข
            </button>
          )}
        </>
      )}
    </div>
  )

  if (!asModal) return content

  // Modal wrapper
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden p-6">
        {content}
      </div>
    </div>
  )
}

/**
 * Hook to check if current user has accepted refund policy
 */
export function useRefundPolicyConsent() {
  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkConsent()
  }, [])

  const checkConsent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setHasAccepted(false)
        return
      }

      // Get user's consent version
      const { data: profile } = await supabase
        .from('profiles')
        .select('refund_policy_accepted_at, refund_policy_version')
        .eq('id', user.id)
        .single()

      if (!profile?.refund_policy_accepted_at) {
        setHasAccepted(false)
        return
      }

      // Check if consent matches current policy version
      const { data: settings } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'refund_policy_content')
        .single()

      const currentVersion = settings?.value && typeof settings.value === 'object' && 'version' in settings.value
        ? settings.value.version
        : '1.0'

      setHasAccepted(profile.refund_policy_version === currentVersion)
    } catch (err) {
      console.error('Failed to check consent:', err)
      setHasAccepted(false)
    } finally {
      setIsLoading(false)
    }
  }

  return { hasAccepted, isLoading, recheckConsent: checkConsent }
}
