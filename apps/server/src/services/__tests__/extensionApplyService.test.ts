import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Regression tests for the per-recipient extension recalc in applyExtensionToBooking().
 *
 * The bug these lock shut (fixed 2026-07-17): couple-ness was derived from `bookingJobs.length > 1`,
 * but that list is queried with `.not('status','eq','cancelled')` — so a couple with ONE cancelled job
 * collapsed to length 1, `isCouple` flipped false, and the SURVIVING job absorbed BOTH recipients'
 * extension rows (over-credited duration → wrong complete-gate window; overpaid earnings → wrong
 * payout). See [[bliss-couple-recipient-duration-scope]] 1.3.0.
 */

const h = vi.hoisted(() => ({
  jobUpdates: [] as Array<{ id: string; payload: any }>,
  fx: {
    jobs: [] as any[],
    jobsError: null as any,
    bookingServices: [] as any[],
    services: [] as any[],
    servicesError: null as any,
  },
}))

vi.mock('../../lib/supabase.js', () => ({
  getSupabaseClient: () => ({
    from(table: string) {
      const state: any = { table, op: 'select', filters: {}, payload: null }
      const b: any = {
        select: (cols?: string) => { state.cols = cols; return b },
        insert: (payload: any) => { state.op = 'insert'; state.payload = payload; return b },
        update: (payload: any) => { state.op = 'update'; state.payload = payload; return b },
        eq: (col: string, val: any) => { state.filters[col] = val; return b },
        in: (col: string, vals: any[]) => { state.filters[col] = vals; return b },
        not: () => b,
        order: () => b,
        limit: () => b,
        single: () => b,
        maybeSingle: () => b,
        then: (res: any, rej: any) => Promise.resolve(settle(state)).then(res, rej),
      }
      return b
    },
  }),
}))

vi.mock('../notificationService.js', () => ({
  sendExtensionNotifications: vi.fn().mockResolvedValue(undefined),
}))

/**
 * Return ONLY the columns the caller asked for — exactly like PostgREST. This is load-bearing, not
 * cosmetic: the L-1 fix has two halves, the `(job.total_jobs ?? 1) > 1` logic AND `total_jobs` being in
 * the jobs select. Without this projection the fixtures hand back every field regardless of the query,
 * so deleting `, total_jobs` from the select leaves the suite green while `job.total_jobs` is undefined
 * in production -> `?? 1` -> not-a-couple -> the bug is silently back.
 */
function project(rows: any[], cols?: string) {
  if (!cols) return rows
  const keys = cols.split(',').map((c) => c.trim()).filter(Boolean)
  return rows.map((row) => Object.fromEntries(keys.filter((k) => k in row).map((k) => [k, row[k]])))
}

function settle(state: any) {
  const { table, op } = state
  if (table === 'booking_services' && op === 'insert') return { data: { id: 'new-ext-row' }, error: null }
  if (table === 'booking_services' && op === 'select') return { data: project(h.fx.bookingServices, state.cols), error: null }
  if (table === 'jobs' && op === 'select') {
    return h.fx.jobsError ? { data: null, error: h.fx.jobsError } : { data: project(h.fx.jobs, state.cols), error: null }
  }
  if (table === 'services' && op === 'select') {
    return h.fx.servicesError ? { data: null, error: h.fx.servicesError } : { data: project(h.fx.services, state.cols), error: null }
  }
  if (table === 'jobs' && op === 'update') {
    h.jobUpdates.push({ id: state.filters.id, payload: state.payload })
    return { data: null, error: null }
  }
  return { data: null, error: null }
}

const { applyExtensionToBooking } = await import('../extensionApplyService.js')

/**
 * svc1: commission service (30%). GAP2 (DECISION ③) commissions on the RETAIL price for the
 * extension duration — price_60=1000 here — NEVER on the discounted booking_services.price (800
 * below). So a 60-min extension earns 1000*0.3 = 300, not the old net 800*0.3 = 240.
 */
