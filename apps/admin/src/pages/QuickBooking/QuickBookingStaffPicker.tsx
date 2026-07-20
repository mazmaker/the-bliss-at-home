/**
 * P16 — QuickBooking staff picker (choose the staff up front instead of broadcasting).
 *
 * The job does not exist yet at this point, so eligibility comes from GET /api/jobs/eligible-staff-preview
 * (scored against the booking's date/time/duration/gender). This mirrors the booking-detail AssignStaffModal
 * (Part 1) UI: EVERY staff is shown (D-P16 #7) — eligible staff are one-tap, staff with a HARD block
 * (time / serving / gender / couple) are greyed and cannot be picked, and staff with only a SOFT block
 * (KYC / not-available) can be picked but require the admin to type "ยืนยัน" first (D-P16 #2/#3). The
 * chosen staff (and whether it was an override) is threaded to BookingConfirmation, which sends it as
 * `preassignStaff` on confirm — the server re-checks and (for override) applies it via assignStaffToJob.
 * For a couple booking there is one list per recipient and a staff already picked for one recipient is
 * excluded from the others. Selection is all-or-none: the parent blocks confirm on a partial pick.
 */

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Check, AlertTriangle, Ban } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const SERVER_BASE = (
  import.meta.env.VITE_SERVER_URL ||
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')
).replace(/\/api\/?$/, '')

interface StaffEligibility {
  profileId: string
  staffId: string
  name: string
  gender: string | null
  isAvailable: boolean
  eligible: boolean
  assignable: boolean
  requiresOverride: boolean
  hardBlocks: string[]
  softBlocks: string[]
}

export interface PickerRecipient {
  recipientIndex: number
  label: string
  durationMinutes: number
}

/** What a recipient's pick carries: the chosen staff + whether it needed a soft-block override. */
export interface StaffSelection {
  profileId: string
  override: boolean
}

interface Props {
  date?: string
  time?: string
  providerPreference?: string
  recipients: PickerRecipient[]
  /** recipientIndex → chosen staff (+ override flag) */
  value: Record<number, StaffSelection>
  onChange: (recipientIndex: number, sel: StaffSelection | null) => void
}

function genderLabel(g: string | null): string {
  if (g === 'female') return 'หญิง'
  if (g === 'male') return 'ชาย'
  return 'ไม่ระบุ'
}

