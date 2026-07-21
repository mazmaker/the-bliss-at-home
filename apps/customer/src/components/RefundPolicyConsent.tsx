/**
 * RefundPolicyConsent Component
 * - Scrollable terms box (must scroll to bottom to enable checkbox)
 * - Checkbox to accept terms
 * - Can be used in Register page (inline) or as Modal (after Google login / before booking)
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { CheckCircle, FileText, Loader2 } from 'lucide-react'
import { supabase, useAuth } from '@bliss/supabase/auth'
import { useTranslation } from '@bliss/i18n'

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
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [policyContent, setPolicyContent] = useState('')
  const [policyContentEn, setPolicyContentEn] = useState('')
  const [policyContentCn, setPolicyContentCn] = useState('')
  const [policyContentKr, setPolicyContentKr] = useState('')
  const [policyContentJp, setPolicyContentJp] = useState('')
  const [policyVersion, setPolicyVersion] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [isAccepted, setIsAccepted] = useState(accepted ?? false)
  const [isSaving, setIsSaving] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Pick the policy content for the current language; fall back to Thai when a translation is blank
  const displayContent =
    i18n.language === 'cn' ? (policyContentCn || policyContent)
    : i18n.language === 'kr' ? (policyContentKr || policyContent)
    : i18n.language === 'jp' ? (policyContentJp || policyContent)
    : i18n.language === 'en' ? (policyContentEn || policyContent)
    : policyContent

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
        const valEn = typeof data.value === 'object' && 'value_en' in data.value ? data.value.value_en : ''
        const valCn = typeof data.value === 'object' && 'value_cn' in data.value ? data.value.value_cn : ''
        const valKr = typeof data.value === 'object' && 'value_kr' in data.value ? data.value.value_kr : ''
        const valJp = typeof data.value === 'object' && 'value_jp' in data.value ? data.value.value_jp : ''
        const ver = typeof data.value === 'object' && 'version' in data.value ? data.value.version : '1.0'
        setPolicyContent(typeof val === 'string' ? val : '')
        setPolicyContentEn(typeof valEn === 'string' ? valEn : '')
        setPolicyContentCn(typeof valCn === 'string' ? valCn : '')
        setPolicyContentKr(typeof valKr === 'string' ? valKr : '')
        setPolicyContentJp(typeof valJp === 'string' ? valJp : '')
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
  }, [displayContent])

  const handleCheckboxChange = (checked: boolean) => {
    setIsAccepted(checked)
    onAcceptedChange?.(checked)
  }

  const handleAccept = async () => {
    if (!isAccepted) return
    setIsSaving(true)
    try {
      // Save consent to profile. Use the AuthProvider user (localStorage session) rather than a
      // supabase.auth.getUser() NETWORK call — in flaky in-app browsers getUser() could return null
      // and silently SKIP the save, so the acceptance never persisted and the modal kept re-showing.
      if (user?.id) {
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
        <FileText className="w-5 h-5 text-bliss-600" />
        <h3 className="font-semibold text-bliss-900">{t('common:refundPolicy.title')}</h3>
        {policyVersion && <span className="text-xs text-bliss-400">v{policyVersion}</span>}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-bliss-600" />
        </div>
      ) : (
        <>
          {/* Scrollable Terms Box */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-64 overflow-y-auto border border-bliss-300 rounded-lg p-4 bg-bliss-100 text-sm leading-relaxed whitespace-pre-wrap text-bliss-700"
          >
            {displayContent}
          </div>

          {!hasScrolledToBottom && (
            <p className="text-xs text-bliss-600 mt-1 text-center animate-pulse">
              {t('common:refundPolicy.scrollPrompt')}
            </p>
          )}

          {/* Checkbox */}
          <label className={`flex items-start gap-3 mt-3 p-3 rounded-lg border ${isAccepted ? 'border-green-300 bg-green-50' : 'border-bliss-200'} ${!hasScrolledToBottom ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={isAccepted}
              onChange={(e) => handleCheckboxChange(e.target.checked)}
              disabled={!hasScrolledToBottom}
              className="mt-0.5 w-4 h-4 text-bliss-600 focus:ring-bliss-600 rounded"
            />
            <span className="text-sm text-bliss-700">
              {t('common:refundPolicy.acceptanceLabel')}
            </span>
            {isAccepted && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />}
          </label>

          {/* Accept Button (for modal mode) */}
          {!hideAcceptButton && (
            <button
              onClick={handleAccept}
              disabled={!isAccepted || isSaving}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 bg-bliss-600 text-white rounded-lg font-medium hover:bg-bliss-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {t('common:refundPolicy.acceptButton')}
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
  // Derive the user from the app's AuthProvider (localStorage-backed session) instead of a
  // supabase.auth.getUser() NETWORK call. In flaky in-app browsers (e.g. LINE) getUser() could
  // return null / error, and the old `!user`/`catch` branches BOTH set hasAccepted=false → the
  // global ConsentModalGuard nagged an ALREADY-ACCEPTED user on every page. Now: uncertainty →
  // `null` (don't nag), and the check re-runs when the session (user.id) resolves.
  const { user } = useAuth()
  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkConsent = useCallback(async () => {
    // No confirmed user yet → UNKNOWN (null), not "not-accepted". Re-runs when user.id resolves.
    if (!user?.id) {
      setHasAccepted(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('refund_policy_accepted_at, refund_policy_version')
        .eq('id', user.id)
        .single()

      // A transient read error must NOT nag an accepted user → leave UNKNOWN (null), not false.
      if (profileErr) {
        setHasAccepted(null)
        return
      }

      // Genuinely not accepted → show the modal (correct).
      if (!profile?.refund_policy_accepted_at) {
        setHasAccepted(false)
        return
      }

      // Accepted → only re-show when admin bumped the policy version.
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
      setHasAccepted(null) // uncertain → don't nag
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    checkConsent()
  }, [checkConsent])

  return { hasAccepted, isLoading, recheckConsent: checkConsent }
}