const SVC = { id: 'svc1', use_fixed_rate: false, staff_commission_rate: 0.3, staff_earning_60: 0, staff_earning_90: 0, staff_earning_120: 0, price_60: 1000, price_90: 1500, price_120: 2000, base_price: 2000, duration: 120 }

const base = (recipient_index: number, price: number) => ({
  service_id: 'svc1', duration: 120, price, recipient_index, is_extension: false,
})
const ext = (recipient_index: number) => ({
  service_id: 'svc1', duration: 60, price: 800, recipient_index, is_extension: true,
})

function coupleBooking() {
  return {
    id: 'bk-1',
    booking_date: '2026-07-20',
    booking_time: '10:00:00',
    final_price: 3300,
    extension_count: 1,
    duration: 120,
    customers: { full_name: 'ทดสอบ', profile_id: 'cust-profile' },
    booking_services: [base(0, 1750), base(1, 1550), ext(0)],
    jobs: [
      { id: 'jobA', staff_id: 'staffA', status: 'cancelled', job_index: 1 },
      { id: 'jobB', staff_id: 'staffB', status: 'in_progress', job_index: 2 },
    ],
  }
}

beforeEach(() => {
  h.jobUpdates.length = 0
  h.fx.jobs = []
  h.fx.jobsError = null
  h.fx.bookingServices = []
  h.fx.services = [SVC]
  h.fx.servicesError = null
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('applyExtensionToBooking — couple with ONE cancelled job', () => {
  it('gives the surviving job ONLY its own recipient\'s extension (not both)', async () => {
    // Recipient 0's job is cancelled, so the cancelled-filtered jobs query returns just jobB.
    // total_jobs=2 is what proves this is still a couple.
    h.fx.jobs = [{ id: 'jobB', staff_earnings: 900, duration_minutes: 120, job_index: 2, total_jobs: 2 }]
    // Both recipients have an extension row; only recipient 1's belongs to jobB.
    h.fx.bookingServices = [base(0, 1750), base(1, 1550), ext(0), ext(1)]

    await applyExtensionToBooking({
      booking: coupleBooking(),
      targets: [{ recipientIndex: 1, serviceId: 'svc1', additionalDuration: 60, finalExtensionPrice: 800 }],
    })

    expect(h.jobUpdates).toHaveLength(1)
    const { id, payload } = h.jobUpdates[0]
    expect(id).toBe('jobB')
    // Own extension only: 120 base + 60 = 180, and 900 base + retail(price_60=1000)*0.3 = 300 → 1200.
    expect(payload.total_duration_minutes).toBe(180)
    expect(payload.total_staff_earnings).toBe(1200)
    // GAP2: earned on RETAIL (300), never the discounted net price (800*0.3=240 → would be 1140).
    expect(payload.total_staff_earnings).not.toBe(1140)
    // The pre-fix couple values, spelled out so a regression is unmistakable: jobB absorbed BOTH extensions.
    expect(payload.total_duration_minutes).not.toBe(240)
    expect(payload.total_staff_earnings).not.toBe(1500)
  })
})

describe('applyExtensionToBooking — no regression for the normal shapes', () => {
  it('single booking (total_jobs=1) still takes all of its own extensions', async () => {
    h.fx.jobs = [{ id: 'jobS', staff_earnings: 400, duration_minutes: 60, job_index: 1, total_jobs: 1 }]
    h.fx.bookingServices = [base(0, 800), ext(0)]

    await applyExtensionToBooking({
      booking: {
        ...coupleBooking(),
        booking_services: [base(0, 800)],
        jobs: [{ id: 'jobS', staff_id: 'staffS', status: 'in_progress', job_index: 1 }],
      },
      targets: [{ recipientIndex: 0, serviceId: 'svc1', additionalDuration: 60, finalExtensionPrice: 800 }],
    })

    expect(h.jobUpdates).toHaveLength(1)
    expect(h.jobUpdates[0].payload.total_duration_minutes).toBe(120) // 60 + 60
    expect(h.jobUpdates[0].payload.total_staff_earnings).toBe(700) // 400 + retail 300 (not net 240)
  })

  it('healthy couple (both jobs alive) keeps each recipient on its own extension', async () => {
    h.fx.jobs = [
      { id: 'jobA', staff_earnings: 900, duration_minutes: 120, job_index: 1, total_jobs: 2 },
      { id: 'jobB', staff_earnings: 900, duration_minutes: 120, job_index: 2, total_jobs: 2 },
    ]
    h.fx.bookingServices = [base(0, 1750), base(1, 1550), ext(0), ext(1)]

    await applyExtensionToBooking({
      booking: coupleBooking(),
      targets: [{ recipientIndex: 1, serviceId: 'svc1', additionalDuration: 60, finalExtensionPrice: 800 }],
    })

    expect(h.jobUpdates).toHaveLength(2)
    for (const u of h.jobUpdates) {
      expect(u.payload.total_duration_minutes).toBe(180)
      expect(u.payload.total_staff_earnings).toBe(1200) // 900 + retail 300
    }
  })
})

describe('applyExtensionToBooking — never invents an earnings number', () => {
  it('a FAILED services read aborts the recalc instead of guessing (no job write at all)', async () => {
    h.fx.jobs = [{ id: 'jobB', staff_earnings: 900, duration_minutes: 120, job_index: 2, total_jobs: 2 }]
    h.fx.bookingServices = [base(0, 1750), base(1, 1550), ext(1)]
    h.fx.services = []
    h.fx.servicesError = { message: 'network blip' } // the read FAILED — the service still exists

    await expect(applyExtensionToBooking({
      booking: coupleBooking(),
      targets: [{ recipientIndex: 1, serviceId: 'svc1', additionalDuration: 60, finalExtensionPrice: 800 }],
    })).resolves.toBeDefined() // non-blocking: the extension itself still succeeded

    // Pre-fix this wrote total_staff_earnings = 900 + 800 (100% of the customer's money) off a blip.
    expect(h.jobUpdates).toHaveLength(0)
    expect(console.error).toHaveBeenCalled()
  })

  it('a FAILED jobs read aborts instead of silently skipping the recalc', async () => {
    // Pre-fix this was the quietest failure of all: the error was destructured away, `bookingJobs`
    // came back null, the `if` was skipped, and NOTHING was logged — jobs kept stale totals forever
    // while the route reported success.
    h.fx.jobs = []
    h.fx.jobsError = { message: 'connection reset' }
    h.fx.bookingServices = [base(0, 1750), base(1, 1550), ext(1)]

    await expect(applyExtensionToBooking({
      booking: coupleBooking(),
      targets: [{ recipientIndex: 1, serviceId: 'svc1', additionalDuration: 60, finalExtensionPrice: 800 }],
    })).resolves.toBeDefined()

    expect(h.jobUpdates).toHaveLength(0)
    expect(console.error).toHaveBeenCalled()
  })

  it('an unresolvable service writes the duration but LEAVES total_staff_earnings alone', async () => {
    h.fx.jobs = [{ id: 'jobB', staff_earnings: 900, duration_minutes: 120, job_index: 2, total_jobs: 2 }]
    // Recipient 1 has an extension but no base row and no matching service row → svc unresolvable.
    h.fx.bookingServices = [base(0, 1750), ext(1)]
    h.fx.services = [] // read SUCCEEDED and genuinely returned nothing

    await applyExtensionToBooking({
      booking: coupleBooking(),
      targets: [{ recipientIndex: 1, serviceId: 'svc-gone', additionalDuration: 60, finalExtensionPrice: 800 }],
    })

    expect(h.jobUpdates).toHaveLength(1)
    const { payload } = h.jobUpdates[0]
    expect(payload.total_duration_minutes).toBe(180) // duration needs no service config
    expect(payload).not.toHaveProperty('total_staff_earnings') // never guessed
    expect(console.error).toHaveBeenCalled()
  })
})