export default function QuickBookingStaffPicker({ date, time, providerPreference, recipients, value, onChange }: Props) {
  const [loading, setLoading] = useState(false)
  const [staff, setStaff] = useState<StaffEligibility[]>([])
  const [err, setErr] = useState('')
  // The (recipient, staff) currently typing-to-confirm a soft-block override.
  const [overrideFor, setOverrideFor] = useState<{ ri: number; profileId: string } | null>(null)
  const [confirmText, setConfirmText] = useState('')

  const maxDuration = recipients.reduce((m, r) => Math.max(m, r.durationMinutes || 0), 0) || 0

  const load = useCallback(async () => {
    if (!date || !time) return
    setLoading(true)
    setErr('')
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const qs = new URLSearchParams({ date, time, pref: providerPreference || 'no-preference' })
      if (maxDuration) qs.set('duration', String(maxDuration))
      const res = await fetch(`${SERVER_BASE}/api/jobs/eligible-staff-preview?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setErr(data.error || 'โหลดรายชื่อพนักงานไม่สำเร็จ')
        setStaff([])
        return
      }
      // Show EVERYONE (like AssignStaffModal) — the row rendering greys hard blocks and offers a
      // type-confirm for soft blocks; we no longer pre-filter to only-eligible staff.
      setStaff(data.staff || [])
    } catch (e: any) {
      setErr(e?.message || 'โหลดรายชื่อพนักงานไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [date, time, providerPreference, maxDuration])

  useEffect(() => {
    load()
  }, [load])

  // Reset any open type-confirm panel whenever the pool reloads (date/time/pref change).
  useEffect(() => {
    setOverrideFor(null)
    setConfirmText('')
  }, [staff])

  const pickedElsewhere = (recipientIndex: number) =>
    new Set(
      Object.entries(value)
        .filter(([k, v]) => Number(k) !== recipientIndex && v?.profileId)
        .map(([, v]) => v.profileId)
    )

  return (
    <div className="bg-bliss-50 rounded-xl p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-bliss-900">เลือกพนักงาน (ไม่บังคับ)</h3>
        <p className="text-xs text-bliss-500 mt-0.5">
          เว้นว่างทั้งหมด = ประกาศให้พนักงานที่ว่างรับงานตามปกติ · ถ้าเลือก ต้องเลือกให้ครบทุกคน ·
          คนที่ติดเงื่อนไขที่ข้ามได้ ต้องพิมพ์ "ยืนยัน" ก่อน
        </p>
      </div>

      {loading ? (
        <div className="flex items-center text-bliss-500 text-sm py-2">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> กำลังโหลดรายชื่อพนักงาน...
        </div>
      ) : err ? (
        <p className="text-red-600 text-sm">{err}</p>
      ) : staff.length === 0 ? (
        <p className="text-amber-600 text-xs">ไม่มีพนักงานในระบบสำหรับช่วงเวลานี้ — ระบบจะประกาศหาคนรับตามปกติ</p>
      ) : (
        <div className="space-y-4">
          {recipients.map((r) => {
            const taken = pickedElsewhere(r.recipientIndex)
            const sel = value[r.recipientIndex]
            return (
              <div key={r.recipientIndex}>
                {recipients.length > 1 && (
                  <p className="text-sm font-medium text-bliss-700 mb-1.5">{r.label}</p>
                )}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {staff.map((s) => {
                    const takenElsewhere = taken.has(s.profileId)
                    const isSelected = sel?.profileId === s.profileId
                    // A staff picked for the OTHER recipient can't be picked here (couple).
                    const canPick = s.eligible && !takenElsewhere
                    const canOverride = s.assignable && s.requiresOverride && !takenElsewhere
                    const blocked = (!s.assignable || takenElsewhere) && !isSelected
                    const isOverrideTarget =
                      overrideFor?.ri === r.recipientIndex && overrideFor?.profileId === s.profileId

                    return (
                      <div
                        key={s.profileId}
                        className={`rounded-xl border px-3 py-2.5 ${
                          isSelected
                            ? 'border-bliss-500 bg-bliss-100'
                            : blocked
                            ? 'border-bliss-100 bg-bliss-50/50 opacity-70'
                            : s.eligible
                            ? 'border-green-200 bg-white'
                            : 'border-amber-200 bg-amber-50/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-bliss-900 truncate">
                              {s.name}
                              <span className="ml-2 text-xs font-normal text-bliss-400">({genderLabel(s.gender)})</span>
                              {sel?.profileId === s.profileId && sel.override && (
                                <span className="ml-2 text-xs font-normal text-amber-600">(ข้ามเงื่อนไข)</span>
                              )}
                            </p>
                            {takenElsewhere && (
                              <p className="text-xs text-bliss-400 mt-0.5">เลือกให้ผู้รับอีกคนแล้ว</p>
                            )}
                            {!takenElsewhere && s.hardBlocks.length > 0 && (
                              <p className="text-xs text-red-600 mt-0.5 flex items-start gap-1">
                                <Ban className="w-3 h-3 mt-0.5 shrink-0" />
                                <span>{s.hardBlocks.join(' · ')}</span>
                              </p>
                            )}
                            {!takenElsewhere && s.softBlocks.length > 0 && (
                              <p className="text-xs text-amber-700 mt-0.5 flex items-start gap-1">
                                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                <span>{s.softBlocks.join(' · ')}</span>
                              </p>
                            )}
                          </div>

                          <div className="shrink-0">
                            {isSelected ? (
                              <button
                                onClick={() => onChange(r.recipientIndex, null)}
                                className="inline-flex items-center gap-1 border border-bliss-300 text-bliss-600 hover:bg-bliss-50 text-sm px-3 py-1.5 rounded-lg"
                              >
                                <Check className="w-4 h-4" /> เลือกแล้ว
                              </button>
                            ) : canPick ? (
                              <button
                                onClick={() => onChange(r.recipientIndex, { profileId: s.profileId, override: false })}
                                className="inline-flex items-center gap-1 bg-bliss-600 hover:bg-bliss-700 text-white text-sm px-3 py-1.5 rounded-lg"
                              >
                                เลือก
                              </button>
                            ) : canOverride && !isOverrideTarget ? (
                              <button
                                onClick={() => { setOverrideFor({ ri: r.recipientIndex, profileId: s.profileId }); setConfirmText('') }}
                                className="inline-flex items-center gap-1 border border-amber-400 text-amber-700 hover:bg-amber-100 text-sm px-3 py-1.5 rounded-lg"
                              >
                                เลือก (ต้องยืนยัน)
                              </button>
                            ) : blocked && !takenElsewhere ? (
                              <span className="text-xs text-bliss-400">เลือกไม่ได้</span>
                            ) : null}
                          </div>
                        </div>

                        {/* Type-to-confirm override panel (D-P16 #2 — KYC/not-available may be overridden) */}
                        {isOverrideTarget && (
                          <div className="mt-2 border-t border-amber-200 pt-2">
                            <p className="text-xs text-amber-800 mb-1">
                              พนักงานคนนี้ติดเงื่อนไขที่ข้ามได้ พิมพ์คำว่า <b>ยืนยัน</b> เพื่อเลือกทั้งที่ติดเงื่อนไข
                            </p>
                            <div className="flex items-center gap-2">
                              <input
                                autoFocus
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="พิมพ์ ยืนยัน"
                                className="flex-1 border border-amber-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                              />
                              <button
                                disabled={confirmText.trim() !== 'ยืนยัน'}
                                onClick={() => {
                                  onChange(r.recipientIndex, { profileId: s.profileId, override: true })
                                  setOverrideFor(null)
                                  setConfirmText('')
                                }}
                                className="inline-flex items-center gap-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-sm px-3 py-1.5 rounded-lg"
                              >
                                <Check className="w-4 h-4" /> ยืนยันเลือก
                              </button>
                              <button
                                onClick={() => { setOverrideFor(null); setConfirmText('') }}
                                className="text-xs text-bliss-500 px-2 py-1"
                              >
                                ยกเลิก
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
