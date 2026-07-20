/**
 * P16 — Admin assign / change the staff on a single job.
 *
 * Renders the whole staff pool scored by the server (GET /api/jobs/:jobId/eligible-staff) — the picker
 * NEVER decides eligibility itself. Every staff is shown (D-P16 #7): eligible staff are one-tap; staff
 * with a HARD block (time / serving / gender / couple) are greyed and cannot be picked; staff with only
 * a SOFT block (KYC / not-available) can be picked but require the admin to type "ยืนยัน" first
 * (D-P16 #2/#3). The assign itself is POST /api/jobs/:jobId/assign-staff, re-checked server-side.
 */

import { useState, useEffect, useCallback } from 'react'
import { X, Check, AlertTriangle, Ban, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// Server base — prefer VITE_SERVER_URL, fall back to VITE_API_URL (strip a trailing /api), then the
// prod/localhost default. Matches the other admin server calls in this app.
const SERVER_BASE = (
  import.meta.env.VITE_SERVER_URL ||
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')
).replace(/\/api\/?$/, '')

export interface StaffEligibility {
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

interface Props {
  jobId: string
  isOpen: boolean
  onClose: () => void
  /** Called after a successful assign — parent should refetch bookings + close the detail modal. */
  onAssigned: () => void
  /** e.g. "คนที่ 1" for a couple recipient; omitted for a single booking. */
  recipientLabel?: string
  /** current staff name, if reassigning */
  currentStaffName?: string | null
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = (await supabase.auth.getSession()).data.session?.access_token
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

function genderLabel(g: string | null): string {
  if (g === 'female') return 'หญิง'
  if (g === 'male') return 'ชาย'
  return 'ไม่ระบุ'
}

export default function AssignStaffModal({ jobId, isOpen, onClose, onAssigned, recipientLabel, currentStaffName }: Props) {
  const [loading, setLoading] = useState(false)
  const [staff, setStaff] = useState<StaffEligibility[]>([])
  const [jobAssignable, setJobAssignable] = useState(true)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [overrideFor, setOverrideFor] = useState<StaffEligibility | null>(null)
  const [confirmText, setConfirmText] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${SERVER_BASE}/api/jobs/${jobId}/eligible-staff`, { headers: await authHeaders() })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || 'โหลดรายชื่อพนักงานไม่สำเร็จ')
        setStaff([])
        return
      }
      setStaff(data.staff || [])
      setJobAssignable(data.job?.assignable !== false)
    } catch (e: any) {
      toast.error(e?.message || 'โหลดรายชื่อพนักงานไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    if (isOpen) {
      setOverrideFor(null)
      setConfirmText('')
      load()
    }
  }, [isOpen, load])

  const doAssign = async (s: StaffEligibility, override: boolean) => {
    setAssigningId(s.profileId)
    try {
      const res = await fetch(`${SERVER_BASE}/api/jobs/${jobId}/assign-staff`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ staffProfileId: s.profileId, override }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`มอบหมายงานให้ ${s.name} เรียบร้อยแล้ว`)
        onAssigned()
        return
      }
      if (data.code === 'CONCURRENT_CHANGE') {
        toast.error('งานนี้เพิ่งถูกเปลี่ยน กรุณาลองใหม่')
        load()
      } else if (data.code === 'JOB_LOCKED') {
        toast.error(data.error || 'งานนี้เปลี่ยนพนักงานไม่ได้แล้ว')
        onAssigned()
      } else {
        toast.error(data.error || 'มอบหมายพนักงานไม่สำเร็จ')
        // reasons may have changed under us → refresh the pool
        load()
      }
    } catch (e: any) {
      toast.error(e?.message || 'มอบหมายพนักงานไม่สำเร็จ')
    } finally {
      setAssigningId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-bliss-100">
          <div>
            <h3 className="font-semibold text-bliss-900">
              {currentStaffName ? 'เปลี่ยนพนักงาน' : 'มอบหมายพนักงาน'}
              {recipientLabel ? ` — ${recipientLabel}` : ''}
            </h3>
            {currentStaffName && (
              <p className="text-xs text-bliss-500 mt-0.5">ปัจจุบัน: {currentStaffName}</p>
            )}
          </div>
          <button onClick={onClose} className="text-bliss-400 hover:text-bliss-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!jobAssignable && (
            <div className="flex items-start gap-2 bg-amber-50 text-amber-800 text-sm rounded-lg px-3 py-2 mb-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>งานนี้เริ่มดำเนินการหรือเสร็จสิ้นแล้ว ไม่สามารถเปลี่ยนพนักงานได้</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10 text-bliss-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> กำลังโหลดรายชื่อพนักงาน...
            </div>
          ) : staff.length === 0 ? (
            <p className="text-center text-bliss-400 py-10 text-sm">ไม่พบพนักงานในระบบ</p>
          ) : (
            <div className="space-y-2">
              {staff.map((s) => {
                const isOverrideTarget = overrideFor?.profileId === s.profileId
                const busy = assigningId === s.profileId
                const canPickDirectly = jobAssignable && s.eligible
                const canOverride = jobAssignable && s.assignable && s.requiresOverride
                const blocked = !s.assignable

                return (
                  <div
                    key={s.profileId}
                    className={`rounded-xl border px-3 py-2.5 ${
                      blocked
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
                        </p>
                        {/* Reasons */}
                        {s.hardBlocks.length > 0 && (
                          <p className="text-xs text-red-600 mt-0.5 flex items-start gap-1">
                            <Ban className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>{s.hardBlocks.join(' · ')}</span>
                          </p>
                        )}
                        {s.softBlocks.length > 0 && (
                          <p className="text-xs text-amber-700 mt-0.5 flex items-start gap-1">
                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>{s.softBlocks.join(' · ')}</span>
                          </p>
                        )}
                      </div>

                      {/* Action */}
                      <div className="shrink-0">
                        {canPickDirectly && (
                          <button
                            disabled={busy}
                            onClick={() => doAssign(s, false)}
                            className="inline-flex items-center gap-1 bg-bliss-600 hover:bg-bliss-700 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg"
                          >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            มอบหมาย
                          </button>
                        )}
                        {canOverride && !isOverrideTarget && (
                          <button
                            onClick={() => { setOverrideFor(s); setConfirmText('') }}
                            className="inline-flex items-center gap-1 border border-amber-400 text-amber-700 hover:bg-amber-100 text-sm px-3 py-1.5 rounded-lg"
                          >
                            มอบหมาย (ต้องยืนยัน)
                          </button>
                        )}
                        {blocked && (
                          <span className="text-xs text-bliss-400">เลือกไม่ได้</span>
                        )}
                      </div>
                    </div>

                    {/* Type-to-confirm override panel (D-P16 #2 — KYC/not-available may be overridden) */}
                    {isOverrideTarget && (
                      <div className="mt-2 border-t border-amber-200 pt-2">
                        <p className="text-xs text-amber-800 mb-1">
                          พนักงานคนนี้ติดเงื่อนไขที่ข้ามได้ พิมพ์คำว่า <b>ยืนยัน</b> เพื่อมอบหมายทั้งที่ติดเงื่อนไข
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
                            disabled={confirmText.trim() !== 'ยืนยัน' || busy}
                            onClick={() => doAssign(s, true)}
                            className="inline-flex items-center gap-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-sm px-3 py-1.5 rounded-lg"
                          >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            ยืนยันมอบหมาย
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
          )}
        </div>
      </div>
    </div>
  )
}
