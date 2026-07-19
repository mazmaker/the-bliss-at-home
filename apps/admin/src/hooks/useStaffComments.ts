import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// ============================================
// Types
// ============================================

export interface StaffComment {
  id: string
  job_id: string
  staff_id: string
  comment: string
  created_at: string
  updated_at: string
  // Job context (denormalised on the jobs row + booking code)
  service_name: string | null
  customer_name: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  booking_number: string | null
  // Only populated on the combined (all-staff) page
  staff_name?: string | null
}

// Nested embed: comment -> jobs (display fields) -> bookings (booking code)
export const STAFF_COMMENT_JOB_SELECT = `
  jobs (
    service_name,
    customer_name,
    scheduled_date,
    scheduled_time,
    bookings ( booking_number )
  )
`

export function mapStaffComment(row: any): StaffComment {
  const j = row.jobs || null
  return {
    id: row.id,
    job_id: row.job_id,
    staff_id: row.staff_id,
    comment: row.comment,
    created_at: row.created_at,
    updated_at: row.updated_at,
    service_name: j?.service_name ?? null,
    customer_name: j?.customer_name ?? null,
    scheduled_date: j?.scheduled_date ?? null,
    scheduled_time: j?.scheduled_time ?? null,
    booking_number: j?.bookings?.booking_number ?? null,
  }
}

// ============================================
// Hooks
// ============================================

/**
 * All comments a specific staff member wrote (per-staff admin tab).
 * IMPORTANT: filter by profiles.id (staff.profile_id) — job_staff_comments.staff_id => profiles.id,
 * NOT staff.id (that is the staff-table PK the reviews query uses).
 */
export function useStaffComments(staffProfileId: string | undefined) {
  return useQuery({
    queryKey: ['staff-comments', staffProfileId],
    queryFn: async (): Promise<StaffComment[]> => {
      const { data, error } = await supabase
        .from('job_staff_comments')
        .select(`id, job_id, staff_id, comment, created_at, updated_at, ${STAFF_COMMENT_JOB_SELECT}`)
        .eq('staff_id', staffProfileId as string)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching staff comments:', error)
        throw error
      }
      return (data || []).map(mapStaffComment)
    },
    enabled: !!staffProfileId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Admin deletes any comment by id (allowed by the admin DELETE RLS policy).
 * Admins can only view + delete — never create/edit — so there is no upsert here.
 */
export function useDeleteStaffComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('job_staff_comments')
        .delete()
        .eq('id', commentId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-comments'] })
      queryClient.invalidateQueries({ queryKey: ['admin-staff-comments'] })
    },
  })
}

/**
 * ALL staff comments across everyone (combined admin page).
 * Embeds the commenting staff's name via the staff_id -> profiles FK.
 */
export function useAdminStaffComments() {
  return useQuery({
    queryKey: ['admin-staff-comments'],
    queryFn: async (): Promise<StaffComment[]> => {
      const { data, error } = await supabase
        .from('job_staff_comments')
        .select(
          `id, job_id, staff_id, comment, created_at, updated_at, staff:staff_id ( full_name ), ${STAFF_COMMENT_JOB_SELECT}`
        )
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching all staff comments:', error)
        throw error
      }
      return (data || []).map((row: any) => ({
        ...mapStaffComment(row),
        staff_name: row.staff?.full_name ?? null,
      }))
    },
    staleTime: 1000 * 60 * 5,
  })
}
